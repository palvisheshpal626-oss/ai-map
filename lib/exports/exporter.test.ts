import { describe, it, expect } from 'vitest';
import { sanitizeSpreadsheetCell, generateCsvExport } from './exporter';
import { Restaurant } from '../types';

describe('Export Engine & CSV Injection Protection', () => {
  it('sanitizes formula injection characters (=, +, -, @, tab)', () => {
    expect(sanitizeSpreadsheetCell('=cmd|/C calc!A0')).toBe(`'=cmd|/C calc!A0`);
    expect(sanitizeSpreadsheetCell('+12345')).toBe(`'+12345`);
    expect(sanitizeSpreadsheetCell('@SUM(A1:A10)')).toBe(`'@SUM(A1:A10)`);
    expect(sanitizeSpreadsheetCell('Normal Name')).toBe('Normal Name');
  });

  it('generates CSV with UTF-8 BOM', () => {
    const restaurants: Restaurant[] = [
      {
        id: 'test-1',
        business_name: 'लखनऊ दस्तरख्वान (Lucknow Dastarkhwan)',
        normalized_name: 'lucknow dastarkhwan',
        category: 'Restaurant',
        formatted_address: 'Hazratganj, Lucknow',
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        phone_number: '9839012345',
        website_status: 'WEBSITE_NOT_LISTED',
        review_count: 50,
        data_completeness_score: 90,
        lead_score: 85,
        first_discovered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      },
    ];

    const csv = generateCsvExport(restaurants);
    // Starts with UTF-8 Byte Order Mark
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Lucknow Dastarkhwan');
    expect(csv).toContain('Restaurant Name');
  });
});
