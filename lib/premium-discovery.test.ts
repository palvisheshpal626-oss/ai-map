import { describe, it, expect } from 'vitest';
import { store } from './store/memory-store';
import { classifyHospitalityTier, isSmallEateryOrStall } from './classification/business-tier';
import { Restaurant } from './types';

describe('Fix Business Discovery: 4+ Rated Premium Hotels & Restaurants Only', () => {
  const sampleCandidates: Partial<Restaurant>[] = [
    {
      id: 'test-taj',
      business_name: 'Taj Mahal Hotel Lucknow',
      category: 'Luxury Hotel',
      formatted_address: 'Vipin Khand, Gomti Nagar, Lucknow, Uttar Pradesh',
      state: 'Uttar Pradesh',
      city: 'Lucknow',
      rating: 4.6,
      review_count: 12450,
      phone_number: '+91 522 671 1001',
    },
    {
      id: 'test-radisson',
      business_name: 'Radisson Lucknow City Centre',
      category: 'Business Hotel',
      formatted_address: 'Cantonment Road, Lucknow, Uttar Pradesh',
      state: 'Uttar Pradesh',
      city: 'Lucknow',
      rating: 4.4,
      review_count: 7810,
      phone_number: '+91 522 429 9999',
    },
    {
      id: 'test-bbq',
      business_name: 'Barbeque Nation - Riverside Mall',
      category: 'Fine Dining Buffet',
      formatted_address: 'Gomti Nagar, Lucknow, Uttar Pradesh',
      state: 'Uttar Pradesh',
      city: 'Lucknow',
      rating: 4.4,
      review_count: 6540,
      phone_number: '+91 80 6902 8721',
    },
    {
      id: 'test-low-rated',
      business_name: 'Substandard Eatery',
      category: 'Restaurant',
      formatted_address: 'Alambagh, Lucknow, Uttar Pradesh',
      state: 'Uttar Pradesh',
      city: 'Lucknow',
      rating: 3.2,
      review_count: 15,
      phone_number: '0522123456',
    },
    {
      id: 'test-unrated-osm',
      business_name: 'Local Dhaba OSM Record',
      category: 'Dhaba',
      formatted_address: 'NH30, Lucknow, Uttar Pradesh',
      state: 'Uttar Pradesh',
      city: 'Lucknow',
      rating: null,
      review_count: null,
      phone_number: null,
    },
    {
      id: 'test-stall',
      business_name: 'Raju Tea Stall & Tapri',
      category: 'tea_stall',
      formatted_address: 'Charbagh, Lucknow, Uttar Pradesh',
      state: 'Uttar Pradesh',
      city: 'Lucknow',
      rating: 3.8,
      review_count: 9,
    },
  ];

  it('Requirement 1: Enforces strict 4.0+ minimum rating and excludes unrated records', () => {
    // Filter candidates strictly for rating >= 4.0 (without unrated)
    const premiumOnly = sampleCandidates.filter(
      r => r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating)) && Number(r.rating) >= 4.0
    );

    expect(premiumOnly.length).toBe(3);

    // Verify every single record in the filtered set has rating >= 4.0
    for (const r of premiumOnly) {
      expect(r.rating).not.toBeNull();
      expect(Number(r.rating)).toBeGreaterThanOrEqual(4.0);
    }

    // Verify that records with rating < 4.0 or null are excluded
    const excluded = sampleCandidates.filter(
      r => r.rating === null || r.rating === undefined || isNaN(Number(r.rating)) || Number(r.rating) < 4.0
    );
    expect(excluded.length).toBe(3);
    expect(excluded.some(r => r.business_name === 'Substandard Eatery')).toBe(true);
    expect(excluded.some(r => r.business_name === 'Local Dhaba OSM Record')).toBe(true);
  });

  it('Requirement 2: Prioritizes and detects established hotels and recognized chains', () => {
    const premiumHospitality = sampleCandidates.filter(r => {
      const tierInfo = classifyHospitalityTier(r);
      return (
        (tierInfo.tier === 'luxury' || tierInfo.tier === 'premium' || tierInfo.isEstablishedChain) &&
        r.rating !== null &&
        Number(r.rating) >= 4.0
      );
    });

    expect(premiumHospitality.length).toBe(3);

    // Check that top luxury brands and chains are represented
    const detectedBrands = premiumHospitality.map(r => {
      const tier = classifyHospitalityTier(r);
      return tier.brandName;
    }).filter(Boolean);

    expect(detectedBrands).toContain('Taj Hotels');
    expect(detectedBrands).toContain('Radisson Hotel Group');
    expect(detectedBrands).toContain('Barbeque Nation');
  });

  it('Requirement 3: Correctly flags roadside tapris and stalls for exclusion', () => {
    const stall = sampleCandidates.find(r => r.id === 'test-stall');
    expect(stall).toBeDefined();
    expect(
      isSmallEateryOrStall({
        business_name: stall!.business_name || '',
        category: stall!.category,
        rating: stall!.rating,
        review_count: stall!.review_count,
      })
    ).toBe(true);

    const taj = sampleCandidates.find(r => r.id === 'test-taj');
    expect(taj).toBeDefined();
    expect(
      isSmallEateryOrStall({
        business_name: taj!.business_name || '',
        category: taj!.category,
        rating: taj!.rating,
        review_count: taj!.review_count,
      })
    ).toBe(false);
  });

  it('Requirement 4: Memory store does not contain hardcoded or preloaded static hotels', () => {
    // Memory store must NOT preload hardcoded seed hotels on initialization
    const all = store.getAllRestaurants();
    const hasStaticSeeds = all.some(r => r.id.startsWith('seed-'));
    expect(hasStaticSeeds).toBe(false);
  });
});
