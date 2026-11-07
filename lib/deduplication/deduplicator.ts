// lib/deduplication/deduplicator.ts
// Deterministic deduplication & normalization engine for restaurant and business leads
// Powered by libphonenumber-js for strict international E.164 compliance and multi-country support

import { Restaurant } from '../types';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export interface DeduplicationMatch {
  isDuplicate: boolean;
  matchedId?: string;
  strategy?: 'exact_source_id' | 'exact_place_id' | 'normalized_phone' | 'normalized_name_address' | 'fuzzy_match';
  confidence: 'exact' | 'high' | 'medium' | 'none';
}

const INVALID_PHONE_PLACEHOLDERS = new Set([
  'unavailable',
  'n/a',
  'na',
  'null',
  'undefined',
  'none',
  'missing',
  'not listed',
  'not available',
  'not provided',
  'unknown',
  'nil',
  '-',
  '--',
  '0',
]);

/**
 * Validates whether a raw phone string contains a genuine, non-placeholder telephone number.
 * Strict rules:
 * - Must not be null, undefined, whitespace, or placeholders ("Unavailable", "N/A", "null", etc.)
 * - Must contain between 8 and 15 digits (standard E.164 / Indian telephone ranges)
 * - Must not be repeated dummy digits (e.g. 0000000000, 1111111111)
 */
export function isValidPhoneNumber(rawPhone?: string | null): boolean {
  if (!rawPhone) return false;
  const trimmed = rawPhone.trim().toLowerCase();
  if (!trimmed) return false;
  if (INVALID_PHONE_PLACEHOLDERS.has(trimmed)) return false;

  // Extract digits
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return false;

  // Reject repeating dummy digits like 00000000, 9999999999
  if (/^(\d)\1+$/.test(digits)) return false;

  return true;
}

export const hasValidPhoneNumber = isValidPhoneNumber;

/**
 * Normalizes phone numbers (handles country-specific prefixes, Indian 10-digit mobile, STD codes, dashes, spaces)
 * Returns plain digit string for reliable matching and storage as text, or '' if invalid.
 * Uses libphonenumber-js when countryCode or leading '+' is provided.
 */
export function normalizePhoneNumber(rawPhone?: string | null, countryCode?: string): string {
  if (!isValidPhoneNumber(rawPhone)) return '';

  // Strip all non-digit characters
  const digits = rawPhone!.replace(/\D/g, '');
  if (!digits) return '';

  // Handle Indian number normalization (standard 10-digit mobile)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.substring(1);
  }
  if (digits.length === 10 && (!countryCode || countryCode.toUpperCase() === 'IN' || countryCode.toUpperCase() === 'INDIA')) {
    return digits;
  }

  // For other countries or explicit country code, parse using libphonenumber-js
  if (countryCode && countryCode.toUpperCase() !== 'IN') {
    try {
      const parsed = parsePhoneNumberFromString(rawPhone!.trim(), countryCode.toUpperCase() as CountryCode);
      if (parsed && parsed.isValid()) {
        return parsed.number.replace('+', '');
      }
    } catch {}
  }

  return digits;
}

/**
 * Normalizes an international phone number to E.164 string format (e.g. +14155552671 or +919936232969)
 */
export function normalizeInternationalPhone(rawPhone?: string | null, defaultCountryCode: string = 'IN'): string | null {
  if (!rawPhone || !isValidPhoneNumber(rawPhone)) return null;
  const trimmed = rawPhone.trim();
  const cCode = (trimmed.startsWith('+') ? undefined : (defaultCountryCode.toUpperCase() as CountryCode));
  const parsed = parsePhoneNumberFromString(trimmed, cCode);
  if (parsed && parsed.isValid()) {
    return parsed.format('E.164');
  }
  return formatInternationalPhone(rawPhone, defaultCountryCode);
}

/**
 * Formats an Indian or international phone number cleanly into standard readable format
 */
export function formatInternationalPhone(rawPhone?: string | null, countryCode?: string): string | null {
  if (!rawPhone) return null;
  const trimmed = rawPhone.trim();
  if (!isValidPhoneNumber(trimmed)) return null;

  // Attempt libphonenumber-js formatting first
  try {
    const cCode = (countryCode?.toUpperCase() || (trimmed.startsWith('+') ? undefined : 'IN')) as CountryCode | undefined;
    const parsed = parsePhoneNumberFromString(trimmed, cCode);
    if (parsed && parsed.isValid()) {
      return parsed.formatInternational();
    }
  } catch {}

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  // Indian standard 10-digit mobile
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  // 12-digit Indian with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    const main = digits.slice(2);
    return `+91 ${main.slice(0, 5)} ${main.slice(5)}`;
  }
  // 11-digit Indian with leading 0
  if (digits.length === 11 && digits.startsWith('0')) {
    const main = digits.slice(1);
    return `+91 ${main.slice(0, 5)} ${main.slice(5)}`;
  }

  // Already prefixed international or other length
  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  return `+${digits}`;
}

/**
 * Normalizes email address for consistent comparison
 */
export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const cleaned = email.trim().toLowerCase();
  if (!cleaned.includes('@') || cleaned.length < 5) return null;
  return cleaned;
}

/**
 * Normalizes business names for matching
 */
export function normalizeBusinessName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(restaurant|restro|dhaba|cafe|hotel|fast food|sweets|bakery|bhojnalaya|bar|kitchen)\b/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes street/address strings
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  return address
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(road|rd|marg|street|near|opposite|opp|behind|lane|sector|sec)\b/g, '')
    .trim();
}

/**
 * Checks candidate restaurant against an existing pool of restaurants
 */
export function findDuplicateRestaurant(
  candidate: Partial<Restaurant>,
  existingPool: (Restaurant | Partial<Restaurant>)[]
): DeduplicationMatch {
  const candSourceId = candidate.source_record_id || (candidate.id?.startsWith('osm-') ? candidate.id : null);
  const candNormPhone = normalizePhoneNumber(candidate.phone_number);
  const candNormEmail = normalizeEmail(candidate.email);
  const candNormName = normalizeBusinessName(candidate.business_name || '');
  const candNormAddr = normalizeAddress(candidate.formatted_address || '');

  for (const existing of existingPool) {
    // 1. Direct Source Record ID match (e.g. osm-node-12345 or osm-way-67890)
    const existSourceId = existing.source_record_id || (existing.id?.startsWith('osm-') ? existing.id : null);
    if (candSourceId && existSourceId && candSourceId === existSourceId) {
      return { isDuplicate: true, matchedId: existing.id || '', strategy: 'exact_source_id', confidence: 'exact' };
    }

    // 2. Direct internal ID match
    if (candidate.id && existing.id && existing.id === candidate.id) {
      return { isDuplicate: true, matchedId: existing.id, strategy: 'exact_place_id', confidence: 'exact' };
    }

    // 3. Normalized phone number match (if phone has at least 8 digits)
    const existNormPhone = normalizePhoneNumber(existing.phone_number);
    if (candNormPhone && existNormPhone && candNormPhone.length >= 8 && candNormPhone === existNormPhone) {
      return { isDuplicate: true, matchedId: existing.id || '', strategy: 'normalized_phone', confidence: 'high' };
    }

    // 4. Normalized email match (if email is present on both)
    if (candNormEmail && existing.email && candNormEmail === normalizeEmail(existing.email)) {
      return { isDuplicate: true, matchedId: existing.id || '', strategy: 'exact_place_id', confidence: 'high' };
    }

    // 5. Normalized Name + Normalized Address in same District or State
    const existNormName = normalizeBusinessName(existing.business_name || '');
    const existNormAddr = normalizeAddress(existing.formatted_address || '');

    // Strict geographic check: reject if explicitly different districts or cities
    const conflictingDistrict = Boolean(
      candidate.district && existing.district && candidate.district.toLowerCase() !== existing.district.toLowerCase()
    );
    const conflictingCity = Boolean(
      candidate.city && existing.city && candidate.city.toLowerCase() !== existing.city.toLowerCase()
    );
    if (conflictingDistrict || conflictingCity) {
      continue;
    }

    const sameLocation =
      Boolean(
        (candidate.city && existing.city && candidate.city.toLowerCase() === existing.city.toLowerCase()) ||
        (candidate.district && existing.district && candidate.district.toLowerCase() === existing.district.toLowerCase()) ||
        (candidate.state && existing.state && candidate.state.toLowerCase() === existing.state.toLowerCase())
      );

    if (sameLocation && candNormName && existNormName && candNormName === existNormName) {
      // If address also shares substantial tokens or matches
      if (candNormAddr && existNormAddr) {
        const addrTokens = candNormAddr.split(' ').filter(t => t.length > 2);
        const matchTokens = addrTokens.filter(t => existNormAddr.includes(t));
        if (matchTokens.length >= 1 || candNormAddr.includes(existNormAddr) || existNormAddr.includes(candNormAddr)) {
          return {
            isDuplicate: true,
            matchedId: existing.id,
            strategy: 'normalized_name_address',
            confidence: 'high',
          };
        }
      }
    }
  }

  return { isDuplicate: false, confidence: 'none' };
}
