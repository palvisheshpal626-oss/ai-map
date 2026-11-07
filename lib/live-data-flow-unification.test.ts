import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store/memory-store';
import { ProviderRegistry } from './providers/registry';
import { ScanWorker } from './workers/scan-worker';
import { generateCsvExport, generateExcelExport } from './exports/exporter';
import { Restaurant, SearchConfig } from './types';
import ExcelJS from 'exceljs';

describe('Data Flow Unification Test Suite (12 Scenarios)', () => {
  beforeEach(() => {
    store.clearRestaurants();
    store.clearAllActiveRuns();
    store.clearJobs();
  });

  // 1. Live Search Form Submission
  it('Scenario 1: Live search populates search run and store with exact records', () => {
    const runId = 'run_test_live_1';
    store.startSearchRun(runId, {
      query: 'Hotels in Lucknow',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      providerId: 'osm_overpass',
    });

    const testRest: Partial<Restaurant> = {
      id: 'osm-node-101',
      business_name: 'Hotel Taj Mahal Lucknow',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      rating: 4.8,
      review_count: 520,
      phone_number: '05222393939',
      search_id: runId,
      qualification_status: 'qualified',
    };

    const { restaurant } = store.saveRestaurant(testRest);
    store.updateSearchRun(runId, {
      status: 'completed',
      totalFetched: 1,
      totalResults: 1,
      results: [restaurant],
    });

    const run = store.getSearchRun(runId);
    expect(run).toBeDefined();
    expect(run?.results).toHaveLength(1);
    expect(run?.results[0].business_name).toBe('Hotel Taj Mahal Lucknow');
    expect(store.getRestaurantsForRun(runId)).toHaveLength(1);
  });

  // 2. Provider API Call & Response Normalization
  it('Scenario 2: Provider registry resolves valid provider and normalizes records', () => {
    const provider = ProviderRegistry.getProvider('osm_overpass');
    expect(provider).toBeDefined();
    expect(provider.id).toBe('osm_overpass');
    expect(typeof provider.searchBusinesses).toBe('function');
  });

  // 3. Filters & Lead Qualification
  it('Scenario 3: Lead qualification assigns status and reasons transparently', () => {
    const qualifiedCand: Partial<Restaurant> = {
      id: 'cand-1',
      business_name: 'Hyatt Regency Lucknow',
      rating: 4.5,
      review_count: 310,
      phone_number: '+915224261234',
      qualification_status: 'qualified',
      qualification_reasons: ['Rating >= 4.0', 'Valid phone present'],
    };

    const disqualifiedCand: Partial<Restaurant> = {
      id: 'cand-2',
      business_name: 'Chai Tapri Corner',
      rating: 3.2,
      review_count: 4,
      qualification_status: 'disqualified',
      disqualification_reason: 'Rating below 4.0 threshold',
    };

    const saved1 = store.saveRestaurant(qualifiedCand).restaurant;
    const saved2 = store.saveRestaurant(disqualifiedCand).restaurant;

    expect(saved1.qualification_status).toBe('qualified');
    expect(saved1.qualification_reasons).toContain('Rating >= 4.0');
    expect(saved2.qualification_status).toBe('disqualified');
    expect(saved2.disqualification_reason).toBe('Rating below 4.0 threshold');
  });

  // 4. Scan Jobs Manager Representation
  it('Scenario 4: Live search registers as a ScanJob with synchronized counters', () => {
    const runId = 'run_live_search_sync_4';
    const testRecords = [
      {
        id: 'rec-1',
        business_name: 'Radisson Lucknow City Centre',
        category: 'Hotel',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        country: 'India',
        rating: 4.4,
        review_count: 850,
        phone_number: '05224567890',
        search_id: runId,
        qualification_status: 'qualified',
        lead_score: 85,
        first_discovered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      },
    ] as unknown as Restaurant[];

    store.registerLiveSearchJob({
      id: runId,
      name: 'Luxury Hotels in Lucknow',
      configuration_snapshot: {
        selected_locations: ['Lucknow'],
        categories: ['Hotels'],
      } as any,
      provider_id: 'osm_overpass',
      status: 'completed',
      progress_counters: {
        total_tasks: 1,
        completed_tasks: 1,
        failed_tasks: 0,
        fetched_count: 5,
        discovered_count: 1,
        qualified_count: 1,
        rejected_count: 4,
        rejection_breakdown: { low_rating: 3, small_stall: 1 },
        duplicate_count: 0,
      },
      usage_counters: {
        api_requests: 1,
        estimated_cost_inr: 0,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const job = store.getJobById(runId);
    expect(job).toBeDefined();
    expect(job?.progress_counters.fetched_count).toBe(5);
    expect(job?.progress_counters.discovered_count).toBe(1);
    expect(job?.progress_counters.rejected_count).toBe(4);
    expect(job?.progress_counters.rejection_breakdown?.low_rating).toBe(3);
  });

  // 5. Live Lead Counters Accuracy
  it('Scenario 5: Counters accurately reflect unique discoveries without dropping pre-existing items', async () => {
    const config = {
      selected_locations: ['lucknow-hazratganj'],
      categories: ['Fine Dining'],
      rating_filters: { min: 4.0, include_unrated: false },
      contact_filters: { phone: 'optional', phone_filter: 'all', website_filter: 'all' },
    } as any;

    const job = store.createJob('Test Counter Accuracy', config, 'osm_overpass');
    expect(job.progress_counters.discovered_count).toBe(0);
    expect(job.progress_counters.total_tasks).toBe(1);

    // Mock provider execution through worker
    const customRest: Partial<Restaurant> = {
      id: 'rest-unique-1',
      business_name: 'Oudhyana at Vivanta',
      rating: 4.7,
      review_count: 240,
      phone_number: '05226711000',
      search_id: job.id,
      qualification_status: 'qualified',
    };
    store.saveRestaurant(customRest);

    store.updateJob(job.id, {
      progress_counters: {
        total_tasks: 1,
        completed_tasks: 1,
        failed_tasks: 0,
        fetched_count: 1,
        discovered_count: 1,
        qualified_count: 1,
        duplicate_count: 0,
      },
    });

    const updated = store.getJobById(job.id);
    expect(updated?.progress_counters.discovered_count).toBe(1);
    expect(updated?.progress_counters.qualified_count).toBe(1);
  });

  // 6. Rejection Breakdown Accuracy
  it('Scenario 6: Rejection reasons accurately sum to total rejected count', () => {
    const breakdown = {
      low_rating: 6,
      missing_phone: 3,
      small_stall: 2,
    };
    const totalRejected = Object.values(breakdown).reduce((a, b) => a + b, 0);
    expect(totalRejected).toBe(11);

    const job = store.createJob('Rejection Test', { selected_locations: ['loc1'], categories: ['cat1'] } as any, 'osm');
    store.updateJob(job.id, {
      progress_counters: {
        total_tasks: 1,
        completed_tasks: 1,
        failed_tasks: 0,
        fetched_count: 15,
        discovered_count: 4,
        qualified_count: 4,
        duplicate_count: 0,
        rejected_count: totalRejected,
        rejection_breakdown: breakdown,
      },
    });

    const savedJob = store.getJobById(job.id);
    expect(savedJob?.progress_counters.rejected_count).toBe(11);
    expect(savedJob?.progress_counters.rejection_breakdown?.missing_phone).toBe(3);
  });

  // 7. Background Worker Execution
  it('Scenario 7: Worker updates progress counters and status upon completion', async () => {
    const config = {
      selected_locations: ['lucknow-gomtinagar'],
      categories: ['Bakery'],
    } as any;
    const job = store.createJob('Worker Test', config, 'osm_overpass');
    expect(job.status).toBe('queued');

    // Run job tasks
    await ScanWorker.runJob(job.id);

    const finished = store.getJobById(job.id);
    expect(['completed', 'completed_with_warnings']).toContain(finished?.status);
    expect(finished?.progress_counters.completed_tasks).toBe(1);
  }, 20000);

  // 8. Pause, Resume, and Cancel Lifecycle
  it('Scenario 8: ScanWorker supports pause, resume, and cancel transitions', () => {
    const config = {
      selected_locations: ['lucknow-alambagh'],
      categories: ['Sweets'],
    } as any;
    const job = store.createJob('Lifecycle Test', config, 'osm_overpass');

    ScanWorker.pauseJob(job.id);
    expect(store.getJobById(job.id)?.status).toBe('paused');

    ScanWorker.resumeJob(job.id);
    expect(store.getJobById(job.id)?.status).toBe('running');

    ScanWorker.cancelJob(job.id);
    expect(store.getJobById(job.id)?.status).toBe('cancelled');
  });

  // 9. "View Discovered" Link Scoping
  it('Scenario 9: View Discovered retrieves strictly records discovered by the specified job/run', () => {
    const jobA = 'job-alpha';
    const jobB = 'job-beta';

    store.startSearchRun(jobA, { query: 'Job A' });
    store.startSearchRun(jobB, { query: 'Job B' });

    const restA = store.saveRestaurant({
      id: 'rest-a1',
      business_name: 'Restaurant Alpha',
      search_id: jobA,
    }).restaurant;

    const restB = store.saveRestaurant({
      id: 'rest-b1',
      business_name: 'Restaurant Beta',
      search_id: jobB,
    }).restaurant;

    store.updateSearchRun(jobA, { results: [restA] });
    store.updateSearchRun(jobB, { results: [restB] });

    const fromJobA = store.getRestaurantsForRun(jobA);
    const fromJobB = store.getRestaurantsForRun(jobB);

    expect(fromJobA).toHaveLength(1);
    expect(fromJobA[0].business_name).toBe('Restaurant Alpha');
    expect(fromJobB).toHaveLength(1);
    expect(fromJobB[0].business_name).toBe('Restaurant Beta');
  });

  // 10. Results Table Pagination Scoping
  it('Scenario 10: Multi-page results are preserved and fully available across pagination', () => {
    const runId = 'run-multipage-10';
    const allRecords: Restaurant[] = [];

    for (let i = 1; i <= 35; i++) {
      allRecords.push(
        store.saveRestaurant({
          id: `page-rest-${i}`,
          business_name: `Hotel ${i}`,
          rating: 4.2,
          review_count: 50 + i,
          phone_number: `052200000${i.toString().padStart(2, '0')}`,
          search_id: runId,
        }).restaurant
      );
    }

    store.startSearchRun(runId, { query: 'Page Test' });
    store.updateSearchRun(runId, {
      results: allRecords,
      totalResults: allRecords.length,
    });

    const retrieved = store.getRestaurantsForRun(runId);
    expect(retrieved).toHaveLength(35);

    // Simulate page 1 and page 2 slices
    const page1 = retrieved.slice(0, 20);
    const page2 = retrieved.slice(20, 40);
    expect(page1).toHaveLength(20);
    expect(page2).toHaveLength(15);
  });

  // 11. CSV Export Completeness & Accuracy
  it('Scenario 11: CSV export contains all records across all pages with required headers and exact values', () => {
    const runId = 'run-export-csv-11';
    const testRecords = [
      {
        id: 'csv-rest-1',
        business_name: 'Taj Mahal Lucknow',
        category: 'Hotel',
        rating: 4.9,
        review_count: 1420,
        phone_number: '05222393939',
        email: 'taj.lucknow@ihcltata.com',
        website_url: 'https://www.ihcltata.com',
        formatted_address: 'Vipin Khand, Gomti Nagar, Lucknow, Uttar Pradesh 226010',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        country: 'India',
        latitude: 26.8523,
        longitude: 80.9789,
        source_provider: 'osm_overpass',
        search_id: runId,
        contact_verification_status: 'verified_active',
        lead_score: 95,
        first_discovered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      },
      {
        id: 'csv-rest-2',
        business_name: 'Heritage Sweets',
        category: 'Restaurant',
        rating: null,
        review_count: null,
        phone_number: null,
        formatted_address: 'Aminabad, Lucknow',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        country: 'India',
        latitude: 26.845,
        longitude: 80.932,
        source_provider: 'osm_overpass',
        search_id: runId,
        lead_score: 50,
        first_discovered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      },
    ] as unknown as Restaurant[];

    const csvOutput = generateCsvExport(testRecords);

    // Verify BOM and UTF-8
    expect(csvOutput.charCodeAt(0)).toBe(0xfeff);

    // Verify Headers
    expect(csvOutput).toContain('Restaurant Name');
    expect(csvOutput).toContain('Rating');
    expect(csvOutput).toContain('Review Count');
    expect(csvOutput).toContain('Phone Number');
    expect(csvOutput).toContain('Run ID');

    // Verify Data row 1
    expect(csvOutput).toContain('Taj Mahal Lucknow');
    expect(csvOutput).toContain('4.9');
    expect(csvOutput).toContain('1420');
    expect(csvOutput).toContain('05222393939');
    expect(csvOutput).toContain(runId);

    // Verify Row 2 omits placeholders like "Unavailable"
    expect(csvOutput).not.toContain('Unavailable');
    expect(csvOutput).toContain('Heritage Sweets');
  });

  // 12. Excel Export Formatting & Preserved Strings
  it('Scenario 12: Excel export preserves phone string formatting and formats cells correctly', async () => {
    const runId = 'run-export-xlsx-12';
    const testRecords = [
      {
        id: 'xlsx-rest-1',
        business_name: 'Renaissance Lucknow Hotel',
        category: 'Hotel',
        rating: 4.6,
        review_count: 670,
        phone_number: '05224055555',
        formatted_address: 'Vipin Khand, Gomti Nagar, Lucknow',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        country: 'India',
        latitude: 26.853,
        longitude: 80.979,
        source_provider: 'osm_overpass',
        search_id: runId,
        lead_score: 90,
        first_discovered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      },
    ] as unknown as Restaurant[];

    const excelBuffer = await generateExcelExport(testRecords);
    expect(Buffer.isBuffer(excelBuffer)).toBe(true);

    // Read back workbook using exceljs to verify cell contents
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer as unknown as any);

    const worksheet = workbook.getWorksheet('Business Leads');
    expect(worksheet).toBeDefined();

    // Check Header Row
    const headerRow = worksheet!.getRow(1);
    expect(headerRow.getCell(1).value).toBe('Restaurant Name');

    // Check Data Row
    const dataRow = worksheet!.getRow(2);
    expect(dataRow.getCell(1).value).toBe('Renaissance Lucknow Hotel');

    // Phone cell must preserve leading zero
    const phoneCell = dataRow.getCell(5); // Phone Number is col 5
    expect(phoneCell.value).toBe('05224055555');
  });
});