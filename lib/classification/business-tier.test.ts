import { describe, it, expect } from 'vitest';
import {
  detectEstablishedBrand,
  isSmallEateryOrStall,
  classifyHospitalityTier,
} from './business-tier';
import { calculateLeadScore } from '../scoring/lead-scorer';

describe('Hospitality Business Tier & Brand Classification', () => {
  it('detects established luxury hotel brands and national chains', () => {
    const taj = detectEstablishedBrand('Taj Mahal Hotel Lucknow');
    expect(taj.isChain).toBe(true);
    expect(taj.brandName).toBe('Taj Hotels');
    expect(taj.tier).toBe('luxury');

    const marriott = detectEstablishedBrand('JW Marriott Hotel Bengaluru');
    expect(marriott.isChain).toBe(true);
    expect(marriott.brandName).toBe('Marriott International');
    expect(marriott.tier).toBe('luxury');

    const radisson = detectEstablishedBrand('Radisson Blu City Centre');
    expect(radisson.isChain).toBe(true);
    expect(radisson.brandName).toBe('Radisson Hotel Group');

    const bbq = detectEstablishedBrand('Barbeque Nation - Riverside Mall');
    expect(bbq.isChain).toBe(true);
    expect(bbq.brandName).toBe('Barbeque Nation');
    expect(bbq.tier).toBe('premium');

    const haldiram = detectEstablishedBrand("Haldiram's Sweets & Restaurant");
    expect(haldiram.isChain).toBe(true);
    expect(haldiram.brandName).toBe("Haldiram's");

    const unknown = detectEstablishedBrand('Random Local Bhojanalaya');
    expect(unknown.isChain).toBe(false);
    expect(unknown.brandName).toBeNull();
  });

  it('correctly flags small roadside stalls, tapris, and micro-kiosks', () => {
    expect(isSmallEateryOrStall({ business_name: 'Shankar Chai Tapri' })).toBe(true);
    expect(isSmallEateryOrStall({ business_name: 'Gupta Tea Stall & Maggi Point' })).toBe(true);
    expect(isSmallEateryOrStall({ business_name: 'Paan Corner & Cold Drinks' })).toBe(true);
    expect(isSmallEateryOrStall({ business_name: 'Raju Street Food Cart' })).toBe(true);

    // Safeguard: established brands and iconic places are NEVER classified as small stalls
    expect(isSmallEateryOrStall({ business_name: 'Taj Mahal Palace' })).toBe(false);
    expect(isSmallEateryOrStall({ business_name: 'Barbeque Nation' })).toBe(false);
    expect(
      isSmallEateryOrStall({
        business_name: 'Sharma Tea Stall (Iconic)',
        rating: 4.4,
        review_count: 5200,
      })
    ).toBe(false);
  });

  it('classifies hospitality candidates into clear quality tiers', () => {
    const luxuryHotel = classifyHospitalityTier({
      business_name: 'ITC Maurya, A Luxury Collection Hotel',
      category: 'Luxury Hotel',
      rating: 4.7,
      review_count: 24000,
    });
    expect(luxuryHotel.tier).toBe('luxury');
    expect(luxuryHotel.categoryGroup).toBe('hotels');
    expect(luxuryHotel.meetsQualityThreshold).toBe(true);
    expect(luxuryHotel.isSmallOutlet).toBe(false);

    const roadsideTapri = classifyHospitalityTier({
      business_name: 'Chai Ki Tapri',
      category: 'tea_stall',
      rating: 3.2,
      review_count: 8,
    });
    expect(roadsideTapri.tier).toBe('small_outlet');
    expect(roadsideTapri.meetsQualityThreshold).toBe(false);
    expect(roadsideTapri.isSmallOutlet).toBe(true);
  });

  it('multi-factor relevance engine prioritizes established high-review hotels over tiny unrated/micro outlets', () => {
    // 1. Taj Mahal Hotel: 4.6 rating with 12,450 reviews, luxury brand, full contacts
    const tajScore = calculateLeadScore({
      business_name: 'Taj Mahal Hotel Lucknow',
      category: 'Luxury Hotel',
      rating: 4.6,
      review_count: 12450,
      phone_number: '+91 522 671 1000',
      website_url: 'https://tajhotels.com',
      latitude: 26.8538,
      longitude: 80.9754,
    });

    // 2. Barbeque Nation: 4.4 rating with 6,540 reviews
    const bbqScore = calculateLeadScore({
      business_name: 'Barbeque Nation',
      category: 'Fine Dining Buffet',
      rating: 4.4,
      review_count: 6540,
      phone_number: '+91 80 6902 8721',
      website_url: 'https://barbequenation.com',
      latitude: 26.8542,
      longitude: 80.9749,
    });

    // 3. Small roadside kiosk with 4.8 rating but only 4 reviews and no brand
    const tinyKioskScore = calculateLeadScore({
      business_name: 'Raju Maggi Point & Tea Stall',
      category: 'Fast Food',
      rating: 4.8,
      review_count: 4,
      phone_number: null,
      website_url: null,
    });

    // 4. Unrated small eatery
    const unratedEateryScore = calculateLeadScore({
      business_name: 'Local Dhaba',
      category: 'Dhaba',
      rating: null,
      review_count: null,
      phone_number: null,
      website_url: null,
    });

    // Verification: Taj and Barbeque Nation significantly outrank the tiny kiosk and unrated eatery
    expect(tajScore.relevanceScore).toBeGreaterThan(80);
    expect(bbqScore.relevanceScore).toBeGreaterThan(75);
    expect(tinyKioskScore.relevanceScore).toBeLessThan(60);
    expect(unratedEateryScore.relevanceScore).toBeLessThan(40);
    expect(tajScore.relevanceScore).toBeGreaterThan(tinyKioskScore.relevanceScore);
  });
});
