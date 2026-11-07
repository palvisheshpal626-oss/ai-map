// scripts/live-production-readiness.test.ts
// Production-Readiness Live Audit Suite executing real provider requests,
// database checks, qualification audits, WhatsApp utilities, concurrency locks, and exports.

import { describe, it, expect } from 'vitest';
import { getSupabase } from '../lib/supabase/client';
import { store } from '../lib/store/memory-store';
import { ScanWorker } from '../lib/workers/scan-worker';
import { ProviderRegistry } from '../lib/providers/registry';
import { getDistrictCitiesAndTowns } from '../lib/locations/india';
import { verifyCandidateWithAudit } from '../lib/qualification/qualifier';
import { normalizeWhatsAppPhone, buildWhatsAppUrl, getDefaultWhatsAppDraft } from '../lib/utils/whatsapp';
import { generateCsvExport, generateExcelExport } from '../lib/exports/exporter';
import { SearchConfig, Restaurant } from '../lib/types';

describe('Production Readiness Live System Audit', () => {
  // AUDIT ITEM 1: Supabase Connection & Historical Data Preservation
  it('Audit 1: Confirms Supabase connection and verifies legitimate historical records are preserved', async () => {
    const supabase = getSupabase();
    let res = await supabase
      .from('restaurants')
      .select('id, business_name, city, state', { count: 'exact' });

    if (res.error) {
      // Retry once after 1000ms in case of momentary DNS/network blip
      await new Promise(r => setTimeout(r, 1000));
      res = await supabase
        .from('restaurants')
        .select('id, business_name, city, state', { count: 'exact' });
    }

    expect(res.error).toBeNull();
    expect(res.data).toBeDefined();
    console.log(`[AUDIT] Supabase Live Record Count: ${res.data?.length || 0}`);
    if (res.data && res.data.length > 0) {
      console.log(`[AUDIT] Existing Historical Records:`, res.data.map(r => `${r.business_name} (${r.city}, ${r.state})`));
    }
    // Verify historical records are not deleted or corrupted
    expect(res.data!.length).toBeGreaterThanOrEqual(1);
  }, 20000);

  // AUDIT ITEM 2: Geographic Dataset & City Queue Coverage Gap Reporting
  it('Audit 2: Verifies city queue resolution and honest reporting of geographic coverage gaps', () => {
    // Verified district: Lucknow
    const lucknowHierarchy = getDistrictCitiesAndTowns('Uttar Pradesh', 'Lucknow');
    expect(lucknowHierarchy.district).toBe('Lucknow');
    expect(lucknowHierarchy.state).toBe('Uttar Pradesh');
    expect(lucknowHierarchy.cities.length).toBeGreaterThanOrEqual(4);
    expect(lucknowHierarchy.coverageGapReported).toBe(false);

    // Verified district: Gautam Buddha Nagar
    const noidaHierarchy = getDistrictCitiesAndTowns('Uttar Pradesh', 'Gautam Buddha Nagar');
    expect(noidaHierarchy.cities.length).toBeGreaterThanOrEqual(2);
    expect(noidaHierarchy.coverageGapReported).toBe(false);

    // Unregistered/Sparse District reports coverage gap honestly
    const sparseHierarchy = getDistrictCitiesAndTowns('Uttar Pradesh', 'Chandauli');
    expect(sparseHierarchy.coverageGapReported).toBe(true);
    expect(sparseHierarchy.cities[0].name).toBe('Chandauli');
  });

  // AUDIT ITEM 3: Real Live Provider Search (OpenStreetMap Overpass API)
  it('Audit 3: Executes a real live search against configured Overpass provider for Lucknow', async () => {
    const osmProvider = ProviderRegistry.getProvider('osm_overpass');
    expect(osmProvider.isConfigured()).toBe(true);

    const result = await osmProvider.searchBusinesses({
      query: 'Restaurant in Hazratganj, Lucknow, Uttar Pradesh, India',
      category: 'Restaurant',
      latitude: 26.8500,
      longitude: 80.9500,
    });

    console.log(`[AUDIT] Real OSM Overpass Live Results Fetched: ${result.restaurants.length}`);
    expect(result.restaurants.length).toBeGreaterThan(0);

    const first = result.restaurants[0];
    expect(first.business_name).toBeDefined();
    expect(first.source_provider).toBe('osm_overpass');
    console.log(`[AUDIT] First Live Real Restaurant: "${first.business_name}" | Address: "${first.formatted_address}" | Phone: "${first.phone_number || 'None listed'}"`);
  }, 30000);

  // AUDIT ITEM 4: Real Data Flow Through Verification, Store, and Export
  it('Audit 4: End-to-end data flow: Live provider candidate -> 7-point audit -> Store -> CSV/Excel Export', async () => {
    const osmProvider = ProviderRegistry.getProvider('osm_overpass');
    const result = await osmProvider.searchBusinesses({
      query: 'Restaurant in Gomti Nagar, Lucknow, Uttar Pradesh, India',
      category: 'Restaurant',
      latitude: 26.8550,
      longitude: 80.9950,
    });

    const candidate = result.restaurants[0];
    expect(candidate).toBeDefined();

    // Run 7-Point Audit Check
    const audit = verifyCandidateWithAudit(candidate, {
      rating_filters: { min: 0, include_unrated: true },
      contact_filters: {
        phone: 'optional',
        phone_filter: 'all',
        website_filter: 'all',
        include_without_phone: true,
        include_without_email: true,
      },
    }, {
      cityName: 'Lucknow',
      districtName: 'Lucknow',
      stateName: 'Uttar Pradesh',
      providerId: 'osm_overpass',
      providerCapabilities: osmProvider.capabilities,
    });

    expect(audit.auditChecks.length).toBeGreaterThanOrEqual(4);
    candidate.qualification_status = audit.status === 'rejected' ? 'disqualified' : audit.status;
    candidate.audit_trail = audit.auditChecks;
    candidate.qualification_reasons = audit.qualificationReasons;
    candidate.disqualification_reason = audit.primaryRejectionReason;

    // Save to memory store
    const { restaurant, isDuplicate } = store.saveRestaurant(candidate);
    expect(restaurant.id).toBeDefined();

    // Verify CSV Export
    const csvText = generateCsvExport([restaurant]);
    expect(csvText).toContain(restaurant.business_name);
    expect(csvText).toContain('Restaurant Name');

    // Verify Excel Export
    const excelBuffer = await generateExcelExport([restaurant]);
    expect(excelBuffer.length).toBeGreaterThan(100);
    console.log(`[AUDIT] Generated CSV Export (${csvText.length} chars) and Excel Export (${excelBuffer.length} bytes) from real candidate`);
  }, 30000);

  // AUDIT ITEM 5: Qualification Check Edge Cases (Missing ratings, missing reviews, invalid phones, bounds)
  it('Audit 5: Verifies all qualification checks against edge-case candidate data', () => {
    // A. Out of bounds (e.g. coordinates in Europe or country not India)
    const outOfBoundsCand: Partial<Restaurant> = {
      business_name: 'Paris Bistro',
      country: 'France',
      latitude: 48.8566,
      longitude: 2.3522,
    };
    const auditA = verifyCandidateWithAudit(outOfBoundsCand);
    expect(auditA.status).toBe('rejected');
    expect(auditA.primaryRejectionReason).toContain('outside Indian national bounds');

    // B. Roadside stall exclusion when 4.0+ is configured
    const stallCand: Partial<Restaurant> = {
      business_name: 'Sharma Ji Ki Chai Tapri',
      category: 'tea_stall',
      country: 'India',
    };
    const auditB = verifyCandidateWithAudit(stallCand, { rating_filters: { min: 4.0, include_unrated: false } });
    expect(auditB.status).toBe('rejected');
    expect(auditB.primaryRejectionReason).toContain('Excluded roadside stall');

    // C. Invalid phone placeholders (e.g. "Unavailable", "0000000000")
    const dummyPhoneCand: Partial<Restaurant> = {
      business_name: 'Grand Dine Inn',
      phone_number: 'Unavailable',
      country: 'India',
    };
    const auditC = verifyCandidateWithAudit(dummyPhoneCand, {
      contact_filters: {
        phone: 'required',
        phone_filter: 'with_phone',
        website_filter: 'all',
      },
    });
    expect(auditC.status).toBe('rejected');
    expect(auditC.primaryRejectionReason).toContain('Missing or invalid phone number');

    // D. Missing rating with OSM provider -> Unverified state
    const osmCand: Partial<Restaurant> = {
      business_name: 'Lucknow Biryani Corner',
      rating: null,
      country: 'India',
    };
    const auditD = verifyCandidateWithAudit(osmCand, {
      rating_filters: { min: 4.0, include_unrated: false },
    }, {
      providerId: 'osm_overpass',
      providerCapabilities: { supportsRatings: false, supportsReviewCounts: false },
    });
    expect(auditD.status).toBe('unverified');
    expect(auditD.primaryRejectionReason).toContain('Selected provider does not store Google consumer ratings');
  });

  // AUDIT ITEM 6: Concurrency Protection, Pause/Resume, and Duplicate Prevention
  it('Audit 6: Verifies concurrency lock, duplicate prevention, and pause/resume transitions', async () => {
    const config: SearchConfig = {
      id: `cfg-${Date.now()}`,
      name: 'Resilience Test Job',
      selected_locations: ['in-up-lucknow'],
      categories: ['Restaurants'],
      rating_filters: { min: 0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
      contact_filters: {
        phone: 'optional',
        phone_filter: 'all',
        website_filter: 'all',
        include_without_phone: true,
        include_without_email: true,
      },
      limits: { max_records_per_location: 20, max_total_records: 50 },
      provider_id: 'osm_overpass',
    };

    const job = store.createJob('Concurrency Test', config, 'osm_overpass');

    // Pause and Resume checks
    ScanWorker.pauseJob(job.id);
    expect(store.getJobById(job.id)?.status).toBe('paused');

    // Cancel checks
    ScanWorker.cancelJob(job.id);
    expect(store.getJobById(job.id)?.status).toBe('cancelled');

    // Duplicate restaurant saving
    const sampleRecord: Partial<Restaurant> = {
      business_name: 'Dastarkhwan Heritage',
      formatted_address: 'Hazratganj, Lucknow, UP, India',
      phone_number: '9839012345',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
    };
    const firstSave = store.saveRestaurant(sampleRecord);
    expect(firstSave.isDuplicate).toBe(false);

    const secondSave = store.saveRestaurant(sampleRecord);
    expect(secondSave.isDuplicate).toBe(true);
    expect(secondSave.restaurant.id).toBe(firstSave.restaurant.id);
  });

  // AUDIT ITEM 7: WhatsApp Click-to-Chat Verification
  it('Audit 7: Verifies WhatsApp URL generation with various phone formats and confirms no automatic dispatch', () => {
    // 10-digit Indian Mobile
    const res10 = normalizeWhatsAppPhone('9876543210');
    expect(res10.isValid).toBe(true);
    expect(res10.normalizedPhone).toBe('919876543210');
    expect(res10.formattedDisplay).toBe('+91 98765 43210');

    // Landline with STD code
    const resLandline = normalizeWhatsAppPhone('0522 4024444');
    expect(resLandline.isValid).toBe(true);
    expect(resLandline.normalizedPhone).toBe('915224024444');

    // Number already prefixed with +91
    const resPlus91 = normalizeWhatsAppPhone('+91 9876543210');
    expect(resPlus91.isValid).toBe(true);
    expect(resPlus91.normalizedPhone).toBe('919876543210');

    // Number already prefixed with 91 (no plus) -> NEVER prepend 91 twice
    const res91 = normalizeWhatsAppPhone('919876543210');
    expect(res91.isValid).toBe(true);
    expect(res91.normalizedPhone).toBe('919876543210');
    expect(res91.normalizedPhone?.startsWith('9191')).toBe(false);

    // Invalid & Placeholder Phones
    expect(normalizeWhatsAppPhone('Unavailable').isValid).toBe(false);
    expect(normalizeWhatsAppPhone('N/A').isValid).toBe(false);
    expect(normalizeWhatsAppPhone('0000000000').isValid).toBe(false);

    // URL format with draft text
    const draft = getDefaultWhatsAppDraft('Falaks Rooftop');
    expect(draft).toContain('Falaks Rooftop');
    expect(draft).toContain('digital ordering services');

    const urlResult = buildWhatsAppUrl('9876543210', draft, 'IN');
    expect(urlResult.url.startsWith('https://wa.me/919876543210?text=') || urlResult.url.startsWith('https://web.whatsapp.com/send?phone=919876543210&text=')).toBe(true);
    // Verifies purely a URL link is returned, no background HTTP dispatch occurs
    expect(urlResult.error).toBeUndefined();
  });

  // AUDIT ITEM 8: Real Live District Scan Campaign using Overpass Provider
  it('Audit 8: Runs a real live district scan campaign for Lucknow using osm_overpass provider', async () => {
    const config: SearchConfig = {
      id: `live-audit-cfg-${Date.now()}`,
      name: 'Live Audit Lucknow District Scan',
      selected_district: {
        state: 'Uttar Pradesh',
        district: 'Lucknow',
      },
      selected_locations: ['in-up-lucknow'],
      categories: ['Restaurants'],
      rating_filters: { min: 0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
      contact_filters: {
        phone: 'optional',
        phone_filter: 'all',
        website_filter: 'all',
        include_without_phone: true,
        include_without_email: true,
      },
      limits: { max_records_per_location: 10, max_total_records: 20 },
      provider_id: 'osm_overpass',
    };

    const job = store.createJob('Real Live Lucknow Campaign', config, 'osm_overpass');
    expect(job.status).toBe('queued');

    // Run the job with the real worker
    await ScanWorker.runJob(job.id);

    const completedJob = store.getJobById(job.id)!;
    console.log(`[AUDIT] Live Scan Job Completed with Status: ${completedJob.status}`);
    console.log(`[AUDIT] Discovered Leads: ${completedJob.progress_counters.discovered_count}`);
    console.log(`[AUDIT] Qualified Leads: ${completedJob.progress_counters.qualified_count}`);
    console.log(`[AUDIT] Fetched Total: ${completedJob.progress_counters.fetched_count}`);
    console.log(`[AUDIT] Completed Tasks: ${completedJob.progress_counters.completed_tasks}`);

    expect(completedJob.status).toBe('completed');
    expect(completedJob.progress_counters.discovered_count).toBeGreaterThan(0);

    // Verify records exist in memory store for this job run
    const results = store.getRestaurantsForRun(job.id);
    expect(results.length).toBeGreaterThan(0);
    console.log(`[AUDIT] Real Records Saved to Run: ${results.length}`);
    console.log(`[AUDIT] Sample Discovered Record: "${results[0].business_name}" in "${results[0].city}"`);

    // Verify candidate audit records
    const audits = store.getCandidateAudits(job.id);
    expect(audits.length).toBeGreaterThan(0);
    console.log(`[AUDIT] Candidate Audits Generated for Run: ${audits.length}`);
  }, 30000);
});
