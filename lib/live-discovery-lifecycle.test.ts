import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from './store/memory-store';
import { POST as searchRouteHandler } from '../app/api/discovery/search/route';
import { GET as getRestaurantsRouteHandler } from '../app/api/restaurants/route';
import { ProviderRegistry } from './providers/registry';
import { BusinessDataProvider, ProviderSearchResult, ProviderCapability } from './providers/types';
import { NextRequest } from 'next/server';
import { Restaurant } from './types';

// Mock test provider
class MockDynamicProvider implements BusinessDataProvider {
  readonly id = 'mock_dynamic';
  readonly name = 'Mock Dynamic Provider';
  readonly capabilities: ProviderCapability = {
    supportsRatings: true,
    supportsReviewCounts: true,
    supportsPhoneNumbers: true,
    supportsWebsites: true,
    supportsPagination: true,
    supportsRealTimeStatus: true,
    requiresCommercialKey: false,
    maxResultsPerQuery: 50,
    termsNotes: 'Mock test provider',
  };

  candidatePool: Partial<Restaurant>[] = [];
  shouldFailWithTimeout = false;

  isConfigured(): boolean {
    return true;
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    return { success: true, message: 'Connected', latencyMs: 10 };
  }

  async searchBusinesses(): Promise<ProviderSearchResult> {
    if (this.shouldFailWithTimeout) {
      throw new Error('Provider network timeout: service failed to respond within 15s');
    }
    return {
      restaurants: [...this.candidatePool],
      totalEstimatedResults: this.candidatePool.length,
      usageCount: 1,
    };
  }
}

const mockDynamicProvider = new MockDynamicProvider();
ProviderRegistry.registerProvider(mockDynamicProvider);

describe('Live Business Discovery Lifecycle & State Isolation Tests', () => {
  beforeEach(() => {
    store.clearAllActiveRuns();
    mockDynamicProvider.candidatePool = [];
    mockDynamicProvider.shouldFailWithTimeout = false;
  });

  // TEST 1: Search A returns records; Search B returns 0 records.
  it('Scenario 1: Search A returns records, subsequent Search B returns 0 records -> Search B displays 0 records and exact empty message, never Search A records', async () => {
    // 1. Run Search A (Returns 2 valid records)
    mockDynamicProvider.candidatePool = [
      {
        id: 'mock-a1',
        business_name: 'The Taj Grand Hotel',
        category: 'Hotel',
        formatted_address: '10 Heritage Way, Mumbai, Maharashtra, India',
        city: 'Mumbai',
        state: 'Maharashtra',
        rating: 4.8,
        review_count: 1200,
      },
      {
        id: 'mock-a2',
        business_name: 'Oberoi Sky Lounge',
        category: 'Fine Dining',
        formatted_address: '20 Marine Drive, Mumbai, Maharashtra, India',
        city: 'Mumbai',
        state: 'Maharashtra',
        rating: 4.6,
        review_count: 850,
      },
    ];

    const reqA = new NextRequest('http://localhost:3000/api/discovery/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Luxury Hotels',
        city: 'Mumbai',
        state: 'Maharashtra',
        providerId: 'mock_dynamic',
        minRating: 4.0,
      }),
    });

    const resA = await searchRouteHandler(reqA);
    const dataA = await resA.json();

    expect(resA.status).toBe(200);
    expect(dataA.success).toBe(true);
    expect(dataA.total).toBe(2);
    expect(dataA.restaurants.length).toBe(2);
    const runIdA = dataA.runId;

    // 2. Run Search B (Returns 0 records from provider)
    mockDynamicProvider.candidatePool = [];

    const reqB = new NextRequest('http://localhost:3000/api/discovery/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Boutique Resorts',
        city: 'Shimla',
        state: 'Himachal Pradesh',
        providerId: 'mock_dynamic',
        minRating: 4.0,
      }),
    });

    const resB = await searchRouteHandler(reqB);
    const dataB = await resB.json();

    expect(resB.status).toBe(200);
    expect(dataB.success).toBe(true);
    expect(dataB.status).toBe('empty');
    expect(dataB.total).toBe(0);
    expect(dataB.restaurants).toEqual([]);
    expect(dataB.message).toBe(
      'No businesses found for this search. Try another city, category, or rating threshold.'
    );
    expect(dataB.runId).not.toBe(runIdA);

    // 3. Querying active live view via /api/restaurants?view=live must return 0 records (Search B is active)
    const reqLive = new NextRequest('http://localhost:3000/api/restaurants?view=live');
    const resLive = await getRestaurantsRouteHandler(reqLive);
    const dataLive = await resLive.json();

    expect(dataLive.restaurants.length).toBe(0);
    expect(dataLive.runId).toBe(dataB.runId);

    // 4. Querying specifically for runIdA must return Search A's isolated records
    const reqRunA = new NextRequest(`http://localhost:3000/api/restaurants?run_id=${runIdA}`);
    const resRunA = await getRestaurantsRouteHandler(reqRunA);
    const dataRunA = await resRunA.json();

    expect(dataRunA.restaurants.length).toBe(2);
    expect(dataRunA.restaurants[0].business_name).toBe('The Taj Grand Hotel');
  });

  // TEST 2: Search A returns records; Search B returns different records.
  it('Scenario 2: Search A vs Search B isolation -> Search B returns only Search B records, no cross-contamination', async () => {
    // Search A
    mockDynamicProvider.candidatePool = [
      {
        id: 'delhi-1',
        business_name: 'ITC Maurya',
        category: 'Luxury Hotel',
        formatted_address: 'Diplomatic Enclave, New Delhi, India',
        city: 'New Delhi',
        state: 'Delhi',
        rating: 4.9,
        review_count: 2400,
      },
    ];

    const reqA = new NextRequest('http://localhost:3000/api/discovery/search', {
      method: 'POST',
      body: JSON.stringify({
        city: 'New Delhi',
        providerId: 'mock_dynamic',
      }),
    });
    const resA = await searchRouteHandler(reqA);
    const dataA = await resA.json();
    expect(dataA.restaurants.length).toBe(1);
    expect(dataA.restaurants[0].business_name).toBe('ITC Maurya');

    // Search B
    mockDynamicProvider.candidatePool = [
      {
        id: 'jaipur-1',
        business_name: 'Rambagh Palace',
        category: 'Heritage Hotel',
        formatted_address: 'Bhawani Singh Road, Jaipur, Rajasthan, India',
        city: 'Jaipur',
        state: 'Rajasthan',
        rating: 4.9,
        review_count: 1800,
      },
      {
        id: 'jaipur-2',
        business_name: 'Jai Mahal Palace',
        category: 'Palace Hotel',
        formatted_address: 'Jacob Road, Jaipur, Rajasthan, India',
        city: 'Jaipur',
        state: 'Rajasthan',
        rating: 4.7,
        review_count: 1100,
      },
    ];

    const reqB = new NextRequest('http://localhost:3000/api/discovery/search', {
      method: 'POST',
      body: JSON.stringify({
        city: 'Jaipur',
        providerId: 'mock_dynamic',
      }),
    });
    const resB = await searchRouteHandler(reqB);
    const dataB = await resB.json();

    expect(dataB.restaurants.length).toBe(2);
    const namesB = dataB.restaurants.map((r: Restaurant) => r.business_name);
    expect(namesB).toContain('Rambagh Palace');
    expect(namesB).toContain('Jai Mahal Palace');
    expect(namesB).not.toContain('ITC Maurya'); // No contamination from Search A
  });

  // TEST 3: Missing or unconfigured GOOGLE_PLACES_API_KEY
  it('Scenario 3: Missing GOOGLE_PLACES_API_KEY returns clear configuration error, never static fallback', async () => {
    const originalKey = process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;

    try {
      const req = new NextRequest('http://localhost:3000/api/discovery/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'Five Star Hotels',
          city: 'Bengaluru',
          providerId: 'google_places',
        }),
      });

      const res = await searchRouteHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.restaurants).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.error).toContain('Google Places API key is not configured');
    } finally {
      process.env.GOOGLE_PLACES_API_KEY = originalKey;
    }
  });

  // TEST 4: Provider timeout or network failure
  it('Scenario 4: Provider network failure or timeout returns clear failure state, never previous results', async () => {
    mockDynamicProvider.shouldFailWithTimeout = true;

    const req = new NextRequest('http://localhost:3000/api/discovery/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Resorts',
        city: 'Goa',
        providerId: 'mock_dynamic',
      }),
    });

    const res = await searchRouteHandler(req);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.success).toBe(false);
    expect(data.total).toBe(0);
    expect(data.restaurants).toEqual([]);
    expect(data.error).toContain('Provider network timeout');
  });

  // TEST 5: In-batch deduplication via Place ID / OSM ID & attributes
  it('Scenario 5: In-batch deduplication properly dedupes duplicate source IDs and normalized names', async () => {
    mockDynamicProvider.candidatePool = [
      {
        id: 'place_123',
        source_record_id: 'place_123',
        business_name: 'Hyatt Regency',
        category: 'Hotel',
        formatted_address: 'Ring Road, Delhi, India',
        city: 'Delhi',
        rating: 4.5,
        review_count: 500,
      },
      {
        id: 'place_123_duplicate',
        source_record_id: 'place_123', // duplicate source ID
        business_name: 'Hyatt Regency Hotel',
        category: 'Hotel',
        formatted_address: 'Ring Road, Delhi, India',
        city: 'Delhi',
        rating: 4.5,
        review_count: 500,
      },
      {
        id: 'osm-way-999',
        source_record_id: 'osm-way-999',
        business_name: 'Hyatt Regency', // Duplicate normalized name in same city/address
        category: 'Hotel',
        formatted_address: 'Ring Road, Delhi, India',
        city: 'Delhi',
        rating: 4.5,
        review_count: 500,
      },
    ];

    const req = new NextRequest('http://localhost:3000/api/discovery/search', {
      method: 'POST',
      body: JSON.stringify({
        city: 'Delhi',
        providerId: 'mock_dynamic',
      }),
    });

    const res = await searchRouteHandler(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.total).toBe(1); // Exact deduplication down to 1 distinct business
    expect(data.restaurants[0].business_name).toBe('Hyatt Regency');
  });

  // TEST 6: Repeated searches generate unique run IDs without mixing
  it('Scenario 6: Repeated searches generate unique run IDs and store results strictly per run', async () => {
    const runIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      mockDynamicProvider.candidatePool = [
        {
          id: `item-${i}`,
          business_name: `Unique Hotel ${i}`,
          category: 'Hotel',
          formatted_address: `Street ${i}, Kochi, Kerala, India`,
          rating: 4.4,
          review_count: 200,
        },
      ];

      const req = new NextRequest('http://localhost:3000/api/discovery/search', {
        method: 'POST',
        body: JSON.stringify({
          city: 'Kochi',
          providerId: 'mock_dynamic',
        }),
      });

      const res = await searchRouteHandler(req);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.restaurants.length).toBe(1);
      runIds.push(data.runId);
    }

    // Verify all 3 run IDs are unique
    expect(new Set(runIds).size).toBe(3);

    // Verify that retrieving each run returns only that run's record
    for (let i = 0; i < 3; i++) {
      const records = store.getRestaurantsForRun(runIds[i]);
      expect(records.length).toBe(1);
      expect(records[0].business_name).toBe(`Unique Hotel ${i}`);
    }
  });

  // TEST 7: Strict 4.0+ rating and review count filters
  it('Scenario 7: Strict 4.0+ rating and minimum review count filtering applied on provider data', async () => {
    mockDynamicProvider.candidatePool = [
      {
        id: 'low-rating',
        business_name: 'Budget Roadside Inn',
        category: 'Hotel',
        formatted_address: 'Highway 1, Agra, UP, India',
        rating: 3.6, // < 4.0 -> Must be excluded
        review_count: 50,
      },
      {
        id: 'unrated-stall',
        business_name: 'Sharma Tea Stall',
        category: 'Tea Stall',
        formatted_address: 'Station Road, Agra, UP, India',
        rating: null, // Unrated -> Must be excluded when minRating=4.0 and includeUnrated=false
        review_count: null,
      },
      {
        id: 'low-reviews',
        business_name: 'New Homestay',
        category: 'Hotel',
        formatted_address: 'Fatehabad Road, Agra, UP, India',
        rating: 4.8,
        review_count: 5, // < minReviews (20) -> Must be excluded
      },
      {
        id: 'qualified-hotel',
        business_name: 'ITC Mughal, Agra',
        category: 'Luxury Hotel',
        formatted_address: 'Taj Ganj, Agra, UP, India',
        rating: 4.7,
        review_count: 4200, // Meets all criteria
      },
    ];

    const req = new NextRequest('http://localhost:3000/api/discovery/search', {
      method: 'POST',
      body: JSON.stringify({
        city: 'Agra',
        providerId: 'mock_dynamic',
        minRating: 4.0,
        minReviews: 20,
        includeUnrated: false,
        excludeSmall: true,
      }),
    });

    const res = await searchRouteHandler(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.total).toBe(1);
    expect(data.restaurants[0].business_name).toBe('ITC Mughal, Agra');
    expect(data.totalFilteredOut).toBe(3);
  });

  // TEST 8: Supabase historical records remain intact and retrievable via view=saved
  it('Scenario 8: Saved database records remain intact and retrievable via view=saved without interference from live runs', async () => {
    // Check saved database view
    const reqSaved = new NextRequest('http://localhost:3000/api/restaurants?view=saved');
    const resSaved = await getRestaurantsRouteHandler(reqSaved);
    const dataSaved = await resSaved.json();

    expect(resSaved.status).toBe(200);
    expect(dataSaved.success).toBe(true);
    // Historical rows exist in store/supabase
    expect(Array.isArray(dataSaved.restaurants)).toBe(true);

    // Run a live search that returns 0 records
    mockDynamicProvider.candidatePool = [];
    const reqLiveEmpty = new NextRequest('http://localhost:3000/api/discovery/search', {
      method: 'POST',
      body: JSON.stringify({
        city: 'NonExistentCity',
        providerId: 'mock_dynamic',
      }),
    });
    const resLiveEmpty = await searchRouteHandler(reqLiveEmpty);
    const dataLiveEmpty = await resLiveEmpty.json();

    expect(dataLiveEmpty.total).toBe(0);

    // Verify live view now returns 0
    const reqLive = new NextRequest('http://localhost:3000/api/restaurants?view=live');
    const resLive = await getRestaurantsRouteHandler(reqLive);
    const dataLive = await resLive.json();
    expect(dataLive.restaurants.length).toBe(0);

    // Verify saved view STILL has all historical records untouched
    const reqSavedAgain = new NextRequest('http://localhost:3000/api/restaurants?view=saved');
    const resSavedAgain = await getRestaurantsRouteHandler(reqSavedAgain);
    const dataSavedAgain = await resSavedAgain.json();
    expect(dataSavedAgain.restaurants.length).toBe(dataSaved.restaurants.length);
  });
});
