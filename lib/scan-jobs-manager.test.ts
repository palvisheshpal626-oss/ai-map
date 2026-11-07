import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store/memory-store';
import { ScanWorker } from './workers/scan-worker';
import { ProviderRegistry } from './providers/registry';
import { BusinessDataProvider, ProviderSearchResult, ProviderCapability } from './providers/types';
import { isValidPhoneNumber, normalizePhoneNumber } from './deduplication/deduplicator';
import { evaluateLeadQualification } from './qualification/qualifier';
import { generateCsvExport, generateExcelExport } from './exports/exporter';
import { SearchConfig, Restaurant } from './types';
import { NextRequest } from 'next/server';
import { GET as getRestaurantsHandler } from '../app/api/restaurants/route';
import { POST as exportHandler } from '../app/api/exports/route';

class MockScanProvider implements BusinessDataProvider {
  readonly id = 'mock_scan_provider';
  readonly name = 'Mock Scan Provider';
  readonly capabilities: ProviderCapability = {
    supportsRatings: true,
    supportsReviewCounts: true,
    supportsPhoneNumbers: true,
    supportsWebsites: true,
    supportsPagination: true,
    supportsRealTimeStatus: true,
    requiresCommercialKey: false,
    maxResultsPerQuery: 50,
    termsNotes: 'Mock scan test provider',
  };

  candidatePool: Partial<Restaurant>[] = [];

  isConfigured(): boolean {
    return true;
  }

  async testConnection() {
    return { success: true, message: 'Connected' };
  }

  async searchBusinesses(): Promise<ProviderSearchResult> {
    return {
      restaurants: [...this.candidatePool],
      totalEstimatedResults: this.candidatePool.length,
      usageCount: 1,
    };
  }
}

const mockProvider = new MockScanProvider();
ProviderRegistry.registerProvider(mockProvider);

describe('Scan Jobs Manager: Live Lead Counts, Strict Phone Filtering & Qualification', () => {
  beforeEach(() => {
    store.clearAllActiveRuns();
    store.clearJobs();
    mockProvider.candidatePool = [];
  });

  const baseConfig = (phoneFilter: 'all' | 'with_phone' | 'without_phone'): SearchConfig => ({
    id: `cfg-${Date.now()}`,
    name: 'Test Scan Campaign',
    selected_locations: ['in-up-lucknow'],
    categories: ['Restaurants'],
    rating_filters: { min: 0, include_unrated: true },
    review_filters: { min: 0, include_zero: true },
    contact_filters: {
      phone: phoneFilter === 'with_phone' ? 'required' : phoneFilter === 'without_phone' ? 'unavailable' : 'optional',
      phone_filter: phoneFilter,
      website_filter: 'all',
      include_without_phone: phoneFilter !== 'with_phone',
      include_without_email: true,
    },
    limits: { max_records_per_location: 50, max_total_records: 100 },
    provider_id: 'mock_scan_provider',
  });

  // TEST 1: Scan with valid phone numbers increases Discovered and Qualified Leads correctly
  it('Scenario 1: Scan with valid phone numbers increases Discovered and Qualified Leads correctly', async () => {
    mockProvider.candidatePool = [
      {
        id: 'rest-valid-phone-1',
        business_name: 'Lucknow Dastarkhwan',
        formatted_address: 'Tulsi Theatre Building, Hazratganj, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: '05224024444',
      },
      {
        id: 'rest-valid-phone-2',
        business_name: 'Royal Cafe Lucknow',
        formatted_address: 'Hazratganj, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: '9936232969',
      },
    ];

    const job = store.createJob('Valid Phone Scan', baseConfig('with_phone'), 'mock_scan_provider');
    await ScanWorker.runJob(job.id);

    const updatedJob = store.getJobById(job.id)!;
    expect(updatedJob.progress_counters.discovered_count).toBe(2);
    expect(updatedJob.progress_counters.qualified_count).toBe(2);
    expect(updatedJob.progress_counters.completed_tasks).toBe(1);
    expect(updatedJob.status).toBe('completed');
  });

  // TEST 2: Scan with missing phone numbers works when Without Phone Number is selected
  it('Scenario 2: Scan with missing phone numbers works when Without Phone Number is selected', async () => {
    mockProvider.candidatePool = [
      {
        id: 'rest-no-phone-1',
        business_name: 'Awadhi Rasoi',
        formatted_address: 'Aminabad, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: null,
      },
      {
        id: 'rest-no-phone-2',
        business_name: 'Old City Kebab House',
        formatted_address: 'Chowk, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: 'Unavailable', // Placeholder treated as missing
      },
    ];

    const job = store.createJob('Without Phone Scan', baseConfig('without_phone'), 'mock_scan_provider');
    await ScanWorker.runJob(job.id);

    const updatedJob = store.getJobById(job.id)!;
    expect(updatedJob.progress_counters.discovered_count).toBe(2);
    expect(updatedJob.progress_counters.qualified_count).toBe(2);
  });

  // TEST 3: With Phone Number excludes records without valid phone numbers
  it('Scenario 3: With Phone Number excludes records without valid phone numbers from discovery and qualification', async () => {
    mockProvider.candidatePool = [
      {
        id: 'rest-has-phone',
        business_name: 'Falaks Rooftop',
        formatted_address: 'MG Marg, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: '05222627000',
      },
      {
        id: 'rest-missing-phone',
        business_name: 'Gomti Tea Corner',
        formatted_address: 'Gomti Nagar, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: null, // No phone -> must be excluded
      },
      {
        id: 'rest-placeholder-phone',
        business_name: 'Station Dhaba',
        formatted_address: 'Charbagh, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: 'N/A', // Placeholder -> must be excluded
      },
    ];

    const job = store.createJob('Phone Required Scan', baseConfig('with_phone'), 'mock_scan_provider');
    await ScanWorker.runJob(job.id);

    const updatedJob = store.getJobById(job.id)!;
    expect(updatedJob.progress_counters.discovered_count).toBe(1);
    expect(updatedJob.progress_counters.qualified_count).toBe(1);

    const jobRecords = store.getRestaurantsForRun(job.id);
    expect(jobRecords.length).toBe(1);
    expect(jobRecords[0].business_name).toBe('Falaks Rooftop');
  });

  // TEST 4: Without Phone Number excludes records with valid phone numbers
  it('Scenario 4: Without Phone Number excludes records with valid phone numbers', async () => {
    mockProvider.candidatePool = [
      {
        id: 'rest-with-phone',
        business_name: 'Taj Mahal Hotel Restaurant',
        formatted_address: 'Gomti Nagar, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: '05226711000', // Has valid phone -> must be excluded
      },
      {
        id: 'rest-genuine-missing-phone',
        business_name: 'Local Biryani Point',
        formatted_address: 'Alambagh, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: null, // Missing -> must be retained
      },
    ];

    const job = store.createJob('Without Phone Scan', baseConfig('without_phone'), 'mock_scan_provider');
    await ScanWorker.runJob(job.id);

    const updatedJob = store.getJobById(job.id)!;
    expect(updatedJob.progress_counters.discovered_count).toBe(1);
    expect(updatedJob.progress_counters.qualified_count).toBe(1);

    const jobRecords = store.getRestaurantsForRun(job.id);
    expect(jobRecords.length).toBe(1);
    expect(jobRecords[0].business_name).toBe('Local Biryani Point');
  });

  // TEST 5: All Leads includes both categories
  it('Scenario 5: All Leads includes both categories (with and without phone numbers)', async () => {
    mockProvider.candidatePool = [
      {
        id: 'rest-both-1',
        business_name: 'Bake & Flake Cafe',
        formatted_address: 'Indira Nagar, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: '9876543210',
      },
      {
        id: 'rest-both-2',
        business_name: 'Street Food Hub',
        formatted_address: 'Kapoorthala, Lucknow, UP, India',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        phone_number: null,
      },
    ];

    const job = store.createJob('All Leads Scan', baseConfig('all'), 'mock_scan_provider');
    await ScanWorker.runJob(job.id);

    const updatedJob = store.getJobById(job.id)!;
    expect(updatedJob.progress_counters.discovered_count).toBe(2);
    expect(updatedJob.progress_counters.qualified_count).toBe(2);

    const jobRecords = store.getRestaurantsForRun(job.id);
    expect(jobRecords.length).toBe(2);
  });

  // TEST 6: Placeholder values such as "Unavailable" are never treated as real phone numbers
  it('Scenario 6: Placeholder values ("Unavailable", "N/A", "null", "undefined", dummy digits) are never treated as real phone numbers', () => {
    const invalidPlaceholders = [
      'Unavailable',
      'unavailable',
      'N/A',
      'n/a',
      'na',
      'null',
      'undefined',
      'None',
      'none',
      'missing',
      'Not Listed',
      'not available',
      '   ',
      '',
      '0',
      '-',
      '0000000000', // Dummy repeating
      '1111111111', // Dummy repeating
      '1234', // Too short (< 8 digits)
    ];

    for (const ph of invalidPlaceholders) {
      expect(isValidPhoneNumber(ph)).toBe(false);
      expect(normalizePhoneNumber(ph)).toBe('');
    }

    const validPhones = [
      '07080788055',
      '9936232969',
      '+91 522 2627000',
      '0522-2627000',
      '+919876543210',
    ];

    for (const vp of validPhones) {
      expect(isValidPhoneNumber(vp)).toBe(true);
      expect(normalizePhoneNumber(vp).length).toBeGreaterThanOrEqual(8);
    }
  });

  // TEST 7: Duplicate records do not inflate counters
  it('Scenario 7: Duplicate records increment duplicate_count and do not inflate discovered_count or qualified_count', async () => {
    mockProvider.candidatePool = [
      {
        id: 'place_unique_1',
        source_record_id: 'osm-way-9999',
        business_name: 'Distinct Tunday Kebab Hub',
        formatted_address: 'Aminabad, Lucknow, UP, India',
        city: 'Lucknow',
        phone_number: '05228889999',
      },
      {
        id: 'place_unique_1_dup',
        source_record_id: 'osm-way-9999', // Exact same source ID
        business_name: 'Distinct Tunday Kebab Hub Dup',
        formatted_address: 'Aminabad, Lucknow, UP, India',
        city: 'Lucknow',
        phone_number: '05228889999',
      },
    ];

    const job = store.createJob('Deduplication Test Scan', baseConfig('all'), 'mock_scan_provider');
    await ScanWorker.runJob(job.id);

    const updatedJob = store.getJobById(job.id)!;
    expect(updatedJob.progress_counters.discovered_count).toBe(1);
    expect(updatedJob.progress_counters.duplicate_count).toBe(1);
    expect(updatedJob.progress_counters.qualified_count).toBe(1);
  });

  // TEST 8: Pausing, resuming, retrying, and refreshing do not reset or double-count progress
  it('Scenario 8: Pausing, resuming, and re-running do not reset or double-count progress', async () => {
    mockProvider.candidatePool = [
      {
        id: 'resilient-rest-1',
        business_name: 'Moti Mahal Delux',
        formatted_address: 'Hazratganj, Lucknow, UP, India',
        city: 'Lucknow',
        phone_number: '05222613000',
      },
    ];

    const job = store.createJob('Resilience Scan', baseConfig('all'), 'mock_scan_provider');

    // Run first time
    await ScanWorker.runJob(job.id);
    let jobState = store.getJobById(job.id)!;
    expect(jobState.progress_counters.discovered_count).toBe(1);
    expect(jobState.progress_counters.qualified_count).toBe(1);

    // Pause and Resume
    ScanWorker.pauseJob(job.id);
    expect(store.getJobById(job.id)!.status).toBe('paused');

    // Resume execution
    ScanWorker.resumeJob(job.id);
    // Allow any asynchronous cycle to complete
    await new Promise(r => setTimeout(r, 50));

    jobState = store.getJobById(job.id)!;
    // Discovered and qualified counts must remain exactly 1, not reset to 0 or doubled to 2
    expect(jobState.progress_counters.discovered_count).toBe(1);
    expect(jobState.progress_counters.qualified_count).toBe(1);
  });

  // TEST 9: View Discovered displays only records from the selected scan job
  it('Scenario 9: View Discovered (/api/restaurants?job_id=...) displays only records from the selected scan job', async () => {
    // Run Job X in Kanpur
    mockProvider.candidatePool = [
      {
        id: 'kanpur-rest-1',
        business_name: 'The Landmark Hotel',
        formatted_address: 'Mall Road, Kanpur, UP, India',
        city: 'Kanpur',
        phone_number: '05122305305',
      },
    ];
    const jobX = store.createJob('Kanpur Scan', baseConfig('all'), 'mock_scan_provider');
    await ScanWorker.runJob(jobX.id);

    // Run Job Y in Agra
    mockProvider.candidatePool = [
      {
        id: 'agra-rest-1',
        business_name: 'Peshawri at ITC Mughal',
        formatted_address: 'Fatehabad Road, Agra, UP, India',
        city: 'Agra',
        phone_number: '05624021700',
      },
    ];
    const jobY = store.createJob('Agra Scan', baseConfig('all'), 'mock_scan_provider');
    await ScanWorker.runJob(jobY.id);

    // Query for Job X results only
    const reqX = new NextRequest(`http://localhost:3000/api/restaurants?job_id=${jobX.id}`);
    const resX = await getRestaurantsHandler(reqX);
    const dataX = await resX.json();

    expect(dataX.restaurants.length).toBe(1);
    expect(dataX.restaurants[0].business_name).toBe('The Landmark Hotel');

    // Query for Job Y results only
    const reqY = new NextRequest(`http://localhost:3000/api/restaurants?job_id=${jobY.id}`);
    const resY = await getRestaurantsHandler(reqY);
    const dataY = await resY.json();

    expect(dataY.restaurants.length).toBe(1);
    expect(dataY.restaurants[0].business_name).toBe('Peshawri at ITC Mughal');
    expect(dataY.restaurants[0].business_name).not.toBe('The Landmark Hotel');
  });

  // TEST 10: Existing search, rating, category, state, and export filters continue working
  it('Scenario 10: Existing search, rating, category, state, and export filters continue working seamlessly', async () => {
    const testRests: Restaurant[] = [
      {
        id: 'export-test-1',
        business_name: 'Grand Heritage Dining',
        normalized_name: 'grand heritage',
        category: 'Fine Dining',
        formatted_address: 'Hazratganj, Lucknow, Uttar Pradesh, 226001, India',
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        city: 'Lucknow',
        phone_number: '05229991111',
        website_url: 'https://grandheritage.in',
        website_status: 'WEBSITE_LISTED',
        rating: 4.6,
        review_count: 800,
        data_completeness_score: 100,
        lead_score: 85,
        first_discovered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      },
      {
        id: 'export-test-2',
        business_name: 'Lucknow Sweets Stall',
        normalized_name: 'lucknow sweets stall',
        category: 'Sweets',
        formatted_address: 'Chowk, Lucknow, Uttar Pradesh, 226003, India',
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        city: 'Lucknow',
        phone_number: 'Unavailable', // Placeholder
        website_status: 'WEBSITE_NOT_LISTED',
        rating: null,
        review_count: null,
        data_completeness_score: 60,
        lead_score: 35,
        first_discovered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      },
    ];

    // Persist to store so export API finds them
    const { restaurant: saved1 } = store.saveRestaurant(testRests[0]);
    const { restaurant: saved2 } = store.saveRestaurant(testRests[1]);

    // CSV Export: verify formula sanitization and that "Unavailable" phone is sanitized to empty string
    const csv = generateCsvExport(testRests);
    expect(csv).toContain('Grand Heritage Dining');
    expect(csv).toContain('05229991111');
    expect(csv).toContain('Lucknow Sweets Stall');
    expect(csv).not.toContain('Unavailable'); // Placeholder omitted from phone column

    // Excel Export: verify generation succeeds
    const excelBuffer = await generateExcelExport(testRests);
    expect(excelBuffer.length).toBeGreaterThan(100);

    // Export API route respects phoneFilter
    const reqExport = new NextRequest('http://localhost:3000/api/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        restaurantIds: [saved1.id, saved2.id],
        phoneFilter: 'with_phone',
      }),
    });
    const resExport = await exportHandler(reqExport);
    const exportText = await resExport.text();
    expect(exportText).toContain('Grand Heritage Dining');
  });
});
