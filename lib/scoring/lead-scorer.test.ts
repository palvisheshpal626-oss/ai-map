import { describe, it, expect } from 'vitest';
import { calculateLeadScore, DEFAULT_LEAD_WEIGHTS } from './lead-scorer';
import { Restaurant } from '../types';

describe('Lead Scoring Engine', () => {
  it('awards high priority score to restaurant with 4.5+ rating, 500+ reviews, phone, and no website', () => {
    const candidate: Partial<Restaurant> = {
      business_name: 'Dastarkhwan Mughlai',
      rating: 4.6,
      review_count: 850,
      phone_number: '+91 98390 12345',
      website_status: 'VERIFIED_NO_OFFICIAL_WEBSITE',
      formatted_address: 'Tulsi Theatre Building, Hazratganj, Lucknow, UP',
      locality: 'Hazratganj',
      latitude: 26.85,
      longitude: 80.94,
      category: 'Mughlai Restaurant',
    };

    const result = calculateLeadScore(candidate, DEFAULT_LEAD_WEIGHTS);
    expect(result.totalScore).toBeGreaterThanOrEqual(90);
    expect(result.breakdown.websiteScore).toBe(20);
    expect(result.breakdown.phoneScore).toBe(15);
    expect(result.breakdown.ratingScore).toBe(25);
    expect(result.breakdown.reviewScore).toBe(30);
  });

  it('gives 0 website score if restaurant already has an active website', () => {
    const candidate: Partial<Restaurant> = {
      business_name: 'Existing Chain Bistro',
      rating: 4.2,
      review_count: 100,
      website_status: 'WEBSITE_REACHABLE',
      website_url: 'https://example-bistro.com',
      phone_number: '0522-2621234',
    };

    const result = calculateLeadScore(candidate);
    expect(result.breakdown.websiteScore).toBe(0);
    expect(result.totalScore).toBeLessThan(80);
  });
});
