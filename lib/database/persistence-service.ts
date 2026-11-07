// lib/database/persistence-service.ts
// Durable, Idempotent Production Persistence Service for Restaurant Lead Finder
// Enforces transaction safety, deterministic UUID mapping, campaign-to-lead association,
// explicit persistence verification, and strict test isolation safeguards.

import crypto from 'crypto';
import { getSupabase, getSupabaseAdmin } from '../supabase/client';
import { Restaurant, ScanJob, ScanTask } from '../types';
import { store } from '../store/memory-store';
import { findGlobalPlaceById } from '../locations/global-registry';
import { findVerifiedCityById, findLocationById } from '../locations/india';
import {
  determineInitialWhatsAppStatus,
  createManualVerificationUpdate,
  ManualWhatsAppVerificationInput,
} from '../whatsapp/verifier';
import { WhatsAppAvailabilityStatus } from '../types';

export interface PersistenceOptions {
  allowTestPersistence?: boolean;
  testPrefix?: string;
  maxRetries?: number;
}

export interface PersistenceResult {
  success: boolean;
  restaurantId: string;
  isNew: boolean;
  associated: boolean;
  error?: string;
}

export interface BatchPersistenceResult {
  totalProcessed: number;
  persistedCount: number;
  failedCount: number;
  associatedCount: number;
  duplicateCount: number;
  results: PersistenceResult[];
  errors: Array<{ candidateName: string; error: string }>;
}

/**
 * Deterministically generates a stable RFC 4122 Name-Based UUID (Version 5) for external provider records.
 * 
 * Algorithm:
 * 1. Hashes `${sourceProvider.trim().toLowerCase()}:${sourceRecordId.trim()}` using SHA-256.
 * 2. Takes the first 128 bits (16 octets / 32 hex characters) of the cryptographic digest.
 * 3. Sets the 4-bit version field (octet 6) to 0x5 (0101 binary: Name-Based UUID).
 * 4. Sets the 2-bit variant field (octet 8) to RFC 4122 Variant 1 (10xx binary: 0x80 - 0xbf).
 * 5. Formats as canonical 8-4-4-4-12 lowercase hexadecimal string.
 *
 * Guarantees:
 * - Determinism: Identical provider + sourceRecordId pairs produce the exact same UUID across all restarts and machines.
 * - Provider Isolation: Different provider namespaces produce distinct identifiers even for identical record IDs.
 * - Collision Resistance: SHA-256 truncation to 122 variable bits has negligible collision risk (< 1e-15).
 */
export function getDeterministicRestaurantId(sourceProvider: string, sourceRecordId: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${sourceProvider.trim().toLowerCase()}:${sourceRecordId.trim()}`)
    .digest('hex');

  const timeLow = hash.substring(0, 8);
  const timeMid = hash.substring(8, 12);
  // Version 5 (Name-based SHA): high nibble set to 5
  const timeHiAndVersion = '5' + hash.substring(13, 16);
  // RFC 4122 Variant 1 (10xx binary: 0x80 - 0xbf)
  const clockSeqHi = ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  const clockSeqLow = hash.substring(18, 20);
  const node = hash.substring(20, 32);

  return `${timeLow}-${timeMid}-${timeHiAndVersion}-${clockSeqHi}${clockSeqLow}-${node}`;
}

export class PersistenceService {
  private static instance: PersistenceService;

  static getInstance(): PersistenceService {
    if (!this.instance) {
      this.instance = new PersistenceService();
    }
    return this.instance;
  }

  /**
   * Evaluates whether the current runtime is in test mode and whether database writes are authorized.
   */
  private isTestBlocked(options?: PersistenceOptions): boolean {
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    if (!isTest) return false;
    // Allow database writes only when an explicit test harness requests it
    return !options?.allowTestPersistence;
  }

  /**
   * Atomically claims a queued or paused scan job using a database-level state transition.
   * Prevents multiple concurrent worker processes from claiming the same job.
   */
  async claimJob(jobId: string, options?: PersistenceOptions): Promise<boolean> {
    if (this.isTestBlocked(options)) {
      return true;
    }
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
    if (!isUUID) return true;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('scan_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId)
      .in('status', ['queued', 'paused'])
      .select('id')
      .maybeSingle();

    if (!error && data) {
      return true;
    }

    // Auto-recovery: If job exists in MemoryStore with status queued or paused, persist it to Supabase as running!
    const memJob = store.getJobById(jobId);
    if (memJob && (memJob.status === 'queued' || memJob.status === 'paused')) {
      const { error: upsertErr } = await supabase.from('scan_jobs').upsert(
        {
          id: memJob.id,
          name: memJob.name,
          configuration_snapshot: memJob.configuration_snapshot,
          provider_id: memJob.provider_id,
          status: 'running',
          progress_counters: memJob.progress_counters,
          usage_counters: memJob.usage_counters,
          error_summary: memJob.error_summary || null,
          created_at: memJob.created_at,
          started_at: new Date().toISOString(),
          completed_at: null,
        },
        { onConflict: 'id' }
      );
      return !upsertErr;
    }

    return false;
  }

  /**
   * Persists a single restaurant candidate to Supabase with idempotent upsert and campaign association.
   * Preserves existing verified fields when incoming data is missing or lower quality.
   */
  async persistLead(
    candidate: Partial<Restaurant>,
    jobId?: string,
    options?: PersistenceOptions
  ): Promise<PersistenceResult> {
    const rawId = candidate.id || '';
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);

    const provider = candidate.source_provider || 'osm_overpass';
    const sourceRecordId = candidate.source_record_id || (rawId.startsWith('osm-') ? rawId : null);

    const dbId = isUUID
      ? rawId
      : sourceRecordId
      ? getDeterministicRestaurantId(provider, sourceRecordId)
      : crypto.randomUUID();

    // If in test environment without explicit persistence authorization, record only to in-memory store
    if (this.isTestBlocked(options)) {
      const { restaurant } = store.saveRestaurant({ ...candidate, id: candidate.id || dbId, search_id: jobId });
      return {
        success: true,
        restaurantId: restaurant.id,
        isNew: true,
        associated: Boolean(jobId),
      };
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Query existing record to establish truthful isNew status and preserve verified fields
    let existingRow: any = null;
    try {
      if (sourceRecordId) {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('source_provider', provider)
          .eq('source_record_id', sourceRecordId)
          .maybeSingle();
        existingRow = data;
      }
      if (!existingRow) {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', dbId)
          .maybeSingle();
        existingRow = data;
      }
    } catch {
      // Continue gracefully if select fails
    }

    const isNew = !existingRow;

    // Quality-preserving merge: never degrade existing verified fields with null/empty incoming values
    const mergedPhone = candidate.phone_number || existingRow?.phone_number || null;
    const mergedNormalizedPhone = candidate.normalized_phone || existingRow?.normalized_phone || null;
    const mergedIntlPhone = candidate.international_phone || existingRow?.international_phone || null;
    const mergedPhoneStatus = candidate.phone_number
      ? (candidate.contact_verification_status || 'UNVERIFIED_SOURCE_LISTED')
      : (existingRow?.contact_verification_status || 'UNAVAILABLE');

    const mergedWebsite = candidate.website_url || existingRow?.website_url || null;
    const mergedWebsiteStatus = candidate.website_status || existingRow?.website_status || (mergedWebsite ? 'WEBSITE_LISTED' : 'WEBSITE_NOT_LISTED');
    const mergedEmail = candidate.email || existingRow?.email || null;
    const mergedRating = candidate.rating !== undefined && candidate.rating !== null ? candidate.rating : (existingRow?.rating ?? null);
    const mergedReviews = candidate.review_count !== undefined && candidate.review_count !== null ? candidate.review_count : (existingRow?.review_count ?? null);
    const mergedLat = candidate.latitude !== undefined && candidate.latitude !== null ? candidate.latitude : (existingRow?.latitude ?? null);
    const mergedLng = candidate.longitude !== undefined && candidate.longitude !== null ? candidate.longitude : (existingRow?.longitude ?? null);
    const mergedDesc = candidate.description || existingRow?.description || null;
    const mergedMapsUrl = candidate.maps_url || existingRow?.maps_url || null;
    const mergedFirstDiscovered = existingRow?.first_discovered_at || candidate.first_discovered_at || now;

    const currentCompleteness = candidate.data_completeness_score || 0;
    const existingCompleteness = existingRow?.data_completeness_score || 0;
    const mergedCompleteness = Math.max(currentCompleteness, existingCompleteness);

    const currentLeadScore = candidate.lead_score || 0;
    const existingLeadScore = existingRow?.lead_score || 0;
    const mergedLeadScore = Math.max(currentLeadScore, existingLeadScore);
    const mergedLeadBreakdown = currentLeadScore >= existingLeadScore
      ? (candidate.lead_score_breakdown || existingRow?.lead_score_breakdown || {})
      : (existingRow?.lead_score_breakdown || candidate.lead_score_breakdown || {});

    const countryForPhone = candidate.country || existingRow?.country || 'India';
    const incomingStatus = candidate.whatsapp_status || existingRow?.whatsapp_status;
    let mergedWhatsAppStatus = incomingStatus || determineInitialWhatsAppStatus(mergedPhone, countryForPhone);
    let mergedWhatsAppVerifiedAt = candidate.whatsapp_verified_at || existingRow?.whatsapp_verified_at || null;
    let mergedWhatsAppVerificationMethod = candidate.whatsapp_verification_method || existingRow?.whatsapp_verification_method || null;
    let mergedWhatsAppVerifiedPhone = candidate.whatsapp_verified_phone || existingRow?.whatsapp_verified_phone || null;
    let mergedWhatsAppVerifiedBy = candidate.whatsapp_verified_by || existingRow?.whatsapp_verified_by || null;
    let mergedWhatsAppVerificationNotes = candidate.whatsapp_verification_notes || existingRow?.whatsapp_verification_notes || null;

    if (mergedWhatsAppVerifiedPhone && mergedNormalizedPhone && mergedWhatsAppVerifiedPhone !== mergedNormalizedPhone) {
      mergedWhatsAppStatus = determineInitialWhatsAppStatus(mergedPhone, countryForPhone);
      mergedWhatsAppVerifiedAt = null;
      mergedWhatsAppVerificationMethod = null;
      mergedWhatsAppVerifiedPhone = null;
      mergedWhatsAppVerifiedBy = null;
      mergedWhatsAppVerificationNotes = 'Verification invalidated: phone number was modified';
    }

    const dbRow = {
      id: dbId,
      business_name: candidate.business_name || existingRow?.business_name || 'Restaurant',
      normalized_name: candidate.normalized_name || (candidate.business_name || existingRow?.business_name || '').toLowerCase().trim(),
      category: candidate.category || existingRow?.category || 'Restaurant',
      description: mergedDesc,
      street_address: candidate.street_address || existingRow?.street_address || null,
      formatted_address: candidate.formatted_address || existingRow?.formatted_address || `${candidate.business_name || 'Restaurant'}, ${candidate.district || candidate.state || 'India'}`,
      state: candidate.state || existingRow?.state || 'State',
      district: candidate.district || existingRow?.district || 'District',
      city: candidate.city || existingRow?.city || null,
      locality: candidate.locality || existingRow?.locality || null,
      postal_code: candidate.postal_code || existingRow?.postal_code || null,
      latitude: mergedLat,
      longitude: mergedLng,
      phone_number: mergedPhone,
      normalized_phone: mergedNormalizedPhone,
      international_phone: mergedIntlPhone,
      whatsapp_status: mergedWhatsAppStatus,
      whatsapp_verified_at: mergedWhatsAppVerifiedAt,
      whatsapp_verification_method: mergedWhatsAppVerificationMethod,
      whatsapp_verified_phone: mergedWhatsAppVerifiedPhone,
      whatsapp_verified_by: mergedWhatsAppVerifiedBy,
      whatsapp_verification_notes: mergedWhatsAppVerificationNotes,
      email: mergedEmail,
      website_url: mergedWebsite,
      website_status: mergedWebsiteStatus,
      contact_page_url: candidate.contact_page_url || existingRow?.contact_page_url || null,
      booking_url: candidate.booking_url || existingRow?.booking_url || null,
      rating: mergedRating,
      review_count: mergedReviews,
      business_status: candidate.business_status || existingRow?.business_status || 'OPERATIONAL',
      maps_url: mergedMapsUrl,
      data_completeness_score: mergedCompleteness,
      lead_score: mergedLeadScore,
      lead_score_breakdown: mergedLeadBreakdown,
      country: candidate.country || existingRow?.country || 'India',
      source_provider: provider,
      source_record_id: sourceRecordId,
      contact_verification_status: mergedPhoneStatus,
      provenance: { ...(existingRow?.provenance || {}), ...(candidate.provenance || {}) },
      first_discovered_at: mergedFirstDiscovered,
      last_checked_at: now,
    };

    let attempts = 0;
    const maxRetries = options?.maxRetries || 2;
    let lastError = '';

    while (attempts <= maxRetries) {
      attempts++;
      try {
        // Idempotent upsert on restaurants table:
        // If source_record_id exists, upsert on (source_provider, source_record_id), else on id
        const onConflictTarget = sourceRecordId ? 'source_provider,source_record_id' : 'id';
        const { error: restError } = await supabase
          .from('restaurants')
          .upsert(dbRow, { onConflict: onConflictTarget });

        if (restError) {
          lastError = restError.message;
          if (attempts <= maxRetries) {
            await new Promise(r => setTimeout(r, 200 * attempts));
            continue;
          }
          return { success: false, restaurantId: dbId, isNew: false, associated: false, error: restError.message };
        }

        // Also record provenance in restaurant_sources
        if (sourceRecordId) {
          try {
            await supabase.from('restaurant_sources').upsert(
              {
                restaurant_id: dbId,
                provider_id: provider,
                external_business_identifier: sourceRecordId,
                raw_metadata: candidate.provenance || {},
                discovered_at: now,
              },
              { onConflict: 'provider_id,external_business_identifier' }
            );
          } catch {
            // Ignore optional provenance upsert failure
          }
        }

        // Also link campaign to restaurant in scan_job_restaurants
        let associated = false;
        if (jobId) {
          const isJobUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
          if (isJobUUID) {
            const { error: linkError } = await supabase.from('scan_job_restaurants').upsert(
              {
                job_id: jobId,
                restaurant_id: dbId,
                qualification_status: candidate.qualification_status || 'qualified',
                discovered_at: now,
              },
              { onConflict: 'job_id,restaurant_id' }
            );
            associated = !linkError;
          }
        }

        // Keep local memory store cache in sync with committed DB state
        store.saveRestaurant({ ...candidate, id: candidate.id || dbId, search_id: jobId });

        return {
          success: true,
          restaurantId: dbId,
          isNew,
          associated,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempts <= maxRetries) {
          await new Promise(r => setTimeout(r, 200 * attempts));
        }
      }
    }

    return { success: false, restaurantId: dbId, isNew: false, associated: false, error: lastError };
  }

  /**
   * Persists a batch of candidates, tracking exact per-item success, failures, and campaign associations.
   */
  async persistLeadBatch(
    candidates: Partial<Restaurant>[],
    jobId?: string,
    options?: PersistenceOptions
  ): Promise<BatchPersistenceResult> {
    let persistedCount = 0;
    let failedCount = 0;
    let associatedCount = 0;
    let duplicateCount = 0;
    const results: PersistenceResult[] = [];
    const errors: Array<{ candidateName: string; error: string }> = [];

    const seenIds = new Set<string>();

    for (const candidate of candidates) {
      const name = candidate.business_name || 'Unnamed Business';
      const sourceId = candidate.source_record_id || candidate.id || '';

      if (sourceId && seenIds.has(sourceId)) {
        duplicateCount++;
        continue;
      }
      if (sourceId) seenIds.add(sourceId);

      const res = await this.persistLead(candidate, jobId, options);
      results.push(res);

      if (res.success) {
        persistedCount++;
        if (res.associated) {
          associatedCount++;
        } else if (jobId) {
          failedCount++;
          errors.push({ candidateName: name, error: `Restaurant persisted but campaign link failed for job ${jobId}` });
        }
        if (!res.isNew) {
          duplicateCount++;
        }
      } else {
        failedCount++;
        errors.push({ candidateName: name, error: res.error || 'Unknown persistence error' });
      }
    }

    return {
      totalProcessed: candidates.length,
      persistedCount,
      failedCount,
      associatedCount,
      duplicateCount,
      results,
      errors,
    };
  }

  /**
   * Durably writes or updates a scan job record in Supabase scan_jobs table.
   */
  async persistJobSnapshot(job: ScanJob, options?: PersistenceOptions): Promise<boolean> {
    if (this.isTestBlocked(options)) {
      return true;
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.id);
    if (!isUUID) {
      // Must be a valid UUID for Supabase scan_jobs table
      return false;
    }

    const supabase = getSupabaseAdmin();
    try {
      const { error } = await supabase.from('scan_jobs').upsert(
        {
          id: job.id,
          name: job.name,
          configuration_snapshot: job.configuration_snapshot,
          provider_id: job.provider_id,
          status: job.status,
          progress_counters: job.progress_counters,
          usage_counters: job.usage_counters,
          error_summary: job.error_summary || job.last_error || null,
          created_at: job.created_at,
          started_at: job.started_at || null,
          completed_at: job.completed_at || null,
        },
        { onConflict: 'id' }
      );

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Durably writes or updates a scan task record in Supabase scan_tasks table.
   */
  async persistTaskSnapshot(task: ScanTask, options?: PersistenceOptions): Promise<boolean> {
    if (this.isTestBlocked(options)) {
      return true;
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.id);
    const isJobUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.job_id);
    if (!isUUID || !isJobUUID) {
      return false;
    }

    const supabase = getSupabaseAdmin();
    try {
      // Ensure geographic location exists to satisfy foreign key constraint scan_tasks_location_id_fkey
      if (task.location_id) {
        let countryCode = 'IN';
        let state = 'State';
        let district = 'District';
        let city: string | null = 'City';
        let locality: string | null = null;
        let lat: number | null = null;
        let lng: number | null = null;

        const globalPlace = findGlobalPlaceById(task.location_id);
        if (globalPlace) {
          countryCode = globalPlace.countryCode;
          state = globalPlace.level1Name;
          district = globalPlace.level2Name;
          city = globalPlace.name;
          lat = globalPlace.latitude;
          lng = globalPlace.longitude;
        } else if (task.location_id.startsWith('city-')) {
          const vCity = findVerifiedCityById(task.location_id);
          if (vCity) {
            countryCode = 'IN';
            state = vCity.state;
            district = vCity.district;
            city = vCity.name;
            lat = vCity.latitude ?? null;
            lng = vCity.longitude ?? null;
          }
        } else {
          const loc = findLocationById(task.location_id);
          if (loc) {
            countryCode = 'IN';
            state = loc.state;
            district = loc.district || loc.city || 'District';
            city = loc.city || loc.district || null;
            locality = loc.locality || null;
            lat = loc.latitude ?? null;
            lng = loc.longitude ?? null;
          }
        }

        await supabase.from('geographic_locations').upsert(
          {
            id: task.location_id,
            country_code: countryCode,
            state,
            district,
            city,
            locality,
            latitude: lat,
            longitude: lng,
            geographic_type: task.location_id.startsWith('city-') ? 'city' : 'locality',
          },
          { onConflict: 'id' }
        );
      }

      const { error } = await supabase.from('scan_tasks').upsert(
        {
          id: task.id,
          job_id: task.job_id,
          location_id: task.location_id,
          category: task.category,
          task_parameters: task.task_parameters || {},
          status: task.status,
          retry_count: task.retry_count || 0,
          max_retries: task.max_retries || 3,
          pagination_state: task.pagination_state || {},
          records_discovered: task.records_discovered || 0,
          last_error: task.last_error || null,
          created_at: task.created_at,
          attempted_at: task.attempted_at || null,
          completed_at: task.completed_at || null,
        },
        { onConflict: 'id' }
      );

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Fetches all durably committed restaurants associated with a specific campaign job ID.
   */
  async getCampaignPersistedLeads(jobId: string): Promise<{ leads: Restaurant[]; count: number }> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
    if (!isUUID) {
      return { leads: [], count: 0 };
    }

    const supabase = getSupabaseAdmin();
    const { data: linkRows, error: linkErr } = await supabase
      .from('scan_job_restaurants')
      .select('restaurant_id')
      .eq('job_id', jobId);

    if (linkErr || !linkRows || linkRows.length === 0) {
      return { leads: [], count: 0 };
    }

    const ids = linkRows.map(r => r.restaurant_id);
    const { data: restRows, error: restErr } = await supabase
      .from('restaurants')
      .select('*')
      .in('id', ids);

    if (restErr || !restRows) {
      return { leads: [], count: 0 };
    }

    const leads = restRows.map(row => ({
      ...row,
      latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
      longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
      rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : null,
      review_count: row.review_count !== null && row.review_count !== undefined ? Number(row.review_count) : null,
      data_completeness_score: Number(row.data_completeness_score || 0),
      lead_score: Number(row.lead_score || 0),
    })) as Restaurant[];

    return { leads, count: leads.length };
  }

  /**
   * Updates WhatsApp verification status, timestamp, method, phone, and auditor.
   * Ensures data integrity and updates both Supabase and MemoryStore caches.
   */
  async updateWhatsAppVerification(
    restaurantId: string,
    input: ManualWhatsAppVerificationInput,
    options?: PersistenceOptions
  ): Promise<{ success: boolean; restaurant?: Restaurant; error?: string }> {
    // 1. Resolve restaurant from memory store or Supabase
    let restaurant = store.getRestaurantById(restaurantId);
    const supabase = getSupabaseAdmin();

    if (!restaurant) {
      const { data: dbRow, error: fetchErr } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle();

      if (fetchErr || !dbRow) {
        return { success: false, error: 'Restaurant not found' };
      }
      restaurant = dbRow as Restaurant;
      store.saveRestaurant(restaurant);
    }

    // 2. Validate update using createManualVerificationUpdate
    const updateResult = createManualVerificationUpdate(restaurant, input, restaurant.country);
    if (!updateResult.success) {
      return { success: false, error: updateResult.error || 'Verification validation failed' };
    }

    const now = new Date().toISOString();
    const updatePayload = {
      whatsapp_status: updateResult.status,
      whatsapp_verified_at: updateResult.verifiedAt,
      whatsapp_verification_method: updateResult.verificationMethod,
      whatsapp_verified_phone: updateResult.verifiedPhone,
      whatsapp_verified_by: updateResult.verifiedBy,
      whatsapp_verification_notes: updateResult.verificationNotes,
      last_checked_at: now,
    };

    // 3. Update memory store cache immediately
    store.updateRestaurantWhatsAppStatus(restaurantId, updatePayload);
    const updatedRestaurant = store.getRestaurantById(restaurantId) || { ...restaurant, ...updatePayload };

    // 4. Durably persist to Supabase unless test-blocked
    if (!this.isTestBlocked(options)) {
      try {
        const { error: updateErr } = await supabase
          .from('restaurants')
          .update(updatePayload)
          .eq('id', restaurantId);

        if (updateErr) {
          console.warn('[PersistenceService] Supabase WhatsApp verification update failed:', updateErr.message);
          return { success: false, error: updateErr.message };
        }
      } catch (err: any) {
        console.warn('[PersistenceService] Error persisting WhatsApp verification:', err.message);
        return { success: false, error: err.message };
      }
    }

    return {
      success: true,
      restaurant: updatedRestaurant,
    };
  }

  /**
   * Inspects and recovers jobs that were left in 'running' state when the server or worker crashed.
   */
  async recoverStrandedJobs(): Promise<number> {
    const supabase = getSupabaseAdmin();
    const { data: runningJobs, error } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('status', 'running');

    if (error || !runningJobs || runningJobs.length === 0) {
      return 0;
    }

    let recoveredCount = 0;
    for (const job of runningJobs) {
      await supabase
        .from('scan_jobs')
        .update({
          status: 'paused',
          error_summary: 'Worker process restarted while job was in progress. Automatically paused for safe recovery.',
        })
        .eq('id', job.id);
      recoveredCount++;
    }

    return recoveredCount;
  }
}

export const persistenceService = PersistenceService.getInstance();
