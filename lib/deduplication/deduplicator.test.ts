import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  normalizeBusinessName,
  findDuplicateRestaurant,
} from './deduplicator';
import { Restaurant } from '../types';

describe('Deduplication & Normalization Engine', () => {
  it('normalizes Indian phone numbers with various formats', () => {
    expect(normalizePhoneNumber('+91 98390 12345')).toBe('9839012345');
    expect(normalizePhoneNumber('09839012345')).toBe('9839012345');
    expect(normalizePhoneNumber('98390-12345')).toBe('9839012345');
    expect(normalizePhoneNumber(null)).toBe('');
  });

  it('normalizes business names by stripping common stop words', () => {
    expect(normalizeBusinessName('Royal Cafe & Restaurant')).toBe('royal');
    expect(normalizeBusinessName('Sharma Bhojnalaya and Dhaba')).toBe('sharma and');
  });

  it('detects duplicate via normalized phone number', () => {
    const existing: Restaurant[] = [
      {
        id: 'res-1',
        business_name: 'Awadh Biryani Corner',
        normalized_name: 'awadh biryani corner',
        category: 'Restaurant',
        formatted_address: 'Hazratganj, Lucknow',
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        phone_number: '+91 98390 55555',
        normalized_phone: '9839055555',
        website_status: 'WEBSITE_NOT_LISTED',
        review_count: 50,
        data_completeness_score: 80,
        lead_score: 75,
        first_discovered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      },
    ];

    const candidate: Partial<Restaurant> = {
      business_name: 'Awadh Biryani & Kebabs',
      phone_number: '098390-55555',
      district: 'Lucknow',
    };

    const dup = findDuplicateRestaurant(candidate, existing);
    expect(dup.isDuplicate).toBe(true);
    expect(dup.strategy).toBe('normalized_phone');
    expect(dup.matchedId).toBe('res-1');
  });
});
