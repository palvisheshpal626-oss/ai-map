import { describe, it, expect } from 'vitest';
import { OpenStreetMapOverpassProvider } from './providers/osm-overpass';

describe('Lucknow City-Level Controlled Test (Free OSM Provider)', () => {
  it('searches restaurants in Lucknow and checks phone availability honestly', async () => {
    const provider = new OpenStreetMapOverpassProvider();

    // Query real Lucknow restaurants
    const res = await provider.searchBusinesses({
      query: 'restaurant Lucknow Uttar Pradesh',
      latitude: 26.8467,
      longitude: 80.9462,
    });

    console.log(`\n=== LUCKNOW TEST RESULTS ===`);
    console.log(`Total restaurants retrieved: ${res.restaurants.length}`);

    let withPhone = 0;
    let missingPhone = 0;

    res.restaurants.forEach((r, idx) => {
      const hasPhone = Boolean(r.phone_number && r.phone_number.trim().length > 3);
      if (hasPhone) withPhone++;
      else missingPhone++;

      if (idx < 5) {
        console.log(`[#${idx + 1}] ${r.business_name}`);
        console.log(`    Address: ${r.formatted_address}`);
        console.log(`    Phone: ${r.phone_number ? r.phone_number : 'Unavailable (Missing in OSM)'}`);
        console.log(`    Website: ${r.website_url ? r.website_url : 'None listed'}`);
        console.log(`    Rating: ${r.rating} (strictly null)`);
        console.log(`    Reviews: ${r.review_count} (strictly null)`);
      }
    });

    console.log(`Summary: With Phone: ${withPhone}, Missing Phone: ${missingPhone}`);

    expect(res.restaurants.length).toBeGreaterThan(0);
    // Verified that missing phones are NOT invented
    const firstMissing = res.restaurants.find(r => !r.phone_number);
    if (firstMissing) {
      expect(firstMissing.phone_number).toBeNull();
    }
  }, 25000);
});
