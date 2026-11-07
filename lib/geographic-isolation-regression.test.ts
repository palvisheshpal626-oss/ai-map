// lib/geographic-isolation-regression.test.ts
// Regression Test Suite: Geographic Isolation, Queue Integrity, and Provider Reconcilation

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store/memory-store';
import { ScanWorker } from './workers/scan-worker';
import { SearchConfig, ScanJob } from './types';
import { findVerifiedCityById, getDistrictCitiesAndTowns, isLocationInDistrict } from './locations/india';
import { OpenStreetMapOverpassProvider } from './providers/osm-overpass';

describe('Geographic Isolation and Queue Integrity Regression Suite', () => {
  beforeEach(() => {
    store.clearJobs();
    store.clearRestaurants();
  });

  // TEST 1: Kargil Campaign Never Contains Lucknow Locations
  it('Regression 1: Kargil, Ladakh campaign strictly excludes Lucknow locations even if passed in selected_locations', () => {
    // Attempt to pass cross-polluted locations (7 Lucknow + 2 Leh + 3 Kargil)
    const mixedLocationIds = [
      'city-uttar-pradesh-lucknow-lucknow',
      'city-uttar-pradesh-lucknow-malihabad',
      'city-uttar-pradesh-lucknow-kakori',
      'city-uttar-pradesh-lucknow-mohanlalganj',
      'city-uttar-pradesh-lucknow-bakshi-ka-talab',
      'city-uttar-pradesh-lucknow-gosainganj',
      'city-uttar-pradesh-lucknow-itaunja',
      'city-ladakh-leh-leh',
      'city-ladakh-leh-nubra',
      'city-ladakh-kargil-kargil',
      'city-ladakh-kargil-drass',
      'city-ladakh-kargil-zanskar',
    ];

    const kargilConfig: SearchConfig = {
      id: 'config-kargil-test',
      name: 'Kargil Dining Leads',
      selected_district: {
        state: 'Ladakh',
        district: 'Kargil',
      },
      selected_locations: mixedLocationIds,
      categories: ['Restaurant', 'Cafe'],
      rating_filters: { min: 0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
      contact_filters: { phone: 'optional', website_filter: 'all', include_without_phone: true, include_without_email: true },
      limits: { max_records_per_location: 60, max_total_records: 150 },
      provider_id: 'osm_overpass',
    };

    const job = store.createJob('Kargil Campaign', kargilConfig, 'osm_overpass');

    // 1. Verify job district
    expect(job.selected_district?.district).toBe('Kargil');
    expect(job.selected_district?.state).toBe('Ladakh');

    // 2. Verify city queue has ONLY Kargil cities (Kargil, Drass, Zanskar)
    expect(job.city_queue).toBeDefined();
    expect(job.city_queue?.length).toBe(3);
    const queueNames = job.city_queue!.map(c => c.city_name);
    expect(queueNames).toContain('Kargil');
    expect(queueNames).toContain('Drass');
    expect(queueNames).toContain('Zanskar');

    // Crucial: Must NEVER contain Lucknow or Leh cities
    expect(queueNames).not.toContain('Lucknow');
    expect(queueNames).not.toContain('Gosainganj');
    expect(queueNames).not.toContain('Malihabad');
    expect(queueNames).not.toContain('Kakori');
    expect(queueNames).not.toContain('Leh');
    expect(queueNames).not.toContain('Nubra');

    // 3. Verify scan tasks were created ONLY for Kargil locations
    const tasks = store.getTasksForJob(job.id);
    expect(tasks.length).toBe(3 * 2); // 3 Kargil locations * 2 categories = 6 tasks (NOT 72!)
    expect(job.progress_counters.total_tasks).toBe(6);

    for (const task of tasks) {
      expect(task.location_id).toContain('kargil');
      expect(task.location_id).not.toContain('lucknow');
      expect(task.location_id).not.toContain('leh');
    }
  });

  // TEST 2: Lucknow Campaign Contains Its Own Configured Localities
  it('Regression 2: Lucknow campaign contains only its own configured localities and rejects foreign ones', () => {
    const mixedWithKargil = [
      'city-uttar-pradesh-lucknow-lucknow',
      'city-uttar-pradesh-lucknow-gosainganj',
      'city-ladakh-kargil-kargil',
    ];

    const lucknowConfig: SearchConfig = {
      id: 'config-lucknow-test',
      name: 'Lucknow Leads',
      selected_district: {
        state: 'Uttar Pradesh',
        district: 'Lucknow',
      },
      selected_locations: mixedWithKargil,
      categories: ['Restaurant'],
      rating_filters: { min: 0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
      contact_filters: { phone: 'optional', website_filter: 'all', include_without_phone: true, include_without_email: true },
      limits: { max_records_per_location: 60, max_total_records: 100 },
      provider_id: 'osm_overpass',
    };

    const job = store.createJob('Lucknow Job', lucknowConfig, 'osm_overpass');
    expect(job.selected_district?.district).toBe('Lucknow');

    const queueCityNames = (job.city_queue || []).map(c => c.city_name);
    expect(queueCityNames).toContain('Lucknow');
    expect(queueCityNames).toContain('Gosainganj');
    expect(queueCityNames).not.toContain('Kargil');

    const tasks = store.getTasksForJob(job.id);
    expect(tasks.length).toBe(2); // 2 valid Lucknow locations * 1 category
    for (const t of tasks) {
      expect(t.location_id).not.toContain('kargil');
    }
  });

  // TEST 3: Validation Helper isLocationInDistrict
  it('Regression 3: isLocationInDistrict accurately detects matching and mismatching locations', () => {
    expect(isLocationInDistrict('city-ladakh-kargil-kargil', 'Ladakh', 'Kargil')).toBe(true);
    expect(isLocationInDistrict('city-ladakh-kargil-drass', 'Ladakh', 'Kargil')).toBe(true);
    expect(isLocationInDistrict('city-ladakh-leh-leh', 'Ladakh', 'Kargil')).toBe(false);
    expect(isLocationInDistrict('city-uttar-pradesh-lucknow-gosainganj', 'Ladakh', 'Kargil')).toBe(false);
    expect(isLocationInDistrict('city-uttar-pradesh-lucknow-gosainganj', 'Uttar Pradesh', 'Lucknow')).toBe(true);
  });

  // TEST 4: Worker Pre-flight Quarantining
  it('Regression 4: Worker quarantines invalid foreign tasks and logs isolation warnings', async () => {
    // Manually construct a job with a rogue foreign task injected
    const config: SearchConfig = {
      id: 'cfg-isolation',
      name: 'Kargil Job',
      selected_district: { state: 'Ladakh', district: 'Kargil' },
      selected_locations: ['city-ladakh-kargil-kargil'],
      categories: ['Restaurant'],
      rating_filters: { min: 0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
      contact_filters: { phone: 'optional', website_filter: 'all', include_without_phone: true, include_without_email: true },
      limits: { max_records_per_location: 60, max_total_records: 100 },
      provider_id: 'osm_overpass',
    };
    const job = store.createJob('Kargil Isolation Check', config, 'osm_overpass');

    // Simulate stale foreign task injected by bug
    const rogueTaskId = `task-${job.id}-city-uttar-pradesh-lucknow-gosainganj-Restaurant`;
    store.saveTask({
      id: rogueTaskId,
      job_id: job.id,
      location_id: 'city-uttar-pradesh-lucknow-gosainganj',
      category: 'Restaurant',
      task_parameters: {},
      status: 'queued',
      retry_count: 0,
      max_retries: 3,
      records_discovered: 0,
      created_at: new Date().toISOString(),
    });

    // Run worker
    await ScanWorker.runJob(job.id);

    // The rogue task must have been quarantined (cancelled) with error note
    const rogueTask = store.getTaskById(rogueTaskId);
    expect(rogueTask?.status).toBe('cancelled');
    expect(rogueTask?.last_error).toContain('Geographic isolation');

    // And the valid Kargil task was completed or safely flagged
    const validTask = store.getTasksForJob(job.id).find(t => t.location_id.includes('kargil'));
    expect(['completed', 'completed_with_warnings', 'failed']).toContain(validTask?.status);
  }, 35000);

  // TEST 5: Provider Coordinates Integrity — Eliminates Hardcoded Lucknow Default
  it('Regression 5: OpenStreetMap provider does NOT default to Lucknow coordinates for Kargil queries', async () => {
    const provider = new OpenStreetMapOverpassProvider();

    // Query for Kargil
    const kargilRes = await provider.searchBusinesses({
      query: 'restaurant Kargil Ladakh India',
      category: 'Restaurant',
    });

    expect(kargilRes).toBeDefined();
    expect(Array.isArray(kargilRes.restaurants)).toBe(true);

    if (kargilRes.restaurants.length > 0) {
      // Coordinates must be in Ladakh (lat ~32-35, lng ~75-78), NOT Lucknow (lat ~26.8, lng ~80.9)
      const first = kargilRes.restaurants[0];
      if (first.latitude && first.longitude) {
        expect(first.latitude).toBeGreaterThan(31.0);
        expect(first.latitude).toBeLessThan(36.0);
        expect(first.longitude).toBeGreaterThan(74.0);
        expect(first.longitude).toBeLessThan(79.0);
      }
    }
  }, 35000);

  // TEST 6: Queue and Coverage Reconcilation
  it('Regression 6: City queue status and coverage percentage reconcile with task completions', async () => {
    const config: SearchConfig = {
      id: 'cfg-coverage-test',
      name: 'Coverage Test',
      selected_district: { state: 'Ladakh', district: 'Kargil' },
      selected_locations: ['city-ladakh-kargil-kargil', 'city-ladakh-kargil-drass'],
      categories: ['Restaurant'],
      rating_filters: { min: 0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
      contact_filters: { phone: 'optional', website_filter: 'all', include_without_phone: true, include_without_email: true },
      limits: { max_records_per_location: 60, max_total_records: 100 },
      provider_id: 'osm_overpass',
    };

    const job = store.createJob('Coverage Test', config, 'osm_overpass');
    expect(job.city_queue?.length).toBe(2);
    expect(job.progress_counters.total_tasks).toBe(2);

    await ScanWorker.runJob(job.id);

    const updatedJob = store.getJobById(job.id);
    expect(['completed', 'completed_with_warnings']).toContain(updatedJob?.status);
    expect(updatedJob?.progress_counters.completed_tasks).toBe(2);
    expect(updatedJob?.coverage_summary?.completed_cities).toBe(2);
    expect(updatedJob?.coverage_summary?.coverage_percentage).toBe(100);
  }, 35000);

  // TEST 7: Restarting Worker Does Not Reintroduce Stale Locations
  it('Regression 7: Pausing, resuming or restarting a worker preserves strict geographic queue', async () => {
    const config: SearchConfig = {
      id: 'cfg-restart-test',
      name: 'Restart Isolation Test',
      selected_district: { state: 'Ladakh', district: 'Kargil' },
      selected_locations: ['city-ladakh-kargil-kargil'],
      categories: ['Restaurant'],
      rating_filters: { min: 0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
      contact_filters: { phone: 'optional', website_filter: 'all', include_without_phone: true, include_without_email: true },
      limits: { max_records_per_location: 60, max_total_records: 100 },
      provider_id: 'osm_overpass',
    };

    const job = store.createJob('Restart Job', config, 'osm_overpass');
    expect(job.city_queue?.length).toBe(1);

    // Pause
    ScanWorker.pauseJob(job.id);
    expect(store.getJobById(job.id)?.status).toBe('paused');

    // Resume
    await ScanWorker.resumeJob(job.id);
    const resumed = store.getJobById(job.id);
    expect(resumed?.city_queue?.length).toBe(1);
    expect(resumed?.city_queue?.[0].city_name).toBe('Kargil');
    expect(resumed?.city_queue?.[0].district_name).toBe('Kargil');
  }, 15000);
});
