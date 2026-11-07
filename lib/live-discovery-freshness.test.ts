import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store/memory-store';
import { ProviderRegistry } from './providers/registry';
import { Restaurant } from './types';

describe('Live Discovery Freshness & Run Isolation Suite (Tests A to E)', () => {
  beforeEach(() => {
    store.clearRestaurants();
    store.clearAllActiveRuns();
    store.clearJobs();
  });

  // Test A: Search for Lucknow with Restaurants selected. Confirm new run ID and inspect returned businesses.
  it('Test A: Search for Lucknow creates unique run ID and returns authentic Lucknow records', async () => {
    const provider = ProviderRegistry.getProvider('osm_overpass');
    const runIdA = `run_${Date.now()}_testA`;

    store.startSearchRun(runIdA, {
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      category: 'Restaurants',
      providerId: 'osm_overpass',
    });

    const result = await provider.searchBusinesses({
      query: 'Restaurants in Lucknow, Uttar Pradesh, India',
      category: 'Restaurants',
    });

    expect(result.restaurants.length).toBeGreaterThan(0);

    const savedRecords: Restaurant[] = [];
    for (const cand of result.restaurants) {
      // Geographic verification
      const candAddr = (cand.formatted_address || '').toLowerCase();
      const candCity = (cand.city || '').toLowerCase();
      const candDist = (cand.district || '').toLowerCase();
      const matchesLucknow = candCity.includes('lucknow') || candDist.includes('lucknow') || candAddr.includes('lucknow');
      if (matchesLucknow) {
        cand.search_id = runIdA;
        const { restaurant } = store.saveRestaurant(cand);
        savedRecords.push(restaurant);
      }
    }

    expect(savedRecords.length).toBeGreaterThan(0);
    store.updateSearchRun(runIdA, {
      status: 'completed',
      totalFetched: result.restaurants.length,
      totalResults: savedRecords.length,
      results: savedRecords,
    });

    const runA = store.getSearchRun(runIdA);
    expect(runA).toBeDefined();
    expect(runA?.runId).toBe(runIdA);
    expect(runA?.results.length).toBe(savedRecords.length);

    // Verify all records belong to Lucknow
    for (const r of runA!.results) {
      const addr = (r.formatted_address || '').toLowerCase();
      const city = (r.city || '').toLowerCase();
      const dist = (r.district || '').toLowerCase();
      expect(city.includes('lucknow') || dist.includes('lucknow') || addr.includes('lucknow')).toBe(true);
    }
  }, 30000);

  // Test B: Change the city to Jaipur and start a new search. Confirm run ID changes and no Lucknow records appear.
  it('Test B: Changing city to Jaipur generates a new run ID and does NOT display previous Lucknow results', async () => {
    const provider = ProviderRegistry.getProvider('osm_overpass');

    // Run A: Lucknow
    const runIdA = `run_${Date.now()}_lucknow`;
    store.startSearchRun(runIdA, { city: 'Lucknow', category: 'Restaurants' });
    const lucknowCand: Partial<Restaurant> = {
      id: 'osm-lucknow-101',
      business_name: 'Dastarkhwan Lucknow',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      formatted_address: 'Aminabad, Lucknow, Uttar Pradesh, India',
      search_id: runIdA,
    };
    const savedLucknow = store.saveRestaurant(lucknowCand).restaurant;
    store.updateSearchRun(runIdA, { results: [savedLucknow] });

    // Run B: Jaipur
    const runIdB = `run_${Date.now()}_jaipur`;
    expect(runIdB).not.toBe(runIdA);

    store.startSearchRun(runIdB, { city: 'Jaipur', category: 'Restaurants' });

    const resultJaipur = await provider.searchBusinesses({
      query: 'Restaurants in Jaipur, Rajasthan, India',
      category: 'Restaurants',
    });

    expect(resultJaipur.restaurants.length).toBeGreaterThan(0);

    const savedJaipur: Restaurant[] = [];
    for (const cand of resultJaipur.restaurants) {
      cand.search_id = runIdB;
      const { restaurant } = store.saveRestaurant(cand);
      savedJaipur.push(restaurant);
    }

    store.updateSearchRun(runIdB, {
      status: 'completed',
      totalFetched: resultJaipur.restaurants.length,
      totalResults: savedJaipur.length,
      results: savedJaipur,
    });

    // Query active run B
    const runBResults = store.getRestaurantsForRun(runIdB);
    expect(runBResults.length).toBeGreaterThan(0);

    // Verify Run B does NOT contain Lucknow records
    const hasLucknow = runBResults.some(r => r.id === 'osm-lucknow-101' || r.business_name.includes('Lucknow'));
    expect(hasLucknow).toBe(false);

    // Verify Run A still has its own records
    const runAResults = store.getRestaurantsForRun(runIdA);
    expect(runAResults).toHaveLength(1);
    expect(runAResults[0].business_name).toBe('Dastarkhwan Lucknow');
  }, 30000);

  // Test C: Search for a deliberately unlikely keyword. Confirm zero results shown instead of previous businesses.
  it('Test C: Unlikely keyword returns zero results and displays empty state without restoring old records', async () => {
    const provider = ProviderRegistry.getProvider('osm_overpass');

    // Pre-populate with older run
    const oldRunId = 'run_old_historical';
    store.startSearchRun(oldRunId, { query: 'Taj Hotel' });
    const oldRest = store.saveRestaurant({
      id: 'osm-taj-old',
      business_name: 'Taj Palace Old',
      search_id: oldRunId,
    }).restaurant;
    store.updateSearchRun(oldRunId, { results: [oldRest] });

    // Now execute search for unlikely keyword
    const unlikelyRunId = `run_${Date.now()}_unlikely`;
    store.startSearchRun(unlikelyRunId, {
      query: 'xyznonexistenthotel1234567890qwerty in Lucknow, India',
    });

    const unlikelyResult = await provider.searchBusinesses({
      query: 'xyznonexistenthotel1234567890qwerty in Lucknow, India',
    });

    expect(unlikelyResult.restaurants.length).toBe(0);

    store.updateSearchRun(unlikelyRunId, {
      status: 'empty',
      totalFetched: 0,
      totalFilteredOut: 0,
      totalResults: 0,
      results: [],
    });

    // Verify active run returns exactly 0 records
    const results = store.getRestaurantsForRun(unlikelyRunId);
    expect(results).toHaveLength(0);
    expect(results).toEqual([]);

    // Ensure it NEVER restored old records into unlikelyRunId
    expect(results.some(r => r.id === 'osm-taj-old')).toBe(false);
  }, 30000);

  // Test D: Start two searches in succession. Confirm only the latest run populates the active results table.
  it('Test D: Successive searches guarantee only the latest run populates the active view', () => {
    const run1Id = 'run_seq_1';
    store.startSearchRun(run1Id, { query: 'First Search' });
    const r1 = store.saveRestaurant({
      id: 'rec-seq-1',
      business_name: 'Sequence Restaurant 1',
      search_id: run1Id,
    }).restaurant;
    store.updateSearchRun(run1Id, { results: [r1], status: 'completed' });

    const run2Id = 'run_seq_2';
    store.startSearchRun(run2Id, { query: 'Second Search' });
    const r2 = store.saveRestaurant({
      id: 'rec-seq-2',
      business_name: 'Sequence Restaurant 2',
      search_id: run2Id,
    }).restaurant;
    store.updateSearchRun(run2Id, { results: [r2], status: 'completed' });

    // The latest run must be run2Id
    const latestRun = store.getLatestSearchRun();
    expect(latestRun).toBeDefined();
    expect(latestRun?.runId).toBe(run2Id);
    expect(latestRun?.results).toHaveLength(1);
    expect(latestRun?.results[0].id).toBe('rec-seq-2');

    // Run 1 results must NOT be present in latest run
    expect(latestRun?.results.some(r => r.id === 'rec-seq-1')).toBe(false);
  });

  // Test E: Open Saved History. Confirm previous runs remain available without contaminating Live Discovery.
  it('Test E: Saved History retains historical records without leaking into active live runs', () => {
    // Save 3 persistent database records
    const historical1 = store.saveRestaurant({
      id: 'hist-1',
      business_name: 'Historical Cafe 1',
      search_id: 'old-campaign-1',
    }).restaurant;

    const historical2 = store.saveRestaurant({
      id: 'hist-2',
      business_name: 'Historical Cafe 2',
      search_id: 'old-campaign-1',
    }).restaurant;

    expect(store.getSavedRestaurants()).toHaveLength(2);

    // Start a fresh, empty live search run
    const liveRunId = 'run_fresh_empty_live';
    store.startSearchRun(liveRunId, { query: 'Empty Live Search' });
    store.updateSearchRun(liveRunId, { results: [], status: 'empty' });

    // Live search must be strictly empty
    const liveResults = store.getRestaurantsForRun(liveRunId);
    expect(liveResults).toHaveLength(0);

    // Saved database remains fully intact with historical records
    const saved = store.getSavedRestaurants();
    expect(saved).toHaveLength(2);
    expect(saved.map(s => s.id)).toEqual(['hist-1', 'hist-2']);
  });
});
