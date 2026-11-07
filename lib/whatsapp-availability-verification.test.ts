import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  determineInitialWhatsAppStatus,
  isVerificationFresh,
  validateVerificationIntegrity,
  verifyWhatsAppAvailability,
  filterRecordsByWhatsApp,
  createManualVerificationUpdate,
  isVerifiedAvailable,
  isVerifiedUnavailable,
  isUnverified,
  isInvalidNumber,
} from './whatsapp/verifier';
import {
  normalizeWhatsAppPhone,
  buildWhatsAppUrl,
  resolveIsoCountryCode,
} from './utils/whatsapp';
import { Restaurant } from './types';
import { persistenceService } from './database/persistence-service';
import { store } from './store/memory-store';

describe('WhatsApp Availability Verification & International Filter Suite', () => {
  describe('1. Initial WhatsApp Status Truthfulness', () => {
    it('returns "whatsapp_unknown" for valid format phone numbers (NEVER "whatsapp_available")', () => {
      // Testing multiple countries with valid phone numbers
      const testCases = [
        { phone: '+91 98765 43210', country: 'IN' },
        { phone: '+1 (213) 788-1191', country: 'US' },
        { phone: '+44 7911 123456', country: 'GB' },
        { phone: '+65 6789 1234', country: 'SG' },
      ];

      for (const tc of testCases) {
        const status = determineInitialWhatsAppStatus(tc.phone, tc.country);
        expect(status).toBe('whatsapp_unknown');
        // Crucial invariant: never guess available
        expect(status).not.toBe('whatsapp_available');
      }
    });

    it('returns "invalid_number" for missing, empty, or non-numeric/junk phone numbers', () => {
      expect(determineInitialWhatsAppStatus(null, 'IN')).toBe('invalid_number');
      expect(determineInitialWhatsAppStatus(undefined, 'US')).toBe('invalid_number');
      expect(determineInitialWhatsAppStatus('', 'GB')).toBe('invalid_number');
      expect(determineInitialWhatsAppStatus('   ', 'CA')).toBe('invalid_number');
      expect(determineInitialWhatsAppStatus('not-a-phone', 'AU')).toBe('invalid_number');
      expect(determineInitialWhatsAppStatus('12345', 'IN')).toBe('invalid_number'); // too short
    });

    it('returns "invalid_number" for ambiguous 10-digit numbers lacking country context', () => {
      // A 10-digit number without a leading + and without country context that is not an Indian mobile
      const status = determineInitialWhatsAppStatus('4155552671', undefined);
      expect(status).toBe('invalid_number');
    });
  });

  describe('2. Verification Freshness Window (< 30 days)', () => {
    it('returns true when verified within 30 days', () => {
      const now = new Date();
      const freshDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
      expect(isVerificationFresh(freshDate, 30)).toBe(true);

      const veryFresh = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(); // 1 hour ago
      expect(isVerificationFresh(veryFresh, 30)).toBe(true);
    });

    it('returns false when verification is older than 30 days', () => {
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(); // 35 days ago
      expect(isVerificationFresh(expiredDate, 30)).toBe(false);
    });

    it('returns false for null, undefined, or invalid date strings', () => {
      expect(isVerificationFresh(null)).toBe(false);
      expect(isVerificationFresh(undefined)).toBe(false);
      expect(isVerificationFresh('invalid-date-string')).toBe(false);
    });
  });

  describe('3. Verification Integrity & Modification Invalidation', () => {
    const baseRestaurant: Partial<Restaurant> = {
      id: 'rest-us-001',
      business_name: 'Downtown Bistro',
      phone_number: '+1 (213) 788-1191',
      normalized_phone: '12137881191',
      international_phone: '+1 213-788-1191',
      country: 'US',
      city: 'Los Angeles',
      source_provider: 'google_places',
      qualification_status: 'qualified',
      whatsapp_status: 'whatsapp_available',
      whatsapp_verified_at: new Date().toISOString(),
      whatsapp_verification_method: 'whatsapp_business_api',
      whatsapp_verified_phone: '12137881191',
    };

    it('preserves verified status when phone number and freshness remain intact', () => {
      const result = validateVerificationIntegrity(baseRestaurant);
      expect(result.status).toBe('whatsapp_available');
      expect(result.isFresh).toBe(true);
      expect(result.invalidated).toBe(false);
    });

    it('invalidates verification back to "whatsapp_unknown" when phone number is edited', () => {
      const modifiedRestaurant: Partial<Restaurant> = {
        ...baseRestaurant,
        phone_number: '+1 (213) 788-9999', // Different phone number!
      };

      const result = validateVerificationIntegrity(modifiedRestaurant);
      expect(result.status).toBe('whatsapp_unknown');
      expect(result.invalidated).toBe(true);
      expect(result.invalidationReason).toContain('Phone number changed');
    });

    it('reverts verified status to "whatsapp_unknown" when verification timestamp expires', () => {
      const expiredRestaurant: Partial<Restaurant> = {
        ...baseRestaurant,
        whatsapp_verified_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
      };

      const result = validateVerificationIntegrity(expiredRestaurant);
      expect(result.status).toBe('whatsapp_unknown');
      expect(result.invalidated).toBe(true);
      expect(result.invalidationReason).toContain('expired');
    });

    it('returns "invalid_number" if phone number was modified to an invalid format', () => {
      const badPhoneRestaurant: Partial<Restaurant> = {
        ...baseRestaurant,
        phone_number: '123',
      };

      const result = validateVerificationIntegrity(badPhoneRestaurant);
      expect(result.status).toBe('invalid_number');
      expect(result.invalidated).toBe(true);
    });
  });

  describe('4. Official WhatsApp Availability Verification Service', () => {
    const originalEnv = process.env;
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
      global.fetch = originalFetch;
    });

    afterEach(() => {
      process.env = originalEnv;
      global.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('truthfully returns "whatsapp_unknown" when Meta WhatsApp credentials are not configured', async () => {
      delete process.env.WHATSAPP_API_TOKEN;
      delete process.env.META_WA_TOKEN;
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;

      const result = await verifyWhatsAppAvailability('+1 213-788-1191', 'US');
      expect(result.status).toBe('whatsapp_unknown');
      expect(result.isAvailable).toBe(false);
      expect(result.verificationMethod).toBeNull();
      expect(result.message).toContain('Meta WhatsApp Business Cloud API is not configured');
    });

    it('verifies registered numbers via Meta API when credentials are present', async () => {
      process.env.WHATSAPP_API_TOKEN = 'test-token';
      process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          contacts: [
            {
              input: '+12137881191',
              status: 'valid',
              wa_id: '12137881191',
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const result = await verifyWhatsAppAvailability('+1 213-788-1191', 'US');
      expect(result.status).toBe('whatsapp_available');
      expect(result.isAvailable).toBe(true);
      expect(result.verificationMethod).toBe('whatsapp_business_api');
      expect(result.verifiedPhone).toBe('12137881191');
      expect(result.verifiedAt).toBeTruthy();
    });

    it('truthfully marks unregistered numbers as "whatsapp_unavailable" when Meta API returns invalid status', async () => {
      process.env.WHATSAPP_API_TOKEN = 'test-token';
      process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          contacts: [
            {
              input: '+12137881191',
              status: 'invalid',
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const result = await verifyWhatsAppAvailability('+1 213-788-1191', 'US');
      expect(result.status).toBe('whatsapp_unavailable');
      expect(result.isAvailable).toBe(false);
      expect(result.verificationMethod).toBe('whatsapp_business_api');
      expect(result.message).toContain('Confirmed not registered');
    });
  });

  describe('5. Multi-Option WhatsApp Availability Filter Behavior', () => {
    const freshDate = new Date().toISOString();

    const sampleRestaurants: Partial<Restaurant>[] = [
      {
        id: '1',
        business_name: 'Verified Available Bistro',
        phone_number: '+1 (213) 788-1191',
        normalized_phone: '12137881191',
        country: 'US',
        source_provider: 'google_places',
        qualification_status: 'qualified',
        whatsapp_status: 'whatsapp_available',
        whatsapp_verified_at: freshDate,
        whatsapp_verification_method: 'whatsapp_business_api',
        whatsapp_verified_phone: '12137881191',
      },
      {
        id: '2',
        business_name: 'Unverified But Valid Restaurant',
        phone_number: '+44 20 7946 0991',
        normalized_phone: '442079460991',
        country: 'GB',
        source_provider: 'osm',
        qualification_status: 'qualified',
        whatsapp_status: 'whatsapp_unknown',
      },
      {
        id: '3',
        business_name: 'Confirmed Not On WhatsApp Cafe',
        phone_number: '+65 6789 1234',
        normalized_phone: '6567891234',
        country: 'SG',
        source_provider: 'osm',
        qualification_status: 'qualified',
        whatsapp_status: 'whatsapp_unavailable',
        whatsapp_verified_at: freshDate,
        whatsapp_verification_method: 'whatsapp_business_api',
        whatsapp_verified_phone: '6567891234',
      },
      {
        id: '4',
        business_name: 'Broken Phone Eatery',
        phone_number: '12345',
        country: 'IN',
        source_provider: 'osm',
        qualification_status: 'disqualified',
        whatsapp_status: 'invalid_number',
      },
      {
        id: '5',
        business_name: 'No Phone Kitchen',
        phone_number: undefined,
        country: 'AU',
        source_provider: 'osm',
        qualification_status: 'disqualified',
      },
      {
        id: '6',
        business_name: 'Stale Verification Restaurant (Originally Available 60 Days Ago)',
        phone_number: '+91 98765 43210',
        normalized_phone: '919876543210',
        country: 'IN',
        source_provider: 'osm',
        qualification_status: 'qualified',
        whatsapp_status: 'whatsapp_available',
        whatsapp_verified_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        whatsapp_verified_phone: '919876543210',
      },
    ];

    it('filter "all" returns all records without omission', () => {
      const results = filterRecordsByWhatsApp(sampleRestaurants as Restaurant[], 'all');
      expect(results).toHaveLength(6);
    });

    it('filter "whatsapp_available" returns ONLY active, fresh, verified available records', () => {
      const results = filterRecordsByWhatsApp(sampleRestaurants as Restaurant[], 'whatsapp_available');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
      // Record 6 is stale (60 days), so it must NOT be included in whatsapp_available!
      expect(results.some(r => r.id === '6')).toBe(false);
    });

    it('filter "whatsapp_unverified" returns valid phone numbers that have not been confirmed', () => {
      const results = filterRecordsByWhatsApp(sampleRestaurants as Restaurant[], 'whatsapp_unverified');
      // Record 2 is unverified. Record 6 is also treated as unverified because its verification expired!
      const ids = results.map(r => r.id);
      expect(ids).toContain('2');
      expect(ids).toContain('6');
      expect(ids).not.toContain('1'); // verified available
      expect(ids).not.toContain('3'); // verified unavailable
      expect(ids).not.toContain('4'); // invalid number
      expect(ids).not.toContain('5'); // no phone
    });

    it('filter "whatsapp_unavailable" returns confirmed unregistered numbers', () => {
      const results = filterRecordsByWhatsApp(sampleRestaurants as Restaurant[], 'whatsapp_unavailable');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('3');
    });

    it('filter "invalid_number" returns records with invalid phone or missing phone', () => {
      const results = filterRecordsByWhatsApp(sampleRestaurants as Restaurant[], 'invalid_number');
      const ids = results.map(r => r.id);
      expect(ids).toContain('4');
      expect(ids).toContain('5');
      expect(ids).not.toContain('1');
      expect(ids).not.toContain('2');
    });
  });

  describe('6. International WhatsApp Phone Normalization Across 10 Countries', () => {
    const testMatrix = [
      {
        country: 'IN',
        input: '098765 43210',
        expectedDigits: '919876543210',
        expectedUrl: 'https://wa.me/919876543210',
      },
      {
        country: 'US',
        input: '(213) 788-1191',
        expectedDigits: '12137881191',
        expectedUrl: 'https://wa.me/12137881191',
      },
      {
        country: 'GB',
        input: '07911 123456',
        expectedDigits: '447911123456',
        expectedUrl: 'https://wa.me/447911123456',
      },
      {
        country: 'CA',
        input: '(416) 555-0199',
        expectedDigits: '14165550199',
        expectedUrl: 'https://wa.me/14165550199',
      },
      {
        country: 'AU',
        input: '0412 345 678',
        expectedDigits: '61412345678',
        expectedUrl: 'https://wa.me/61412345678',
      },
      {
        country: 'NZ',
        input: '021 123 4567',
        expectedDigits: '64211234567',
        expectedUrl: 'https://wa.me/64211234567',
      },
      {
        country: 'IE',
        input: '085 123 4567',
        expectedDigits: '353851234567',
        expectedUrl: 'https://wa.me/353851234567',
      },
      {
        country: 'SG',
        input: '6789 1234',
        expectedDigits: '6567891234',
        expectedUrl: 'https://wa.me/6567891234',
      },
      {
        country: 'AE',
        input: '050 123 4567',
        expectedDigits: '971501234567',
        expectedUrl: 'https://wa.me/971501234567',
      },
      {
        country: 'ZA',
        input: '082 123 4567',
        expectedDigits: '27821234567',
        expectedUrl: 'https://wa.me/27821234567',
      },
    ];

    for (const item of testMatrix) {
      it(`correctly normalizes ${item.country} national phone number without prepending wrong country code`, () => {
        const norm = normalizeWhatsAppPhone(item.input, item.country);
        expect(norm.isValid).toBe(true);
        expect(norm.normalizedPhone).toBe(item.expectedDigits);

        const url = buildWhatsAppUrl(item.input, { countryCode: item.country, format: 'wa.me' });
        expect(url.url).toBe(item.expectedUrl);
        expect(url.waMeUrl).toBe(item.expectedUrl);
        // Canonical check: no +, no spaces, no dashes
        expect(url.url).not.toContain('+');
        expect(url.url).not.toContain(' ');
        expect(url.url).not.toContain('-');
      });
    }

    it('NEVER prepends 91 to US number without country context when in E.164 format (+1...)', () => {
      const norm = normalizeWhatsAppPhone('+1 213 788 1191', undefined);
      expect(norm.isValid).toBe(true);
      expect(norm.normalizedPhone).toBe('12137881191');
      expect(norm.normalizedPhone).not.toMatch(/^91/);
    });

    it('encodes pre-filled custom message in wa.me URL query parameter', () => {
      const url = buildWhatsAppUrl('+1 (213) 788-1191', {
        countryCode: 'US',
        format: 'wa.me',
        message: 'Hello! Interested in dining at your restaurant.',
      });
      expect(url.url).toBe(
        'https://wa.me/12137881191?text=Hello!%20Interested%20in%20dining%20at%20your%20restaurant.'
      );
    });
  });

  describe('7. ISO Country Code Resolution', () => {
    it('resolves country names and ISO codes for all 10 target countries', () => {
      expect(resolveIsoCountryCode('India')).toBe('IN');
      expect(resolveIsoCountryCode('United States')).toBe('US');
      expect(resolveIsoCountryCode('United Kingdom')).toBe('GB');
      expect(resolveIsoCountryCode('Canada')).toBe('CA');
      expect(resolveIsoCountryCode('Australia')).toBe('AU');
      expect(resolveIsoCountryCode('New Zealand')).toBe('NZ');
      expect(resolveIsoCountryCode('Ireland')).toBe('IE');
      expect(resolveIsoCountryCode('Singapore')).toBe('SG');
      expect(resolveIsoCountryCode('United Arab Emirates')).toBe('AE');
      expect(resolveIsoCountryCode('South Africa')).toBe('ZA');
    });

    it('is case-insensitive and trims whitespace', () => {
      expect(resolveIsoCountryCode('  us  ')).toBe('US');
      expect(resolveIsoCountryCode('SINGAPORE')).toBe('SG');
      expect(resolveIsoCountryCode('dubai')).toBe('AE');
    });
  });

  describe('8. Manual WhatsApp Availability Verification Workflow', () => {
    const testLead: Partial<Restaurant> = {
      id: 'lead-manual-001',
      business_name: 'Tokyo Ramen Bar',
      phone_number: '+1 (415) 555-2671',
      country: 'US',
      whatsapp_status: 'whatsapp_unknown',
    };

    it('requires explicit user confirmation when marking a lead as verified available', () => {
      const result = createManualVerificationUpdate(testLead, {
        status: 'whatsapp_available',
        userConfirmed: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Explicit user confirmation is required');
      expect(result.status).toBe('whatsapp_unknown');
    });

    it('sets verified status, timestamp, manual method, and normalized phone on confirmed available', () => {
      const result = createManualVerificationUpdate(testLead, {
        status: 'whatsapp_available',
        userConfirmed: true,
        verifiedBy: 'analyst_sarah',
        notes: 'Called and exchanged business menu via WhatsApp Business chat',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('whatsapp_available');
      expect(isVerifiedAvailable(result.status)).toBe(true);
      expect(result.verificationMethod).toBe('manual_user_check');
      expect(result.verifiedPhone).toBe('14155552671');
      expect(result.verifiedBy).toBe('analyst_sarah');
      expect(result.verifiedAt).toBeTruthy();
      expect(result.verificationNotes).toContain('WhatsApp Business chat');
    });

    it('fails gracefully when attempting to mark an invalid phone number as verified', () => {
      const badLead: Partial<Restaurant> = {
        id: 'bad-001',
        business_name: 'Ghost Eatery',
        phone_number: 'invalid-phone-string',
        country: 'US',
      };

      const result = createManualVerificationUpdate(badLead, {
        status: 'whatsapp_available',
        userConfirmed: true,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('invalid_number');
      expect(result.error).toMatch(/missing or invalid|failed validation/);
    });

    it('supports confirmed unavailable status via manual user check', () => {
      const result = createManualVerificationUpdate(testLead, {
        status: 'whatsapp_unavailable',
        userConfirmed: true,
        verifiedBy: 'operator_alex',
        notes: 'Contact confirmed landline-only with no WhatsApp registration',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('whatsapp_unavailable');
      expect(isVerifiedUnavailable(result.status)).toBe(true);
      expect(result.verificationMethod).toBe('manual_user_check');
      expect(result.verifiedPhone).toBe('14155552671');
      expect(result.verifiedBy).toBe('operator_alex');
    });

    it('resets verification to unverified (unknown) and clears verification metadata', () => {
      const verifiedLead: Partial<Restaurant> = {
        ...testLead,
        whatsapp_status: 'whatsapp_available',
        whatsapp_verified_at: new Date().toISOString(),
        whatsapp_verification_method: 'manual_user_check',
        whatsapp_verified_phone: '14155552671',
        whatsapp_verified_by: 'analyst_sarah',
      };

      const result = createManualVerificationUpdate(verifiedLead, {
        status: 'whatsapp_unknown',
        notes: 'Resetting because owner changed management',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('whatsapp_unknown');
      expect(isUnverified(result.status)).toBe(true);
      expect(result.verifiedAt).toBeNull();
      expect(result.verificationMethod).toBeNull();
      expect(result.verifiedPhone).toBeNull();
      expect(result.verifiedBy).toBeNull();
    });

    it('persists manual verification through persistenceService and updates memory-store cache', async () => {
      const leadId = 'test-persist-verify-' + Date.now();
      const initialLead: Restaurant = {
        id: leadId,
        business_name: 'Verified Sushi Express',
        normalized_name: 'verified sushi express',
        category: 'Japanese Restaurant',
        formatted_address: '123 Market St, San Francisco, CA',
        state: 'California',
        district: 'San Francisco County',
        country: 'US',
        phone_number: '+1 415-555-0199',
        normalized_phone: '14155550199',
        website_status: 'WEBSITE_NOT_LISTED',
        review_count: 50,
        data_completeness_score: 80,
        lead_score: 75,
        whatsapp_status: 'whatsapp_unknown',
        first_discovered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      };

      // Save to memory store first
      store.saveRestaurant(initialLead);
      expect(store.getRestaurantById(leadId)?.whatsapp_status).toBe('whatsapp_unknown');

      // Update via persistenceService
      const updateRes = await persistenceService.updateWhatsAppVerification(leadId, {
        status: 'whatsapp_available',
        userConfirmed: true,
        verifiedBy: 'qa_agent',
        notes: 'Manually verified via WhatsApp web chat response',
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.restaurant?.whatsapp_status).toBe('whatsapp_available');
      expect(updateRes.restaurant?.whatsapp_verified_phone).toBe('14155550199');
      expect(updateRes.restaurant?.whatsapp_verified_by).toBe('qa_agent');
      expect(updateRes.restaurant?.whatsapp_verification_method).toBe('manual_user_check');

      // Verify memory store was updated immediately
      const cached = store.getRestaurantById(leadId);
      expect(cached?.whatsapp_status).toBe('whatsapp_available');
      expect(cached?.whatsapp_verified_phone).toBe('14155550199');

      // Now verify invalidation: if phone number is edited in saveRestaurant, verification must be invalidated
      const edited = store.saveRestaurant({
        ...cached,
        phone_number: '+1 415-555-9999', // New phone!
      });

      expect(edited.restaurant.whatsapp_status).toBe('whatsapp_unknown');
      expect(edited.restaurant.whatsapp_verified_at).toBeNull();
      expect(edited.restaurant.whatsapp_verified_phone).toBeNull();
    });

    it('updates filter results dynamically after manual verification without needing a restart', () => {
      const records: Restaurant[] = [
        {
          id: 'dyn-1',
          business_name: 'Lead 1',
          normalized_name: 'lead 1',
          category: 'Cafe',
          formatted_address: 'London, UK',
          state: 'London',
          district: 'Camden',
          country: 'GB',
          phone_number: '+44 7911 123456',
          normalized_phone: '447911123456',
          website_status: 'WEBSITE_NOT_LISTED',
          review_count: 10,
          data_completeness_score: 70,
          lead_score: 65,
          whatsapp_status: 'whatsapp_unknown',
          first_discovered_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
        },
      ];

      // Initially, unverified
      let availableFiltered = filterRecordsByWhatsApp(records, 'whatsapp_available');
      let unverifiedFiltered = filterRecordsByWhatsApp(records, 'whatsapp_unverified');
      expect(availableFiltered).toHaveLength(0);
      expect(unverifiedFiltered).toHaveLength(1);

      // Now update lead 1 to verified available
      records[0] = {
        ...records[0],
        whatsapp_status: 'whatsapp_available',
        whatsapp_verified_at: new Date().toISOString(),
        whatsapp_verification_method: 'manual_user_check',
        whatsapp_verified_phone: '447911123456',
      };

      // Re-filter immediately: available must be 1, unverified must be 0
      availableFiltered = filterRecordsByWhatsApp(records, 'whatsapp_available');
      unverifiedFiltered = filterRecordsByWhatsApp(records, 'whatsapp_unverified');
      expect(availableFiltered).toHaveLength(1);
      expect(unverifiedFiltered).toHaveLength(0);
    });
  });
});
