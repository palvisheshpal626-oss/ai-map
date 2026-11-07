// lib/store/memory-store.ts
// Robust In-Memory & Persistence Store for Scan Jobs, Restaurants, Lists, and Activity.
// Connects and syncs with Supabase project dqokioywnacwbvifrqol while retaining local caching.

import {
  Restaurant,
  ScanJob,
  ScanTask,
  SearchConfig,
  LeadList,
  LeadNote,
  SearchRun,
  CandidateAuditRecord,
  CityQueueItem,
  DistrictCoverageSummary,
  OfflineArea,
  RawImportedRecord,
  WhatsAppAvailabilityStatus,
} from '../types';
import { calculateLeadScore } from '../scoring/lead-scorer';
import { classifyHospitalityTier } from '../classification/business-tier';
import { getDistrictCitiesAndTowns, findLocationById, findVerifiedCityById, isLocationInDistrict, DISTRICT_CENTROIDS, VerifiedCityInfo } from '../locations/india';
import { getAdministrativePlaces, findGlobalPlaceById, isLocationInGlobalScope, GLOBAL_COUNTRIES, getCountryByCode } from '../locations/global-registry';
import {
  findDuplicateRestaurant,
  normalizeBusinessName,
  normalizePhoneNumber,
  isValidPhoneNumber,
  formatInternationalPhone,
  normalizeEmail,
} from '../deduplication/deduplicator';
import { determineInitialWhatsAppStatus } from '../whatsapp/verifier';
import { getSupabase, getSupabaseAdmin } from '../supabase/client';
import { getDeterministicRestaurantId } from '../database/persistence-service';

class AppMemoryStore {
  private restaurants: Map<string, Restaurant> = new Map();
  private scanJobs: Map<string, ScanJob> = new Map();
  private scanTasks: Map<string, ScanTask> = new Map();
  private searchConfigs: Map<string, SearchConfig> = new Map();
  private leadLists: Map<string, LeadList> = new Map();
  private listItems: Map<string, Set<string>> = new Map(); // listId -> Set<restaurantId>
  private leadNotes: Map<string, LeadNote[]> = new Map(); // restaurantId -> LeadNote[]
  private activeRuns: Map<string, SearchRun> = new Map();
  private candidateAudits: Map<string, CandidateAuditRecord[]> = new Map(); // jobId -> CandidateAuditRecord[]
  private offlineAreas: Map<string, OfflineArea> = new Map();
  private rawImportedRecords: Map<string, RawImportedRecord> = new Map();
  private latestRunId: string | null = null;
  private supabaseSynced = false;

  constructor() {
    this.seedDefaultLists();
    // Fire background initial sync from Supabase if configured
    this.syncFromSupabase().catch(() => {});
  }

  private seedDefaultLists() {
    const list1: LeadList = {
      id: 'list-high-priority-leads',
      name: 'High-Priority Food Leads',
      description: 'Restaurants with high scores and verified phone numbers for outreach',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const list2: LeadList = {
      id: 'list-metro-verified',
      name: 'Verified Metro Hub Leads',
      description: 'Hand-picked qualified dining places for outreach',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.leadLists.set(list1.id, list1);
    this.leadLists.set(list2.id, list2);
    this.listItems.set(list1.id, new Set());
    this.listItems.set(list2.id, new Set());
  }

  /**
   * Sync existing rows from Supabase project dqokioywnacwbvifrqol
   */
  async syncFromSupabase(): Promise<number> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .limit(1000);

      if (error || !data) return 0;

      let count = 0;
      for (const row of data) {
        if (!this.restaurants.has(row.id)) {
          const rest: Restaurant = {
            id: row.id,
            business_name: row.business_name,
            normalized_name: row.normalized_name || normalizeBusinessName(row.business_name),
            category: row.category,
            description: row.description || null,
            street_address: row.street_address || null,
            formatted_address: row.formatted_address,
            country: row.country || 'India',
            state: row.state,
            district: row.district,
            city: row.city || null,
            locality: row.locality || null,
            postal_code: row.postal_code || null,
            latitude: row.latitude ? Number(row.latitude) : null,
            longitude: row.longitude ? Number(row.longitude) : null,
            phone_number: row.phone_number || null,
            normalized_phone: row.normalized_phone || (row.phone_number ? normalizePhoneNumber(row.phone_number) : null),
            international_phone: row.international_phone || (row.phone_number ? formatInternationalPhone(row.phone_number) : null),
            email: row.email || null,
            website_url: row.website_url || null,
            website_status: row.website_status || (row.website_url ? 'WEBSITE_LISTED' : 'WEBSITE_NOT_LISTED'),
            contact_page_url: row.contact_page_url || null,
            booking_url: row.booking_url || null,
            rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : null,
            review_count: row.review_count !== null && row.review_count !== undefined ? Number(row.review_count) : null,
            business_status: row.business_status || 'OPERATIONAL',
            maps_url: row.maps_url || null,
            source_provider: row.source_provider || 'osm_overpass',
            source_record_id: row.source_record_id || null,
            contact_verification_status: row.contact_verification_status || (row.phone_number ? 'UNVERIFIED_SOURCE_LISTED' : 'UNAVAILABLE'),
            provenance: row.provenance || {},
            data_completeness_score: row.data_completeness_score || 50,
            lead_score: row.lead_score || 50,
            lead_score_breakdown: row.lead_score_breakdown || {},
            first_discovered_at: row.first_discovered_at || new Date().toISOString(),
            last_checked_at: row.last_checked_at || new Date().toISOString(),
            whatsapp_status: row.whatsapp_status || determineInitialWhatsAppStatus(row.phone_number, row.country),
            whatsapp_verified_at: row.whatsapp_verified_at || null,
            whatsapp_verification_method: row.whatsapp_verification_method || null,
            whatsapp_verified_phone: row.whatsapp_verified_phone || null,
            whatsapp_verified_by: row.whatsapp_verified_by || null,
            whatsapp_verification_notes: row.whatsapp_verification_notes || null,
          };

          const tierInfo = classifyHospitalityTier(rest);
          rest.hospitality_tier = row.hospitality_tier || tierInfo.tier;
          rest.brand_name = row.brand_name || tierInfo.brandName;
          rest.is_established_chain = row.is_established_chain !== undefined ? row.is_established_chain : tierInfo.isEstablishedChain;
          rest.relevance_score = row.relevance_score || rest.lead_score;

          this.restaurants.set(rest.id, rest);
          count++;
        }
      }
      this.supabaseSynced = true;
      await this.syncJobsFromSupabase();
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Sync scan jobs from Supabase project dqokioywnacwbvifrqol
   */
  async syncJobsFromSupabase(): Promise<number> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('scan_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data) return 0;

      let count = 0;
      for (const row of data) {
        if (!this.scanJobs.has(row.id)) {
          const job: ScanJob = {
            id: row.id,
            name: row.name || 'Historical Campaign',
            configuration_snapshot: row.configuration_snapshot || {},
            provider_id: row.provider_id || 'osm_overpass',
            status: row.status || 'completed',
            progress_counters: {
              total_tasks: 0,
              completed_tasks: 0,
              failed_tasks: 0,
              fetched_candidates: 0,
              discovered_count: 0,
              qualified_leads: 0,
              rejected_leads: 0,
              duplicate_records: 0,
              persisted_count: 0,
              persistence_failed_count: 0,
              associated_count: 0,
              ...(row.progress_counters || {}),
            },
            usage_counters: {
              api_requests: 0,
              credits_used: 0,
              estimated_cost_inr: 0,
              ...(row.usage_counters || {}),
            },
            error_summary: row.error_summary || null,
            created_at: row.created_at || new Date().toISOString(),
            started_at: row.started_at || null,
            completed_at: row.completed_at || null,
          };
          this.scanJobs.set(job.id, job);
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }

  // --- RESTAURANTS ---
  getAllRestaurants(): Restaurant[] {
    return Array.from(this.restaurants.values()).sort((a, b) => {
      const scoreB = b.relevance_score ?? b.lead_score;
      const scoreA = a.relevance_score ?? a.lead_score;
      if (scoreB !== scoreA) return scoreB - scoreA;
      // Secondary sort: rating desc
      const ratingB = b.rating ?? -1;
      const ratingA = a.rating ?? -1;
      if (ratingB !== ratingA) return ratingB - ratingA;
      // Tertiary sort: reviews desc
      return (b.review_count ?? -1) - (a.review_count ?? -1);
    });
  }

  // --- SEARCH RUNS & LIVE DISCOVERY ---
  startSearchRun(runId: string, initial: Partial<SearchRun>): SearchRun {
    const run: SearchRun = {
      runId,
      query: initial.query || '',
      category: initial.category,
      state: initial.state,
      district: initial.district,
      city: initial.city,
      locality: initial.locality,
      providerId: initial.providerId || 'osm_overpass',
      status: 'running',
      startedAt: new Date().toISOString(),
      totalFetched: 0,
      totalFilteredOut: 0,
      totalResults: 0,
      minRatingApplied: initial.minRatingApplied ?? null,
      minReviewsApplied: initial.minReviewsApplied ?? null,
      error: null,
      results: [],
    };
    this.activeRuns.set(runId, run);
    this.latestRunId = runId;
    return run;
  }

  updateSearchRun(runId: string, update: Partial<SearchRun>): SearchRun | undefined {
    const run = this.activeRuns.get(runId);
    if (!run) return undefined;
    Object.assign(run, update);
    if (update.results) {
      run.totalResults = update.results.length;
    }
    return run;
  }

  getSearchRun(runId: string): SearchRun | undefined {
    return this.activeRuns.get(runId);
  }

  getLatestSearchRun(): SearchRun | undefined {
    if (!this.latestRunId) return undefined;
    return this.activeRuns.get(this.latestRunId);
  }

  clearSearchRun(runId: string): void {
    this.activeRuns.delete(runId);
    if (this.latestRunId === runId) {
      this.latestRunId = null;
    }
  }

  clearAllActiveRuns(): void {
    this.activeRuns.clear();
    this.latestRunId = null;
  }

  clearRestaurants(): void {
    this.restaurants.clear();
  }

  clearJobs(): void {
    this.scanJobs.clear();
    this.scanTasks.clear();
    this.candidateAudits.clear();
  }

  clearAll(): void {
    this.restaurants.clear();
    this.scanJobs.clear();
    this.scanTasks.clear();
    this.candidateAudits.clear();
    this.activeRuns.clear();
    this.latestRunId = null;
    this.offlineAreas.clear();
    this.rawImportedRecords.clear();
  }

  addCandidateAudit(jobId: string, record: CandidateAuditRecord): void {
    const list = this.candidateAudits.get(jobId) || [];
    list.push(record);
    this.candidateAudits.set(jobId, list);
  }

  getCandidateAudits(jobId: string, filter?: 'all' | 'qualified' | 'rejected' | 'unverified'): CandidateAuditRecord[] {
    const list = this.candidateAudits.get(jobId) || [];
    if (!filter || filter === 'all') return list;
    return list.filter(r => r.decision === filter);
  }

  getJobCityQueue(jobId: string): CityQueueItem[] {
    const job = this.scanJobs.get(jobId);
    return job?.city_queue || [];
  }

  updateCityQueueItem(jobId: string, cityId: string, updates: Partial<CityQueueItem>): CityQueueItem | undefined {
    const job = this.scanJobs.get(jobId);
    if (!job || !job.city_queue) return undefined;
    const item = job.city_queue.find(c => c.id === cityId);
    if (!item) return undefined;
    Object.assign(item, updates);
    return item;
  }

  registerLiveSearchJob(job: ScanJob): void {
    this.scanJobs.set(job.id, job);
  }

  getRestaurantsForRun(runId: string): Restaurant[] {
    const run = this.activeRuns.get(runId);
    if (run) return [...run.results];
    return Array.from(this.restaurants.values()).filter(r => r.search_id === runId);
  }

  getSavedRestaurants(): Restaurant[] {
    return this.getAllRestaurants();
  }

  getRestaurantById(id: string): Restaurant | undefined {
    const direct = this.restaurants.get(id);
    if (direct) return direct;
    for (const r of this.restaurants.values()) {
      if (r.source_record_id === id) return r;
    }
    return undefined;
  }

  saveRestaurant(raw: Partial<Restaurant>): { restaurant: Restaurant; isDuplicate: boolean } {
    const existingList = Array.from(this.restaurants.values());
    const dupCheck = findDuplicateRestaurant(raw, existingList);

    if (dupCheck.isDuplicate && dupCheck.matchedId) {
      const existing = this.restaurants.get(dupCheck.matchedId)!;
      // Merge newer details if existing lacked them
      if (!existing.phone_number && raw.phone_number) {
        existing.phone_number = raw.phone_number;
        existing.normalized_phone = normalizePhoneNumber(raw.phone_number);
        existing.international_phone = formatInternationalPhone(raw.phone_number);
        existing.whatsapp_status = determineInitialWhatsAppStatus(raw.phone_number, existing.country || raw.country);
      } else if (raw.phone_number && existing.phone_number !== raw.phone_number) {
        // Phone number modified: invalidate previous verification
        existing.phone_number = raw.phone_number;
        existing.normalized_phone = normalizePhoneNumber(raw.phone_number);
        existing.international_phone = formatInternationalPhone(raw.phone_number);
        existing.whatsapp_status = determineInitialWhatsAppStatus(raw.phone_number, existing.country || raw.country);
        existing.whatsapp_verified_at = null;
        existing.whatsapp_verification_method = null;
        existing.whatsapp_verified_phone = null;
        existing.whatsapp_verified_by = null;
        existing.whatsapp_verification_notes = 'Verification invalidated: phone number was modified';
      }
      if (!existing.email && raw.email) {
        existing.email = normalizeEmail(raw.email);
      }
      if (!existing.website_url && raw.website_url) existing.website_url = raw.website_url;
      if (raw.search_id) existing.search_id = raw.search_id;
      existing.last_checked_at = new Date().toISOString();

      // Fire asynchronous update to Supabase
      this.persistRestaurantToSupabase(existing).catch(() => {});

      return { restaurant: existing, isDuplicate: true };
    }

    const sourceRecordId = raw.source_record_id || raw.id || null;
    const id = raw.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`);
    const now = new Date().toISOString();

    const scoring = calculateLeadScore(raw);

    const normPhone = raw.phone_number ? normalizePhoneNumber(raw.phone_number) : null;
    const intlPhone = raw.phone_number ? formatInternationalPhone(raw.phone_number) : null;
    const cleanEmail = normalizeEmail(raw.email);
    const hasContact = Boolean(normPhone || cleanEmail);

    const tierInfo = classifyHospitalityTier(raw);

    const restaurant: Restaurant = {
      id,
      business_name: raw.business_name || 'Restaurant',
      normalized_name: normalizeBusinessName(raw.business_name || 'Restaurant'),
      category: raw.category || 'Restaurant',
      description: raw.description || null,
      street_address: raw.street_address || null,
      formatted_address: raw.formatted_address || `${raw.business_name}, India`,
      country: raw.country || 'India',
      state: raw.state || 'Uttar Pradesh',
      district: raw.district || 'Lucknow',
      city: raw.city || null,
      locality: raw.locality || null,
      postal_code: raw.postal_code || null,
      latitude: raw.latitude !== undefined ? raw.latitude : null,
      longitude: raw.longitude !== undefined ? raw.longitude : null,
      phone_number: raw.phone_number || null,
      normalized_phone: normPhone,
      international_phone: intlPhone,
      email: cleanEmail,
      website_url: raw.website_url || null,
      website_status: raw.website_status || (raw.website_url ? 'WEBSITE_LISTED' : 'WEBSITE_NOT_LISTED'),
      contact_page_url: raw.contact_page_url || null,
      booking_url: raw.booking_url || null,
      rating: raw.rating ?? null,
      review_count: raw.review_count ?? null,
      business_status: raw.business_status || 'OPERATIONAL',
      maps_url: raw.maps_url || null,
      source_provider: raw.source_provider || undefined,
      source_record_id: sourceRecordId,
      contact_verification_status: raw.contact_verification_status || (hasContact ? 'UNVERIFIED_SOURCE_LISTED' : 'UNAVAILABLE'),
      provenance: raw.provenance || {},
      data_completeness_score: scoring.breakdown.completenessScore * 10,
      lead_score: scoring.totalScore,
      lead_score_breakdown: scoring.breakdown,
      hospitality_tier: raw.hospitality_tier || tierInfo.tier,
      brand_name: raw.brand_name || tierInfo.brandName,
      is_established_chain: raw.is_established_chain !== undefined ? raw.is_established_chain : tierInfo.isEstablishedChain,
      relevance_score: scoring.relevanceScore,
      search_id: raw.search_id || null,
      qualification_status: raw.qualification_status || 'qualified',
      qualification_reasons: raw.qualification_reasons || [],
      disqualification_reason: raw.disqualification_reason || null,
      whatsapp_status: raw.whatsapp_status || determineInitialWhatsAppStatus(raw.phone_number, raw.country),
      whatsapp_verified_at: raw.whatsapp_verified_at || null,
      whatsapp_verification_method: raw.whatsapp_verification_method || null,
      whatsapp_verified_phone: raw.whatsapp_verified_phone || (raw.whatsapp_status === 'whatsapp_available' ? normPhone : null),
      whatsapp_verified_by: raw.whatsapp_verified_by || null,
      whatsapp_verification_notes: raw.whatsapp_verification_notes || null,
      first_discovered_at: now,
      last_checked_at: now,
    };

    this.restaurants.set(restaurant.id, restaurant);

    // Asynchronously persist to Supabase
    this.persistRestaurantToSupabase(restaurant).catch(() => {});

    return { restaurant, isDuplicate: false };
  }

  deleteRestaurant(id: string): boolean {
    const existed = this.restaurants.delete(id);
    // Also remove from any list items
    for (const itemSet of this.listItems.values()) {
      itemSet.delete(id);
    }
    return existed;
  }

  private async persistRestaurantToSupabase(r: Restaurant) {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return; // Absolute safeguard: Never write test fixtures or mock records to real Supabase
    }
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.id);
      const dbId = isUUID ? r.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`);

      const supabase = getSupabaseAdmin();
      await supabase.from('restaurants').upsert({
        id: dbId,
        business_name: r.business_name,
        normalized_name: r.normalized_name,
        category: r.category,
        description: r.description,
        street_address: r.street_address,
        formatted_address: r.formatted_address,
        country: r.country || 'India',
        state: r.state,
        district: r.district,
        city: r.city,
        locality: r.locality,
        postal_code: r.postal_code,
        latitude: r.latitude,
        longitude: r.longitude,
        phone_number: r.phone_number,
        normalized_phone: r.normalized_phone,
        international_phone: r.international_phone,
        email: r.email,
        website_url: r.website_url,
        website_status: r.website_status,
        contact_page_url: r.contact_page_url,
        booking_url: r.booking_url,
        rating: r.rating,
        review_count: r.review_count,
        business_status: r.business_status,
        maps_url: r.maps_url,
        source_provider: r.source_provider,
        source_record_id: r.source_record_id,
        contact_verification_status: r.contact_verification_status,
        provenance: r.provenance,
        data_completeness_score: r.data_completeness_score,
        lead_score: r.lead_score,
        lead_score_breakdown: r.lead_score_breakdown,
        whatsapp_status: r.whatsapp_status,
        whatsapp_verified_at: r.whatsapp_verified_at,
        whatsapp_verification_method: r.whatsapp_verification_method,
        whatsapp_verified_phone: r.whatsapp_verified_phone,
        whatsapp_verified_by: r.whatsapp_verified_by,
        whatsapp_verification_notes: r.whatsapp_verification_notes,
        first_discovered_at: r.first_discovered_at,
        last_checked_at: r.last_checked_at,
      }, { onConflict: 'id' });
    } catch {
      // Non-blocking in case of offline or local test execution
    }
  }

  updateRestaurantWhatsAppStatus(
    restaurantId: string,
    update: {
      whatsapp_status?: WhatsAppAvailabilityStatus;
      whatsapp_verified_at?: string | null;
      whatsapp_verification_method?: string | null;
      whatsapp_verified_phone?: string | null;
      whatsapp_verified_by?: string | null;
      whatsapp_verification_notes?: string | null;
      last_checked_at?: string;
    }
  ): Restaurant | undefined {
    const restaurant = this.getRestaurantById(restaurantId);
    if (!restaurant) return undefined;

    Object.assign(restaurant, update);

    // Also update any instances stored in active search runs
    for (const run of this.activeRuns.values()) {
      for (let i = 0; i < run.results.length; i++) {
        if (run.results[i].id === restaurantId || run.results[i].source_record_id === restaurantId) {
          Object.assign(run.results[i], update);
        }
      }
    }

    return restaurant;
  }

  // --- SCAN JOBS ---
  getAllJobs(): ScanJob[] {
    return Array.from(this.scanJobs.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getJobById(id: string): ScanJob | undefined {
    return this.scanJobs.get(id);
  }

  createJob(name: string, config: SearchConfig, providerId: string): ScanJob {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
    const countryCode = (config.selected_country || 'IN').toUpperCase();
    const isIndia = countryCode === 'IN' || countryCode === 'INDIA';

    // Resolve targeted division and load all verified places
    let targetState = config.selected_district?.state || (isIndia ? 'Uttar Pradesh' : 'New York');
    let targetDist = config.selected_district?.district || (isIndia ? 'Lucknow' : 'New York County (Manhattan)');

    if (!config.selected_district && config.selected_locations.length > 0) {
      if (isIndia) {
        const loc = findLocationById(config.selected_locations[0]);
        if (loc) {
          targetState = loc.state;
          targetDist = loc.district || loc.city || 'Lucknow';
        }
      } else {
        const place = findGlobalPlaceById(config.selected_locations[0]);
        if (place) {
          targetState = place.level1Name;
          targetDist = place.level2Name;
        }
      }
    }

    const targetDistNorm = targetDist.trim().toLowerCase();
    const targetStateNorm = targetState.trim().toLowerCase();

    const configLocations = config.selected_locations || [];
    let finalCities: VerifiedCityInfo[] = [];
    let coverageGapReported = false;

    if (isIndia) {
      const districtHierarchy = getDistrictCitiesAndTowns(targetState, targetDist);
      coverageGapReported = districtHierarchy.coverageGapReported;

      if (configLocations.length > 0) {
        for (const locId of configLocations) {
          const inDistrict = isLocationInDistrict(locId, targetState, targetDist);
          if (!inDistrict) {
            console.warn(
              `[GEOGRAPHIC ISOLATION] Location '${locId}' does not belong to target district '${targetDist}, ${targetState}'. Quarantined from job queue.`
            );
            continue;
          }

          let resolvedCity: VerifiedCityInfo | undefined;
          if (locId.startsWith('city-')) {
            resolvedCity = findVerifiedCityById(locId);
          } else {
            const loc = findLocationById(locId);
            if (loc) {
              resolvedCity = {
                id: loc.id,
                name: loc.locality || loc.city || loc.district,
                district: loc.district || targetDist,
                state: loc.state || targetState,
                isHeadquarters: false,
                searchCells: [loc.locality || loc.city || loc.district],
                localities: loc.locality ? [loc.locality] : [],
                latitude: loc.latitude ?? null,
                longitude: loc.longitude ?? null,
              };
            } else {
              const cleanName = locId.replace(/^(in-[a-z]+-)?/i, '').replace(/-/g, ' ').trim();
              resolvedCity = {
                id: locId,
                name: cleanName,
                district: targetDist,
                state: targetState,
                isHeadquarters: false,
                searchCells: [`${cleanName}, ${targetDist}`],
                localities: [],
                latitude: DISTRICT_CENTROIDS[targetDistNorm]?.lat ?? null,
                longitude: DISTRICT_CENTROIDS[targetDistNorm]?.lng ?? null,
              };
            }
          }

          if (resolvedCity && !finalCities.some(existing => existing.id === resolvedCity!.id)) {
            finalCities.push(resolvedCity);
          }
        }
      }

      if (finalCities.length === 0) {
        finalCities = districtHierarchy.cities;
      }
    } else {
      // Global International Division
      const adminRes = getAdministrativePlaces(countryCode, targetState, targetDist);
      coverageGapReported = adminRes.coverageGapReported;

      if (configLocations.length > 0) {
        for (const locId of configLocations) {
          const inDivision = isLocationInGlobalScope(locId, countryCode, targetState, targetDist);
          if (!inDivision) {
            console.warn(
              `[GEOGRAPHIC ISOLATION] Location '${locId}' does not belong to target division '${targetDist}, ${targetState}, ${countryCode}'. Quarantined from job queue.`
            );
            continue;
          }

          const matchedPlace = adminRes.places.find(p => p.id === locId) || findGlobalPlaceById(locId);
          if (matchedPlace && !finalCities.some(existing => existing.id === matchedPlace.id)) {
            finalCities.push({
              id: matchedPlace.id,
              name: matchedPlace.name,
              district: matchedPlace.level2Name,
              state: matchedPlace.level1Name,
              isHeadquarters: matchedPlace.isHeadquarters,
              searchCells: matchedPlace.searchCells,
              localities: matchedPlace.localities,
              latitude: matchedPlace.latitude,
              longitude: matchedPlace.longitude,
            });
          }
        }
      }

      if (finalCities.length === 0) {
        finalCities = adminRes.places.map(p => ({
          id: p.id,
          name: p.name,
          district: p.level2Name,
          state: p.level1Name,
          isHeadquarters: p.isHeadquarters,
          searchCells: p.searchCells,
          localities: p.localities,
          latitude: p.latitude,
          longitude: p.longitude,
        }));
      }
    }

    const sanitizedCategories = config.categories && config.categories.length > 0 ? config.categories : ['Restaurant'];

    const cityQueue: CityQueueItem[] = finalCities.map(c => ({
      id: c.id,
      city_name: c.name,
      district_name: c.district || targetDist,
      state_name: c.state || targetState,
      status: 'pending',
      search_cells: c.searchCells,
      current_cell_index: 0,
      total_cells: c.searchCells.length,
      candidates_fetched: 0,
      candidates_qualified: 0,
      candidates_rejected: 0,
      candidates_unverified: 0,
      candidates_persisted: 0,
      tasks_created: c.searchCells.length * sanitizedCategories.length,
      tasks_completed: 0,
      tasks_failed: 0,
    }));

    const validLocationIds = finalCities.map(c => c.id);

    const coverageSummary: DistrictCoverageSummary = {
      district: targetDist,
      state: targetState,
      total_cities: cityQueue.length,
      completed_cities: 0,
      partially_covered_cities: 0,
      pending_cities: cityQueue.length,
      failed_cities: 0,
      gaps_reported_cities: coverageGapReported ? 1 : 0,
      coverage_percentage: 0,
      coverage_status: 'in_progress',
    };

    const newJob: ScanJob = {
      id,
      name,
      configuration_snapshot: {
        ...config,
        selected_country: countryCode,
        selected_locations: validLocationIds,
        selected_district: {
          state: targetState,
          district: targetDist,
        },
      },
      provider_id: providerId,
      status: 'queued',
      selected_country: countryCode,
      selected_district: {
        state: targetState,
        district: targetDist,
      },
      city_queue: cityQueue,
      coverage_summary: coverageSummary,
      current_city: null,
      current_candidate: null,
      progress_counters: {
        total_tasks: validLocationIds.length * sanitizedCategories.length,
        completed_tasks: 0,
        failed_tasks: 0,
        discovered_count: 0,
        qualified_count: 0,
        unverified_count: 0,
        duplicate_count: 0,
        fetched_count: 0,
        rejected_count: 0,
        persisted_count: 0,
        persistence_failed_count: 0,
        associated_count: 0,
        rejection_breakdown: {},
      },
      usage_counters: {
        api_requests: 0,
        estimated_cost_inr: 0,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.scanJobs.set(id, newJob);

    // Create tasks ONLY for verified locations belonging to target district
    for (const locId of validLocationIds) {
      for (const cat of sanitizedCategories) {
        const taskId = getDeterministicRestaurantId('task', `${id}-${locId}-${cat}`);
        this.scanTasks.set(taskId, {
          id: taskId,
          job_id: id,
          location_id: locId,
          category: cat,
          task_parameters: {},
          status: 'queued',
          retry_count: 0,
          max_retries: 3,
          records_discovered: 0,
          created_at: new Date().toISOString(),
        });
      }
    }

    return newJob;
  }

  updateJob(id: string, updates: Partial<ScanJob>): ScanJob | undefined {
    const job = this.scanJobs.get(id);
    if (!job) return undefined;

    const updated = {
      ...job,
      ...updates,
      progress_counters: {
        ...job.progress_counters,
        ...(updates.progress_counters || {}),
      },
      usage_counters: {
        ...job.usage_counters,
        ...(updates.usage_counters || {}),
      },
    };

    this.scanJobs.set(id, updated);
    return updated;
  }

  // --- SCAN TASKS ---
  getTasksForJob(jobId: string): ScanTask[] {
    return Array.from(this.scanTasks.values()).filter(t => t.job_id === jobId);
  }

  updateTask(taskId: string, updates: Partial<ScanTask>): ScanTask | undefined {
    const task = this.scanTasks.get(taskId);
    if (!task) return undefined;

    const updated = { ...task, ...updates };
    this.scanTasks.set(taskId, updated);
    return updated;
  }

  saveTask(task: ScanTask): void {
    this.scanTasks.set(task.id, task);
  }

  getTaskById(taskId: string): ScanTask | undefined {
    return this.scanTasks.get(taskId);
  }

  // --- LEAD LISTS ---
  getAllLists(): LeadList[] {
    return Array.from(this.leadLists.values()).map(list => ({
      ...list,
      item_count: this.listItems.get(list.id)?.size || 0,
    }));
  }

  createList(name: string, description?: string): LeadList {
    const id = `list-${Date.now()}`;
    const newList: LeadList = {
      id,
      name,
      description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      item_count: 0,
    };
    this.leadLists.set(id, newList);
    this.listItems.set(id, new Set());
    return newList;
  }

  addToList(listId: string, restaurantId: string): boolean {
    let items = this.listItems.get(listId);
    if (!items) {
      items = new Set();
      this.listItems.set(listId, items);
    }
    items.add(restaurantId);
    return true;
  }

  removeFromList(listId: string, restaurantId: string): boolean {
    const items = this.listItems.get(listId);
    if (items) {
      return items.delete(restaurantId);
    }
    return false;
  }

  getListItems(listId: string): Restaurant[] {
    const itemIds = this.listItems.get(listId);
    if (!itemIds) return [];
    return Array.from(itemIds)
      .map(id => this.restaurants.get(id))
      .filter((r): r is Restaurant => Boolean(r));
  }

  // --- OFFLINE DATA METHODS ---
  saveOfflineArea(area: OfflineArea): void {
    this.offlineAreas.set(area.id, { ...area });
    this.persistOfflineAreaToSupabase(area).catch(() => {});
  }

  private async persistOfflineAreaToSupabase(area: OfflineArea): Promise<void> {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;
    try {
      const supabase = getSupabaseAdmin();
      await supabase
        .from('offline_areas')
        .upsert({
          id: area.id,
          city_name: area.city_name,
          district_name: area.district_name,
          state_name: area.state_name,
          bounding_box: area.bounding_box,
          status: area.status,
          bytes_downloaded: area.bytes_downloaded,
          records_count: area.records_count,
          checksum: area.checksum,
          attribution: area.attribution,
          last_downloaded_at: area.last_downloaded_at,
          error_message: area.error_message || null,
          updated_at: new Date().toISOString(),
        });
    } catch {}
  }

  getOfflineArea(id: string): OfflineArea | undefined {
    return this.offlineAreas.get(id);
  }

  getAllOfflineAreas(): OfflineArea[] {
    return Array.from(this.offlineAreas.values());
  }

  deleteOfflineArea(id: string): boolean {
    const existed = this.offlineAreas.delete(id);
    if (existed) {
      // Also delete raw records associated with this area
      for (const [recId, rec] of this.rawImportedRecords.entries()) {
        if (rec.area_id === id) {
          this.rawImportedRecords.delete(recId);
        }
      }
      this.deleteOfflineAreaFromSupabase(id).catch(() => {});
    }
    return existed;
  }

  private async deleteOfflineAreaFromSupabase(id: string): Promise<void> {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('offline_areas').delete().eq('id', id);
      await supabase.from('raw_imported_records').delete().eq('area_id', id);
    } catch {}
  }

  saveRawImportedRecord(record: RawImportedRecord): void {
    this.rawImportedRecords.set(record.id, { ...record });
  }

  saveRawImportedRecordsBatch(records: RawImportedRecord[]): void {
    for (const r of records) {
      this.rawImportedRecords.set(r.id, { ...r });
    }
  }

  getRawImportedRecords(areaId?: string): RawImportedRecord[] {
    const all = Array.from(this.rawImportedRecords.values());
    if (areaId) {
      return all.filter(r => r.area_id === areaId);
    }
    return all;
  }

  deleteRawImportedRecords(recordIds: string[]): number {
    let count = 0;
    const idSet = new Set(recordIds);
    for (const id of idSet) {
      if (this.rawImportedRecords.delete(id)) {
        count++;
      }
    }
    return count;
  }

  clearOfflineData(): void {
    this.offlineAreas.clear();
    this.rawImportedRecords.clear();
  }


  // --- STATS ---
  getDashboardStats() {
    const all = this.getAllRestaurants();
    const uniqueCount = all.length;
    const withPhone = all.filter(r => isValidPhoneNumber(r.phone_number)).length;
    const withEmail = all.filter(r => Boolean(r.email && r.email.includes('@'))).length;
    const withCoordinates = all.filter(r => r.latitude !== null && r.longitude !== null).length;
    const withWebsite = all.filter(r => r.website_status === 'WEBSITE_LISTED' || r.website_status === 'WEBSITE_REACHABLE').length;
    const noWebsite = all.filter(r => r.website_status === 'WEBSITE_NOT_LISTED').length;
    const verifiedNoWebsite = all.filter(r => r.website_status === 'VERIFIED_NO_OFFICIAL_WEBSITE').length;
    const pendingVerification = all.filter(r => r.website_status === 'VERIFICATION_PENDING').length;
    const qualifiedLeads = all.filter(r => r.qualification_status === 'qualified' || r.lead_score >= 60).length;

    const statesScanned = new Set(all.map(r => r.state)).size;
    const districtsScanned = new Set(all.map(r => r.district)).size;

    const jobs = this.getAllJobs();
    const queuedJobs = jobs.filter(j => j.status === 'queued').length;
    const runningJobs = jobs.filter(j => j.status === 'running').length;
    const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'completed_with_warnings').length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;

    const totalApiRequests = jobs.reduce((acc, j) => acc + (j.usage_counters.api_requests || 0), 0);
    const estimatedCostInr = jobs.reduce((acc, j) => acc + (j.usage_counters.estimated_cost_inr || 0), 0);

    return {
      uniqueCount,
      withPhone,
      withEmail,
      withCoordinates,
      withWebsite,
      noWebsite,
      verifiedNoWebsite,
      pendingVerification,
      qualifiedLeads,
      statesScanned,
      districtsScanned,
      queuedJobs,
      runningJobs,
      completedJobs,
      failedJobs,
      totalApiRequests,
      estimatedCostInr,
    };
  }
}

// Global singleton for Next.js server runtime
const globalStore = global as unknown as { __RLF_STORE__?: AppMemoryStore };

export const store = globalStore.__RLF_STORE__ || new AppMemoryStore();
if (process.env.NODE_ENV !== 'production') {
  globalStore.__RLF_STORE__ = store;
}
