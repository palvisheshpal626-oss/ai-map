import { describe, it, expect } from 'vitest';
import { OpenStreetMapOverpassProvider } from './osm-overpass';

describe('OpenStreetMap Overpass Live API Integration', () => {
  it('connects to real Overpass API and returns real restaurants in Uttar Pradesh (Lucknow)', async () => {
    const provider = new OpenStreetMapOverpassProvider();
    expect(provider.isConfigured()).toBe(true);

    const testRes = await provider.testConnection();
    expect(testRes.success).toBe(true);

    // Sleep 1200ms to respect Nominatim 1 req/sec policy
    await new Promise(r => setTimeout(r, 1200));

    // Bounding box for Hazratganj, Lucknow (Lat: 26.8467, Lng: 80.9462)
    const result = await provider.searchBusinesses({
      query: 'restaurant lucknow',
      latitude: 26.8467,
      longitude: 80.9462,
    });

    expect(result.restaurants.length).toBeGreaterThan(0);
    const first = result.restaurants[0];
    expect(first.business_name).toBeDefined();
    expect(first.business_name!.length).toBeGreaterThan(0);
    expect(first.formatted_address).toBeDefined();
    // Verify that missing ratings and reviews are NOT fabricated
    expect(first.rating).toBeNull();
    expect(first.review_count).toBeNull();
  }, 45000);
});
