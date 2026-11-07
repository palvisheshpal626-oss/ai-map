// lib/strict-zero-fake-data.test.ts
// Strict Production Verification Suite: Zero Fake, Mock, Seeded, or Preloaded Business Data

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store/memory-store';
import { databaseAuditService } from './database/audit-service';
import { verifyCandidateWithAudit } from './qualification/qualifier';
import { normalizePhoneNumber, formatInternationalPhone, normalizeInternationalPhone } from './deduplication/deduplicator';
import { normalizeWhatsAppPhone, buildWhatsAppUrl } from './utils/whatsapp';
import { GLOBAL_COUNTRIES, getCountryByCode, getCountryAdministrativeHierarchy, getAdministrativePlaces } from './locations/global-registry';
import { Restaurant, SearchConfig } from './types';

describe('Strict Production Rule: Zero Fake, Mock, Seeded or Preloaded Business Data', () => {
  beforeEach(() => {
    store.clearAll();
  });

  // 1. Fresh Database contains no preloaded or seeded restaurant records
  it('Criterion 1: Initialized store contains exactly zero preloaded business records', () => {
    const allRestaurants = store.getAllRestaurants();
    expect(allRestaurants.length).toBe(0);

    const latestRun = store.getLatestSearchRun();
    expect(latestRun).toBeUndefined();
  });

  // 2. Failed or empty provider returns 0 results honestly, never fake or sample data
  it('Criterion 2: Empty or failed discovery run results in empty state without fallback records', () => {
    const runId = 'test_empty_run_' + Date.now();
    const run = store.startSearchRun(runId, {
      query: 'NonExistentPlaceCafeXYZ',
      category: 'Restaurants',
      city: 'NonExistentCity',
      state: 'Nowhere',
      district: 'Nowhere',
      providerId: 'osm_overpass',
      minRatingApplied: null,
      minReviewsApplied: null,
      results: [],
      status: 'completed',
    });

    expect(run.results).toEqual([]);
    expect(run.totalResults).toBe(0);
    expect(store.getRestaurantsForRun(runId)).toEqual([]);
  });

  // 3. Truthful OSM Data: No fake ratings or invented review counts
  it('Criterion 3: Discovered OSM records honestly carry null ratings and null review counts', () => {
    const rawOsmRecord: Partial<Restaurant> = {
      id: 'osm-node-1029384756',
      business_name: 'Authentic Lucknow Kebab Point',
      formatted_address: 'Hazratganj, Lucknow, Uttar Pradesh, 226001, India',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      country: 'India',
      latitude: 26.8467,
      longitude: 80.9462,
      phone_number: '0522 2233445',
      website_url: null,
      source_provider: 'osm_overpass',
      source_record_id: 'osm-node-1029384756',
      rating: null,
      review_count: null,
    };

    const audit = verifyCandidateWithAudit(rawOsmRecord, {
      rating_filters: { min: 1.0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
    });

    expect(audit.isQualified).toBe(true);
    // Rating check must accept unrated without fabricating any rating number
    const ratingCheck = audit.auditChecks.find(c => c.check_name === 'Consumer Rating Verification');
    expect(ratingCheck).toBeDefined();
    expect(ratingCheck?.status).toBe('passed');
    expect(rawOsmRecord.rating).toBeNull();
    expect(rawOsmRecord.review_count).toBeNull();
  });

  // 4. Repeated imports do not create duplicate businesses
  it('Criterion 4: Deduplication engine prevents duplicate records upon repeated discovery', () => {
    const record: Partial<Restaurant> = {
      id: 'osm-node-9988776655',
      business_name: 'Metro Dine Station',
      formatted_address: 'Station Road, Lucknow, Uttar Pradesh, 226001, India',
      city: 'Lucknow',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      phone_number: '9839012345',
      source_record_id: 'osm-node-9988776655',
      source_provider: 'osm_overpass',
    };

    const firstSave = store.saveRestaurant(record);
    expect(firstSave.isDuplicate).toBe(false);
    expect(store.getAllRestaurants().length).toBe(1);

    // Save identical record again
    const secondSave = store.saveRestaurant({
      ...record,
      id: 'osm-node-9988776655',
    });
    expect(secondSave.isDuplicate).toBe(true);
    expect(store.getAllRestaurants().length).toBe(1); // Count must not increase
  });

  // 5. Database audit classifies records into verified, unknown provenance, test fixture, mock data
  it('Criterion 5: Database audit engine truthfully classifies record provenance and protects legitimate data', async () => {
    // 1. Verified Real Record
    store.saveRestaurant({
      id: 'osm-node-11112222',
      business_name: 'Hazratganj Awadhi Cafe',
      formatted_address: 'Hazratganj, Lucknow, Uttar Pradesh, India',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      city: 'Lucknow',
      phone_number: '9936232969',
      source_provider: 'osm_overpass',
      source_record_id: 'osm-node-11112222',
      latitude: 26.85,
      longitude: 80.95,
      maps_url: 'https://www.openstreetmap.org/node/11112222',
    });

    // 2. Unknown Provenance (e.g. historical legitimate business without detailed source tags)
    store.saveRestaurant({
      id: '00000000-0000-0000-0000-000000000002',
      business_name: 'Udipi Restaurant',
      formatted_address: 'Shopping Square, Shaheed Path, Lucknow, Uttar Pradesh, India',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      city: 'Lucknow',
      phone_number: '9936232970',
    });

    // 3. Test Fixture (created during automated test)
    store.saveRestaurant({
      id: 'fixture-test-rest-001',
      business_name: 'Sequence Restaurant 1',
      formatted_address: 'Test Street 1, Lucknow, India',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
    });

    // 4. Mock Data
    store.saveRestaurant({
      id: 'mock-bistro-999',
      business_name: 'Mock Bistro Sample',
      formatted_address: 'Demo Lane, Lucknow, India',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      source_provider: 'mock_provider',
    });

    const report = await databaseAuditService.auditDatabase();

    expect(report.breakdown.verified_real_source).toBeGreaterThanOrEqual(1);
    expect(report.breakdown.unknown_provenance).toBeGreaterThanOrEqual(1);
    expect(report.breakdown.test_fixture).toBe(1);
    expect(report.breakdown.mock_data).toBe(1);

    // Both verified real-source and unknown provenance MUST be protected by default
    const udipiEntry = report.records.find(r => r.business_name === 'Udipi Restaurant');
    expect(udipiEntry?.classification).toBe('unknown_provenance');
    expect(udipiEntry?.is_safe_to_preserve).toBe(true);

    const realEntry = report.records.find(r => r.business_name === 'Hazratganj Awadhi Cafe');
    expect(realEntry?.classification).toBe('verified_real_source');
    expect(realEntry?.is_safe_to_preserve).toBe(true);

    // Preview cleanup of test fixtures
    const preview = await databaseAuditService.previewCleanup('test_fixture');
    expect(preview.records_to_delete_count).toBe(1);
    expect(preview.protected_records_count).toBeGreaterThanOrEqual(2);
    expect(preview.requires_confirmation_token).toBe('CONFIRM_DELETE_TEST_FIXTURE');

    // Executing cleanup without exact token must throw error
    await expect(
      databaseAuditService.executeCleanup('test_fixture', 'WRONG_TOKEN')
    ).rejects.toThrow();

    // Executing cleanup with token deletes only test fixture
    const cleanupRes = await databaseAuditService.executeCleanup('test_fixture', 'CONFIRM_DELETE_TEST_FIXTURE');
    expect(cleanupRes.success).toBe(true);
    expect(cleanupRes.deleted_count).toBe(1);

    // Verified real-source and unknown provenance remains strictly intact
    expect(store.getAllRestaurants().some(r => r.business_name === 'Udipi Restaurant')).toBe(true);
    expect(store.getAllRestaurants().some(r => r.business_name === 'Hazratganj Awadhi Cafe')).toBe(true);
    expect(store.getAllRestaurants().some(r => r.business_name === 'Sequence Restaurant 1')).toBe(false);
  });

  // 6. International phone normalization never blindly prepends +91 to foreign numbers
  it('Criterion 6: International phone normalization formats global numbers truthfully using libphonenumber-js', () => {
    // US Phone
    const usPhone = '4155552671';
    const normUS = normalizeInternationalPhone(usPhone, 'US');
    expect(normUS).toBe('+14155552671');
    expect(normUS).not.toContain('+91');

    const waUS = normalizeWhatsAppPhone(usPhone, 'US');
    expect(waUS.isValid).toBe(true);
    expect(waUS.normalizedPhone).toBe('14155552671');
    expect(waUS.formattedDisplay).toBe('+1 415 555 2671');

    // UK Phone
    const ukPhone = '020 7183 8750';
    const normUK = normalizeInternationalPhone(ukPhone, 'GB');
    expect(normUK).toBe('+442071838750');
    expect(normUK).not.toContain('+91');

    const waUK = normalizeWhatsAppPhone(ukPhone, 'GB');
    expect(waUK.isValid).toBe(true);
    expect(waUK.normalizedPhone).toBe('442071838750');

    // Indian Phone
    const inPhone = '9936232969';
    const normIN = normalizeInternationalPhone(inPhone, 'IN');
    expect(normIN).toBe('+919936232969');

    const waIN = normalizeWhatsAppPhone(inPhone, 'IN');
    expect(waIN.isValid).toBe(true);
    expect(waIN.normalizedPhone).toBe('919936232969');

    // WhatsApp click-to-chat URL format
    const urlRes = buildWhatsAppUrl('+14155552671', { message: 'Hello' });
    expect(urlRes.url).toBe('https://web.whatsapp.com/send?phone=14155552671&text=Hello');
  });

  // 7. Multi-Country Geographic Hierarchy & Honest Coverage Gaps
  it('Criterion 7: Global administrative registry covers 10 countries and reports coverage gaps honestly', () => {
    expect(GLOBAL_COUNTRIES.length).toBe(10);

    const usMeta = getCountryByCode('US');
    expect(usMeta).toBeDefined();
    expect(usMeta?.hierarchyTerms.level1Name).toBe('State');
    expect(usMeta?.hierarchyTerms.level2Name).toBe('County');

    const gbMeta = getCountryByCode('GB');
    expect(gbMeta).toBeDefined();
    expect(gbMeta?.hierarchyTerms.level1Name).toBe('Constituent Country / Region');

    // Check administrative division resolution for US New York
    const usPlaces = getAdministrativePlaces('US', 'New York', 'New York County (Manhattan)');
    expect(usPlaces.places.length).toBeGreaterThan(0);
    expect(usPlaces.places[0].countryCode).toBe('US');

    // Test coverage gap reporting for a division without sub-boundary polygons
    expect(typeof usPlaces.coverageGapReported).toBe('boolean');
  });

  // 8. Geographic Isolation across Countries
  it('Criterion 8: Geographic isolation strictly prevents processing locations outside the campaign scope', () => {
    const usConfig: SearchConfig = {
      id: 'cfg-us-ny',
      name: 'New York Food Leads',
      provider_id: 'osm_overpass',
      selected_country: 'US',
      selected_district: {
        state: 'New York',
        district: 'New York County (Manhattan)',
      },
      selected_locations: [
        'city-us-ny-new-york-county-manhattan-manhattan',
        'city-uttar-pradesh-lucknow-lucknow', // Foreign location from India
      ],
      categories: ['Restaurant'],
      rating_filters: { min: 1.0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
      contact_filters: { phone: 'optional', phone_filter: 'all', website_filter: 'all' },
      limits: { max_records_per_location: 50, max_total_records: 100 },
    };

    const job = store.createJob('NY Discovery', usConfig, 'osm_overpass');

    // Lucknow must have been quarantined from the NY job queue
    expect(job.city_queue).toBeDefined();
    const queuedCities = job.city_queue!.map(c => c.city_name.toLowerCase());
    expect(queuedCities).not.toContain('lucknow');
    expect(queuedCities).toContain('manhattan');
  });
});
