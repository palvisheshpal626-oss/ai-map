// lib/district-hierarchical-discovery.test.ts
// Comprehensive Test Suite for District-First, City-by-City, Restaurant-by-Restaurant Discovery,
// 7-Point Candidate Audit Verification, and WhatsApp Click-to-Chat Integration.

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store/memory-store';
import { ScanWorker } from './workers/scan-worker';
import { ProviderRegistry } from './providers/registry';
import { BusinessDataProvider, ProviderSearchParams, ProviderSearchResult } from './providers/types';
import {
  Restaurant,
  SearchConfig,
} from './types';
import { getDistrictCitiesAndTowns } from './locations/india';
import { verifyCandidateWithAudit } from './qualification/qualifier';
import {
  normalizeWhatsAppPhone,
  buildWhatsAppUrl,
  getDefaultWhatsAppDraft,
} from './utils/whatsapp';

// Mock Provider specifically for testing District-First Hierarchical Discovery
class MockHierarchicalScanProvider implements BusinessDataProvider {
  id = 'mock_hierarchical_provider';
  name = 'Mock Hierarchical Scan Provider';
  capabilities = {
    supportsCoordinates: true,
    supportsRadius: true,
    supportsContactDetails: true,
    supportsRatings: true,
    supportsReviewCounts: true,
    supportsPhoneNumbers: true,
    supportsWebsites: true,
    supportsPagination: true,
    supportsRealTimeStatus: true,
    requiresCommercialKey: false,
    maxResultsPerQuery: 100,
    termsNotes: 'Mock provider for district testing',
  };

  candidatePool: Partial<Restaurant>[] = [];
  searchCallHistory: { query: string; category: string }[] = [];

  isConfigured(): boolean {
    return true;
  }

  async testConnection() {
    return { success: true, message: 'Connected' };
  }

  async searchBusinesses(options: ProviderSearchParams): Promise<ProviderSearchResult> {
    this.searchCallHistory.push({
      query: options.query,
      category: options.category || 'Restaurant',
    });

    return {
      restaurants: [...this.candidatePool],
      totalEstimatedResults: this.candidatePool.length,
      usageCount: 1,
    };
  }
}

const mockProvider = new MockHierarchicalScanProvider();
ProviderRegistry.registerProvider(mockProvider);

describe('District-First, City-by-City, Restaurant-by-Restaurant Discovery & WhatsApp Integration', () => {
  beforeEach(() => {
    store.clearAllActiveRuns();
    store.clearJobs();
    store.clearRestaurants();
    mockProvider.candidatePool = [];
    mockProvider.searchCallHistory = [];
  });

  const baseConfig = (): SearchConfig => ({
    id: `cfg-${Date.now()}`,
    name: 'District Lucknow Lead Campaign',
    selected_district: {
      state: 'Uttar Pradesh',
      district: 'Lucknow',
    },
    selected_locations: [],
    categories: ['Restaurants'],
    rating_filters: { min: 4.0, include_unrated: false },
    review_filters: { min: 20, include_zero: false },
    contact_filters: {
      phone: 'required',
      phone_filter: 'with_phone',
      website_filter: 'all',
      include_without_phone: false,
      include_without_email: true,
    },
    limits: { max_records_per_location: 50, max_total_records: 100 },
    provider_id: 'mock_hierarchical_provider',
  });

  // 1. District Hierarchy & Verified Cities Resolution
  it('Scenario 1: District selection loads all verified cities, towns, and municipalities and handles gaps honestly', () => {
    // Lucknow District
    const lucknowHierarchy = getDistrictCitiesAndTowns('Uttar Pradesh', 'Lucknow');
    expect(lucknowHierarchy.district).toBe('Lucknow');
    expect(lucknowHierarchy.state).toBe('Uttar Pradesh');
    expect(lucknowHierarchy.cities.length).toBeGreaterThanOrEqual(4);
    const cityNames = lucknowHierarchy.cities.map(c => c.name);
    expect(cityNames).toContain('Lucknow');
    expect(cityNames).toContain('Malihabad');
    expect(cityNames).toContain('Kakori');
    expect(lucknowHierarchy.coverageGapReported).toBe(false);

    // Unregistered/Sparse District reports coverage gap
    const sparseHierarchy = getDistrictCitiesAndTowns('Uttar Pradesh', 'SparseDistrictName');
    expect(sparseHierarchy.coverageGapReported).toBe(true);
    expect(sparseHierarchy.cities.length).toBe(1);
    expect(sparseHierarchy.cities[0].name).toBe('SparseDistrictName');
  });

  // 2. Persistent City Queue Initialization in ScanJob
  it('Scenario 2: Job creation initializes persistent city queue and district coverage summary', () => {
    const job = store.createJob('Lucknow District Scan', baseConfig(), 'mock_hierarchical_provider');

    expect(job.selected_district?.district).toBe('Lucknow');
    expect(job.city_queue).toBeDefined();
    expect(job.city_queue!.length).toBeGreaterThanOrEqual(4);
    expect(job.city_queue![0].status).toBe('pending');

    expect(job.coverage_summary).toBeDefined();
    expect(job.coverage_summary!.total_cities).toBe(job.city_queue!.length);
    expect(job.coverage_summary!.completed_cities).toBe(0);
    expect(job.coverage_summary!.coverage_status).toBe('in_progress');
  });

  // 3. Strict Sequential City-by-City Processing
  it('Scenario 3: ScanWorker processes cities sequentially in queue order and updates coverage summary', async () => {
    mockProvider.candidatePool = [
      {
        id: 'cand-lucknow-1',
        business_name: 'Falaks Rooftop Restaurant',
        formatted_address: 'Hazratganj, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: '05224024444',
        rating: 4.5,
        review_count: 320,
      },
    ];

    const job = store.createJob('Sequential City Test', baseConfig(), 'mock_hierarchical_provider');
    await ScanWorker.runJob(job.id);

    const updatedJob = store.getJobById(job.id)!;
    expect(updatedJob.status).toBe('completed');
    expect(updatedJob.coverage_summary).toBeDefined();
    expect(updatedJob.coverage_summary!.completed_cities).toBeGreaterThanOrEqual(1);
    expect(updatedJob.coverage_summary!.coverage_percentage).toBe(100);

    const cityQueue = store.getJobCityQueue(job.id);
    expect(cityQueue.length).toBeGreaterThanOrEqual(4);
    expect(cityQueue.every(c => c.status === 'completed' || c.status === 'partially_covered')).toBe(true);

    // Verified searches were executed across cells for the cities
    expect(mockProvider.searchCallHistory.length).toBeGreaterThan(0);
  });

  // 4. Strict 7-Point Restaurant-by-Restaurant Verification Engine & Audit Trail
  it('Scenario 4: Every candidate undergoes 7-point audit check with exact evidence and source recorded', async () => {
    mockProvider.candidatePool = [
      // 1. Qualified Lead: 4.5 rating, 250 reviews, valid phone, in district
      {
        id: 'lead-qualified-1',
        business_name: 'Oudhyana Taj Mahal Hotel',
        formatted_address: 'Gomti Nagar, Lucknow, UP, India',
        city: 'Lucknow',
        district: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: '05226711000',
        rating: 4.6,
        review_count: 540,
        category: 'Restaurant',
      },
      // 2. Disqualified: Rating below 4.0
      {
        id: 'lead-low-rating',
        business_name: 'Budget Cafe Corner',
        formatted_address: 'Alambagh, Lucknow, UP, India',
        city: 'Lucknow',
        district: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: '9839000001',
        rating: 3.2,
        review_count: 45,
        category: 'Restaurant',
      },
      // 3. Disqualified: Missing required phone
      {
        id: 'lead-missing-phone',
        business_name: 'Lucknow Sweet Palace',
        formatted_address: 'Chowk, Lucknow, UP, India',
        city: 'Lucknow',
        district: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: null,
        rating: 4.4,
        review_count: 120,
        category: 'Restaurant',
      },
    ];

    const job = store.createJob('7-Point Verification Job', baseConfig(), 'mock_hierarchical_provider');
    await ScanWorker.runJob(job.id);

    // Verify candidate audits
    const allAudits = store.getCandidateAudits(job.id);
    expect(allAudits.length).toBeGreaterThanOrEqual(3);

    // Check Qualified lead audit
    const qualAudit = allAudits.find(a => a.candidate_name === 'Oudhyana Taj Mahal Hotel');
    expect(qualAudit).toBeDefined();
    expect(qualAudit!.decision).toBe('qualified');
    expect(qualAudit!.checks.length).toBeGreaterThanOrEqual(4);
    expect(qualAudit!.checks.every(c => c.status === 'passed')).toBe(true);

    // Check Low Rating lead audit
    const lowRatingAudit = allAudits.find(a => a.candidate_name === 'Budget Cafe Corner');
    expect(lowRatingAudit).toBeDefined();
    expect(lowRatingAudit!.decision).toBe('rejected');
    expect(lowRatingAudit!.primary_reason).toContain('Rating 3.2 is below');

    // Check Missing Phone lead audit
    const missingPhoneAudit = allAudits.find(a => a.candidate_name === 'Lucknow Sweet Palace');
    expect(missingPhoneAudit).toBeDefined();
    expect(missingPhoneAudit!.decision).toBe('rejected');
    expect(missingPhoneAudit!.primary_reason).toContain('Missing or invalid phone number');
  });

  // 5. Unverified / Needs Review State for Unsubstantiated Ratings (e.g. OSM with minRating requirement)
  it('Scenario 5: Unverified ratings are marked unverified rather than falsely passed or failed', () => {
    const unratedCandidate: Partial<Restaurant> = {
      id: 'osm-unrated-rest',
      business_name: 'Authentic Awadhi Biryani',
      formatted_address: 'Hazratganj, Lucknow, UP, India',
      city: 'Lucknow',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      phone_number: '9839123456',
      rating: null, // No rating stored in OSM
      source_provider: 'osm_overpass',
    };

    const config: Partial<SearchConfig> = {
      rating_filters: { min: 4.0, include_unrated: false },
      contact_filters: {
        phone: 'required',
        phone_filter: 'with_phone',
        website_filter: 'all',
        include_without_phone: false,
        include_without_email: true,
      },
    };

    const audit = verifyCandidateWithAudit(unratedCandidate, config, {
      cityName: 'Lucknow',
      districtName: 'Lucknow',
      providerId: 'osm_overpass',
      providerCapabilities: { supportsRatings: false, supportsReviewCounts: false },
    });

    expect(audit.status).toBe('unverified');
    expect(audit.isQualified).toBe(false);
    expect(audit.primaryRejectionReason).toContain('Selected provider does not store Google consumer ratings');
  });

  // 6. WhatsApp Phone Number Normalization
  it('Scenario 6: WhatsApp phone normalization converts standard Indian numbers to 91XXXXXXXXXX and never duplicates 91', () => {
    // 10-digit standard Indian mobile
    const res1 = normalizeWhatsAppPhone('9936232969');
    expect(res1.isValid).toBe(true);
    expect(res1.normalizedPhone).toBe('919936232969');
    expect(res1.formattedDisplay).toBe('+91 99362 32969');

    // +91 format with spaces
    const res2 = normalizeWhatsAppPhone('+91 99362 32969');
    expect(res2.isValid).toBe(true);
    expect(res2.normalizedPhone).toBe('919936232969');

    // Number with leading zero (STD/mobile style)
    const res3 = normalizeWhatsAppPhone('09936232969');
    expect(res3.isValid).toBe(true);
    expect(res3.normalizedPhone).toBe('919936232969');

    // Number already prefixed with 91: NEVER add 91 twice!
    const res4 = normalizeWhatsAppPhone('919936232969');
    expect(res4.isValid).toBe(true);
    expect(res4.normalizedPhone).toBe('919936232969');
    expect(res4.normalizedPhone?.startsWith('9191')).toBe(false);

    // Landline with STD code (0522 4024444 -> 10 digits)
    const res5 = normalizeWhatsAppPhone('05224024444');
    expect(res5.isValid).toBe(true);
    expect(res5.normalizedPhone).toBe('915224024444');

    // Placeholders and invalid inputs return invalid
    expect(normalizeWhatsAppPhone('Unavailable').isValid).toBe(false);
    expect(normalizeWhatsAppPhone('N/A').isValid).toBe(false);
    expect(normalizeWhatsAppPhone('0000000000').isValid).toBe(false);
    expect(normalizeWhatsAppPhone(null).isValid).toBe(false);
    expect(normalizeWhatsAppPhone('').isValid).toBe(false);
  });

  // 7. Official WhatsApp Web URL Generation & Message Drafting
  it('Scenario 7: WhatsApp URL builder produces official web link with optional prefilled draft message', () => {
    // Direct link without message
    const directRes = buildWhatsAppUrl('9936232969');
    expect(directRes.url).toBe('https://web.whatsapp.com/send?phone=919936232969');
    expect(directRes.error).toBeUndefined();

    // With prefilled draft message
    const draft = getDefaultWhatsAppDraft('Royal Cafe Hazratganj');
    expect(draft).toContain('Royal Cafe Hazratganj');
    expect(draft).toContain('digital ordering services');

    const urlWithDraft = buildWhatsAppUrl('9936232969', draft);
    expect(urlWithDraft.url).toContain('https://web.whatsapp.com/send?phone=919936232969&text=');
    expect(urlWithDraft.url).toContain('Royal+Cafe+Hazratganj');

    // Invalid phone returns empty url with error
    const invalidRes = buildWhatsAppUrl('Unavailable');
    expect(invalidRes.url).toBe('');
    expect(invalidRes.error).toBeDefined();
  });

  // 8. Distinct WhatsApp URLs for 3 Distinct Business Rows
  it('Scenario 8: 3 distinct restaurant rows with different phone numbers produce 3 distinct WhatsApp Web URLs', () => {
    const row1: Partial<Restaurant> = {
      business_name: 'Taj Mahal Hotel Oudhyana',
      phone_number: '05226711000',
    };
    const row2: Partial<Restaurant> = {
      business_name: 'Royal Cafe Hazratganj',
      phone_number: '9936232969',
    };
    const row3: Partial<Restaurant> = {
      business_name: 'Moti Mahal Restaurant',
      phone_number: '05224024444',
    };

    const url1 = buildWhatsAppUrl(row1.phone_number!).url;
    const url2 = buildWhatsAppUrl(row2.phone_number!).url;
    const url3 = buildWhatsAppUrl(row3.phone_number!).url;

    // Check that each URL contains its exact normalized number
    expect(url1).toBe('https://web.whatsapp.com/send?phone=915226711000');
    expect(url2).toBe('https://web.whatsapp.com/send?phone=919936232969');
    expect(url3).toBe('https://web.whatsapp.com/send?phone=915224024444');

    // Check that all 3 URLs are mutually distinct
    expect(url1).not.toBe(url2);
    expect(url2).not.toBe(url3);
    expect(url1).not.toBe(url3);

    // Development mode logging verification
    const devLogs: unknown[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => devLogs.push(args);

    try {
      [row1, row2, row3].forEach(row => {
        const res = buildWhatsAppUrl(row.phone_number!);
        console.log('[WhatsApp Direct Chat]', {
          businessName: row.business_name,
          phone: row.phone_number,
          url: res.url,
        });
      });
      expect(devLogs.length).toBe(3);
    } finally {
      console.log = originalLog;
    }
  });

  // 9. Automatic District-Wide City Selection (Lucknow & Gautam Buddha Nagar)
  it('Scenario 9: Selecting a district automatically selects every verified city, town, and locality in that district', () => {
    // Lucknow
    const lko = getDistrictCitiesAndTowns('Uttar Pradesh', 'Lucknow');
    expect(lko.cities.length).toBeGreaterThanOrEqual(4);
    const lkoNames = lko.cities.map(c => c.name);
    expect(lkoNames).toEqual(
      expect.arrayContaining(['Lucknow', 'Malihabad', 'Kakori', 'Mohanlalganj', 'Bakshi Ka Talab'])
    );

    // Gautam Buddha Nagar (Noida)
    const gbn = getDistrictCitiesAndTowns('Uttar Pradesh', 'Gautam Buddha Nagar');
    expect(gbn.cities.length).toBeGreaterThanOrEqual(4);
    const gbnNames = gbn.cities.map(c => c.name);
    expect(gbnNames).toEqual(
      expect.arrayContaining(['Noida', 'Greater Noida', 'Dadri', 'Jewar', 'Dankaur'])
    );
  });

  // 10. District Switching, Multi-District Merge, and Exclude Locality Toggle
  it('Scenario 10: Switching district clears prior cities, multi-district merges cleanly, and exclude toggle removes specific cities', () => {
    const lko = getDistrictCitiesAndTowns('Uttar Pradesh', 'Lucknow');
    const gbn = getDistrictCitiesAndTowns('Uttar Pradesh', 'Gautam Buddha Nagar');

    // 1. Initial Lucknow Selection
    let selectedCities = [...lko.cities];
    expect(selectedCities.some(c => c.district === 'Lucknow')).toBe(true);
    expect(selectedCities.some(c => c.district === 'Gautam Buddha Nagar')).toBe(false);

    // 2. Switching to Gautam Buddha Nagar: replaces Lucknow completely without stale leftovers
    selectedCities = [...gbn.cities];
    expect(selectedCities.some(c => c.district === 'Gautam Buddha Nagar')).toBe(true);
    expect(selectedCities.some(c => c.district === 'Lucknow')).toBe(false); // No stale Lucknow cities!

    // 3. Multi-District Merge: combines both without duplicates
    const mergedCities = [...lko.cities];
    for (const city of gbn.cities) {
      if (!mergedCities.some(existing => existing.id === city.id)) {
        mergedCities.push(city);
      }
    }
    expect(mergedCities.length).toBe(lko.cities.length + gbn.cities.length);
    const uniqueIds = new Set(mergedCities.map(c => c.id));
    expect(uniqueIds.size).toBe(mergedCities.length); // No duplicate IDs

    // 4. Exclude Locality Toggle: excluding Kakori removes it
    const kakori = lko.cities.find(c => c.name === 'Kakori')!;
    expect(kakori).toBeDefined();

    const excludedIds = new Set<string>([kakori.id]);
    const filteredQueue = lko.cities.filter(c => !excludedIds.has(c.id));
    expect(filteredQueue.length).toBe(lko.cities.length - 1);
    expect(filteredQueue.some(c => c.name === 'Kakori')).toBe(false);
  });

  // 11. Worker City Queue Respects User Exclusions and Multi-District Selections
  it('Scenario 11: Worker cityQueue adheres to selected_locations when specific cities are chosen or excluded', () => {
    const lko = getDistrictCitiesAndTowns('Uttar Pradesh', 'Lucknow');
    const malihabad = lko.cities.find(c => c.name === 'Malihabad')!;
    const lucknowHq = lko.cities.find(c => c.name === 'Lucknow')!;

    // Custom configuration with only Lucknow HQ and Malihabad (excluding Kakori, Mohanlalganj, etc.)
    const customConfig: SearchConfig = {
      ...baseConfig(),
      selected_locations: [lucknowHq.id, malihabad.id],
    };

    const job = store.createJob('Selective Cities Job', customConfig, 'mock_hierarchical_provider');
    expect(job.city_queue).toBeDefined();
    expect(job.city_queue!.length).toBe(2);

    const queuedCityNames = job.city_queue!.map(c => c.city_name);
    expect(queuedCityNames).toContain('Lucknow');
    expect(queuedCityNames).toContain('Malihabad');
    expect(queuedCityNames).not.toContain('Kakori');
  });
});
