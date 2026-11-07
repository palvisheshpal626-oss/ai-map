import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store/memory-store';
import { ScanWorker } from './workers/scan-worker';
import { ProviderRegistry } from './providers/registry';
import { BusinessDataProvider, ProviderSearchResult } from './providers/types';
import { SearchConfig } from './types';

class MockOsmProvider implements BusinessDataProvider {
  readonly id = 'osm_test_provider';
  readonly name = 'Mock OSM Provider';
  readonly capabilities = {
    supportsRatings: false,
    supportsReviewCounts: false, // Transparent: does not support reviews
    supportsPhoneNumbers: true,
    supportsWebsites: true,
    supportsPagination: false,
    supportsRealTimeStatus: true,
    requiresCommercialKey: false,
    maxResultsPerQuery: 50,
    termsNotes: 'ODbL',
  };

  isConfigured() {
    return true;
  }
  async testConnection() {
    return { success: true, message: 'Connected' };
  }

  async searchBusinesses(): Promise<ProviderSearchResult> {
    return {
      restaurants: [
        {
          id: 'osm-node-1001',
          business_name: 'Lucknow Royal Awadhi Restaurant',
          category: 'Restaurant',
          formatted_address: 'Hazratganj, Lucknow, Uttar Pradesh, 226001, India',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          country: 'India',
          latitude: 26.8467,
          longitude: 80.9462,
          phone_number: '05224001122',
          website_url: null,
          rating: null, // Strictly null from OSM
          review_count: null, // Strictly null from OSM
        },
        {
          id: 'osm-node-1002',
          business_name: 'Dastarkhwan Non-Veg Point',
          category: 'Restaurant',
          formatted_address: 'Tulsi Theatre, Hazratganj, Lucknow, Uttar Pradesh, 226001, India',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          country: 'India',
          latitude: 26.8500,
          longitude: 80.9500,
          phone_number: null,
          website_url: null,
          rating: null,
          review_count: null,
        },
        {
          id: 'osm-node-foreign-999',
          business_name: 'Waukee Iowa Diner',
          category: 'Restaurant',
          formatted_address: 'Waukee, Iowa, USA',
          city: 'Waukee',
          state: 'Iowa',
          country: 'USA', // Foreign country
          latitude: 41.6119, // Foreign lat
          longitude: -93.8844, // Foreign lon
          phone_number: '5159871111',
          website_url: null,
          rating: null,
          review_count: null,
        },
      ],
      usageCount: 1,
    };
  }
}

describe('OSM Review Filter Fix & Auto-Save Pipeline', () => {
  beforeEach(() => {
    store.clearAllActiveRuns();
    store.clearJobs();
    ProviderRegistry.registerProvider(new MockOsmProvider());
  });

  it('does NOT reject OSM records for low_reviews even when minReviews is configured to 50', async () => {
    // Campaign config with minReviews = 50 and include_unrated = true
    const config: SearchConfig = {
      id: 'cfg-osm-review-test',
      name: 'Lucknow Review Test Campaign',
      selected_locations: ['in-up-lucknow'],
      categories: ['Restaurants'],
      rating_filters: {
        min: 4.0,
        include_unrated: true,
      },
      review_filters: {
        min: 50, // Would reject all 1,449 OSM records in the old broken implementation!
        include_zero: true,
      },
      contact_filters: {
        phone: 'optional',
        phone_filter: 'all',
        website_filter: 'all',
        include_without_phone: true,
      },
      limits: {
        max_records_per_location: 60,
        max_total_records: 100,
      },
      provider_id: 'osm_test_provider',
    };

    const job = store.createJob('OSM Review Test Campaign', config, 'osm_test_provider');
    await ScanWorker.runJob(job.id);

    const updatedJob = store.getJobById(job.id);
    expect(updatedJob).toBeDefined();

    const counters = updatedJob!.progress_counters;
    expect(counters.fetched_count).toBe(3);

    // Verified: Foreign record 'Waukee Iowa Diner' must be rejected as out_of_bounds
    expect(counters.rejection_breakdown?.['out_of_bounds']).toBe(1);

    // CRITICAL: low_reviews must be 0! OSM records must NEVER be rejected for low_reviews
    expect(counters.rejection_breakdown?.['low_reviews'] || 0).toBe(0);

    // Both Lucknow restaurants must be saved!
    expect(counters.discovered_count).toBe(2);

    const savedForRun = store.getRestaurantsForRun(job.id);
    expect(savedForRun.length).toBe(2);
    expect(savedForRun.map(r => r.business_name)).toContain('Lucknow Royal Awadhi Restaurant');
    expect(savedForRun.map(r => r.business_name)).toContain('Dastarkhwan Non-Veg Point');
  });
});
