import { describe, it, expect } from 'vitest';
import { OpenStreetMapOverpassProvider } from './providers/osm-overpass';
import { store } from './store/memory-store';
import { generateCsvExport, generateExcelExport } from './exports/exporter';

describe('Priority 1: End-to-End Real Data Verification for Lucknow', () => {
  it('executes end-to-end flow with real OpenStreetMap records', async () => {
    // 1. Query real provider for Lucknow
    const provider = new OpenStreetMapOverpassProvider();
    const searchRes = await provider.searchBusinesses({
      query: 'restaurant Lucknow Uttar Pradesh',
      latitude: 26.8467,
      longitude: 80.9462,
    });

    expect(searchRes.restaurants.length).toBeGreaterThan(0);
    const candidate = searchRes.restaurants[0];

    // Confirm real details without fabricated reviews/ratings
    expect(candidate.business_name).toBeDefined();
    expect(candidate.formatted_address).toBeDefined();
    expect(candidate.rating).toBeNull();
    expect(candidate.review_count).toBeNull();

    // 2. Persist in memory store
    candidate.district = 'Lucknow';
    candidate.city = 'Lucknow';
    const { restaurant, isDuplicate } = store.saveRestaurant(candidate);

    expect(restaurant.id).toBeDefined();
    expect(restaurant.district).toBe('Lucknow');
    if (candidate.phone_number) {
      expect(restaurant.phone_number).toBe(candidate.phone_number);
      expect(restaurant.normalized_phone).toBeDefined();
    }

    // 3. Duplicate check - saving same record should be flagged as duplicate
    const secondSave = store.saveRestaurant(candidate);
    expect(secondSave.isDuplicate).toBe(true);
    expect(secondSave.restaurant.id).toBe(restaurant.id);

    // 4. Verify in All Restaurants
    const all = store.getAllRestaurants();
    const found = all.find(r => r.id === restaurant.id);
    expect(found).toBeDefined();
    if (candidate.phone_number) {
      expect(found!.phone_number).toBe(candidate.phone_number);
    }

    // 5. Export to CSV & verify
    const csv = generateCsvExport([found!]);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(csv).toContain(found!.business_name);
    expect(csv).toContain('Lucknow');
    if (found!.phone_number) {
      expect(csv).toContain(found!.phone_number);
    }

    // 6. Export to Excel & verify
    const excelBuffer = await generateExcelExport([found!]);
    expect(excelBuffer.length).toBeGreaterThan(100);
  }, 25000);
});
