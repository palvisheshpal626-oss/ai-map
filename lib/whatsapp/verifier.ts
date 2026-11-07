// lib/whatsapp/verifier.ts
// Truthful WhatsApp Availability Verification & Freshness Service
// Strictly prohibits guessing or falsely marking unverified numbers as available.
// Integrates with official WhatsApp Business Cloud API when credentials are provided,
// and enforces data integrity, verification timestamps, and change invalidation.

import { Restaurant, WhatsAppAvailabilityStatus, WhatsAppFilterOption, WhatsAppVerificationMethod } from '../types';
import { normalizeWhatsAppPhone, WhatsAppPhoneResult } from '../utils/whatsapp';
import { isValidPhoneNumber } from '../deduplication/deduplicator';

export interface WhatsAppVerificationResult {
  status: WhatsAppAvailabilityStatus;
  verifiedAt: string | null;
  verificationMethod: WhatsAppVerificationMethod | string | null;
  verifiedPhone: string | null;
  isAvailable: boolean;
  message: string;
}

export interface ManualWhatsAppVerificationInput {
  status: WhatsAppAvailabilityStatus;
  verificationMethod?: WhatsAppVerificationMethod | string | null;
  verifiedBy?: string | null;
  notes?: string | null;
  userConfirmed?: boolean;
}

export interface ManualWhatsAppVerificationResult {
  success: boolean;
  status: WhatsAppAvailabilityStatus;
  verifiedAt: string | null;
  verificationMethod: string | null;
  verifiedPhone: string | null;
  verifiedBy: string | null;
  verificationNotes: string | null;
  error?: string;
}

const DEFAULT_VERIFICATION_MAX_AGE_DAYS = 30;

/**
 * Predicate helpers for canonical and alias WhatsApp availability statuses.
 */
export function isVerifiedAvailable(status?: string | null): boolean {
  return status === 'whatsapp_available' || status === 'available_verified';
}

export function isVerifiedUnavailable(status?: string | null): boolean {
  return status === 'whatsapp_unavailable' || status === 'unavailable_verified';
}

export function isUnverified(status?: string | null): boolean {
  return (
    !status ||
    status === 'whatsapp_unknown' ||
    status === 'unknown' ||
    status === 'valid_number'
  );
}

export function isInvalidNumber(status?: string | null): boolean {
  return status === 'invalid_number';
}

/**
 * Creates a verified update payload for manual verification.
 * Requires explicit user confirmation and checks phone integrity.
 */
export function createManualVerificationUpdate(
  record: Partial<Restaurant>,
  input: ManualWhatsAppVerificationInput,
  countryContext?: string
): ManualWhatsAppVerificationResult {
  const targetStatus = input.status;
  const isAvailable = isVerifiedAvailable(targetStatus);
  const isUnavailable = isVerifiedUnavailable(targetStatus);

  if (isAvailable || isUnavailable) {
    if (input.userConfirmed === false) {
      return {
        success: false,
        status: record.whatsapp_status || 'whatsapp_unknown',
        verifiedAt: record.whatsapp_verified_at || null,
        verificationMethod: record.whatsapp_verification_method || null,
        verifiedPhone: record.whatsapp_verified_phone || null,
        verifiedBy: record.whatsapp_verified_by || null,
        verificationNotes: record.whatsapp_verification_notes || null,
        error: 'Explicit user confirmation is required to change WhatsApp availability status.',
      };
    }

    const rawPhone = record.phone_number;
    if (!rawPhone || !isValidPhoneNumber(rawPhone)) {
      return {
        success: false,
        status: 'invalid_number',
        verifiedAt: null,
        verificationMethod: null,
        verifiedPhone: null,
        verifiedBy: null,
        verificationNotes: null,
        error: 'Cannot verify WhatsApp availability: Phone number is missing or invalid.',
      };
    }

    const country = countryContext || record.country;
    const norm = normalizeWhatsAppPhone(rawPhone, country);
    if (!norm.isValid || !norm.normalizedPhone) {
      return {
        success: false,
        status: 'invalid_number',
        verifiedAt: null,
        verificationMethod: null,
        verifiedPhone: null,
        verifiedBy: null,
        verificationNotes: null,
        error: norm.error || 'Cannot verify WhatsApp availability: Phone number failed validation.',
      };
    }

    const canonicalStatus: WhatsAppAvailabilityStatus = isAvailable ? 'whatsapp_available' : 'whatsapp_unavailable';
    const method = input.verificationMethod || 'manual_user_check';
    const now = new Date().toISOString();

    return {
      success: true,
      status: canonicalStatus,
      verifiedAt: now,
      verificationMethod: method,
      verifiedPhone: norm.normalizedPhone,
      verifiedBy: input.verifiedBy || 'manual_operator',
      verificationNotes: input.notes || (isAvailable ? 'Manual verification confirmed in WhatsApp' : 'Manual verification confirmed not on WhatsApp'),
    };
  }

  // Reset to unverified / unknown
  return {
    success: true,
    status: 'whatsapp_unknown',
    verifiedAt: null,
    verificationMethod: null,
    verifiedPhone: null,
    verifiedBy: null,
    verificationNotes: input.notes || 'Verification reset to unverified by user',
  };
}

/**
 * Resolves the truthful initial WhatsApp status based on telephone numbering plan validation.
 * Crucial rule: Never classifies a number as 'whatsapp_available' merely because it has a valid format.
 */
export function determineInitialWhatsAppStatus(
  rawPhone?: string | null,
  countryContext?: string
): WhatsAppAvailabilityStatus {
  if (!rawPhone || !isValidPhoneNumber(rawPhone)) {
    return 'invalid_number';
  }

  const norm = normalizeWhatsAppPhone(rawPhone, countryContext);
  if (!norm.isValid) {
    return 'invalid_number';
  }

  // Format and numbering plan are valid, but WhatsApp registration remains unverified
  return 'whatsapp_unknown';
}

/**
 * Checks whether a recorded verification is still fresh (within maxAgeDays, default 30 days).
 */
export function isVerificationFresh(
  verifiedAt?: string | null,
  maxAgeDays: number = DEFAULT_VERIFICATION_MAX_AGE_DAYS
): boolean {
  if (!verifiedAt) return false;
  const verifiedTimestamp = new Date(verifiedAt).getTime();
  if (isNaN(verifiedTimestamp)) return false;

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return now - verifiedTimestamp <= maxAgeMs;
}

/**
 * Validates the integrity of an existing restaurant record's WhatsApp verification state.
 * Invariants:
 * 1. If the underlying phone number was modified, any previous verification is immediately invalidated.
 * 2. If the verification timestamp is stale (older than maxAgeDays), status reverts to 'whatsapp_unknown'.
 * 3. An invalid telephone number can never have status 'whatsapp_available'.
 */
export function validateVerificationIntegrity(
  record: Partial<Restaurant>,
  countryContext?: string
): {
  status: WhatsAppAvailabilityStatus;
  isFresh: boolean;
  invalidated: boolean;
  invalidationReason?: string;
} {
  const rawPhone = record.phone_number;
  if (!rawPhone || !isValidPhoneNumber(rawPhone)) {
    return {
      status: 'invalid_number',
      isFresh: false,
      invalidated: isVerifiedAvailable(record.whatsapp_status) || isVerifiedUnavailable(record.whatsapp_status),
      invalidationReason: 'Phone number is missing or invalid',
    };
  }

  const country = countryContext || record.country;
  const norm = normalizeWhatsAppPhone(rawPhone, country);
  if (!norm.isValid || !norm.normalizedPhone) {
    return {
      status: 'invalid_number',
      isFresh: false,
      invalidated: isVerifiedAvailable(record.whatsapp_status) || isVerifiedUnavailable(record.whatsapp_status),
      invalidationReason: norm.error || 'Phone failed numbering-plan validation',
    };
  }

  const currentStatus: WhatsAppAvailabilityStatus = record.whatsapp_status || 'whatsapp_unknown';

  // If record was previously marked verified (available or unavailable), verify integrity
  if (isVerifiedAvailable(currentStatus) || isVerifiedUnavailable(currentStatus)) {
    // 1. Phone matching invariant: Must match the exact normalized phone that was verified
    if (record.whatsapp_verified_phone && record.whatsapp_verified_phone !== norm.normalizedPhone) {
      return {
        status: 'whatsapp_unknown',
        isFresh: false,
        invalidated: true,
        invalidationReason: `Phone number changed from ${record.whatsapp_verified_phone} to ${norm.normalizedPhone}. Verification invalidated.`,
      };
    }

    // 2. Freshness invariant
    if (!isVerificationFresh(record.whatsapp_verified_at)) {
      return {
        status: 'whatsapp_unknown',
        isFresh: false,
        invalidated: true,
        invalidationReason: 'WhatsApp verification has expired. Retaining unverified state until re-checked.',
      };
    }

    return {
      status: currentStatus,
      isFresh: true,
      invalidated: false,
    };
  }

  return {
    status: currentStatus || 'whatsapp_unknown',
    isFresh: true,
    invalidated: false,
  };
}

/**
 * Verifies WhatsApp availability using officially supported mechanisms:
 * 1. Meta WhatsApp Business Cloud API (when WHATSAPP_API_TOKEN & WHATSAPP_PHONE_NUMBER_ID are configured).
 * 2. If no official API is configured, strictly returns 'whatsapp_unknown' and preserves unverified status.
 *
 * PROHIBITED: Scraping WhatsApp Web, reverse-engineering web sockets, or account enumeration.
 */
export async function verifyWhatsAppAvailability(
  rawPhone: string,
  countryContext?: string
): Promise<WhatsAppVerificationResult> {
  const norm = normalizeWhatsAppPhone(rawPhone, countryContext);
  if (!norm.isValid || !norm.normalizedPhone) {
    return {
      status: 'invalid_number',
      verifiedAt: null,
      verificationMethod: null,
      verifiedPhone: null,
      isAvailable: false,
      message: norm.error || 'Telephone number is invalid or cannot be parsed.',
    };
  }

  const normalizedPhone = norm.normalizedPhone;
  const token = process.env.WHATSAPP_API_TOKEN || process.env.META_WA_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Check if official WhatsApp Business Cloud API is configured
  if (!token || !phoneNumberId) {
    return {
      status: 'whatsapp_unknown',
      verifiedAt: null,
      verificationMethod: null,
      verifiedPhone: normalizedPhone,
      isAvailable: false,
      message:
        'Official Meta WhatsApp Business Cloud API is not configured. Retaining unverified status (whatsapp_unknown) to prevent unauthorized enumeration.',
    };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/contacts`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blocking: 'wait',
        contacts: [`+${normalizedPhone}`],
        force_check: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        status: 'whatsapp_unknown',
        verifiedAt: null,
        verificationMethod: null,
        verifiedPhone: normalizedPhone,
        isAvailable: false,
        message: `Meta API returned HTTP ${res.status}: ${errText}. Status kept unverified.`,
      };
    }

    const data = await res.json();
    const contact = data?.contacts?.[0];

    if (contact?.status === 'valid') {
      return {
        status: 'whatsapp_available',
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'whatsapp_business_api',
        verifiedPhone: normalizedPhone,
        isAvailable: true,
        message: 'WhatsApp availability successfully confirmed via Meta WhatsApp Business Cloud API.',
      };
    } else if (contact?.status === 'invalid') {
      return {
        status: 'whatsapp_unavailable',
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'whatsapp_business_api',
        verifiedPhone: normalizedPhone,
        isAvailable: false,
        message: 'Confirmed not registered on WhatsApp via Meta WhatsApp Business Cloud API.',
      };
    }

    return {
      status: 'whatsapp_unknown',
      verifiedAt: null,
      verificationMethod: null,
      verifiedPhone: normalizedPhone,
      isAvailable: false,
      message: 'Ambiguous response from Meta API. Retaining unverified status.',
    };
  } catch (err: any) {
    return {
      status: 'whatsapp_unknown',
      verifiedAt: null,
      verificationMethod: null,
      verifiedPhone: normalizedPhone,
      isAvailable: false,
      message: `Network or API failure during verification: ${err.message}. Retaining unverified status.`,
    };
  }
}

/**
 * Filter an array of restaurant records by WhatsApp availability option.
 */
export function filterRecordsByWhatsApp(
  records: Restaurant[],
  filter: WhatsAppFilterOption
): Restaurant[] {
  if (!filter || filter === 'all') {
    return records;
  }

  return records.filter(r => {
    const rawPhone = r.phone_number;
    const isPhoneValid = Boolean(rawPhone && isValidPhoneNumber(rawPhone));

    // Evaluate integrity of verification state
    const integrity = validateVerificationIntegrity(r);
    const effectiveStatus = integrity.status;

    switch (filter) {
      case 'whatsapp_available':
        // Must be explicitly verified as available with valid normalized phone
        return isVerifiedAvailable(effectiveStatus) && isPhoneValid && Boolean(r.normalized_phone || r.international_phone);

      case 'whatsapp_unverified':
        // Valid phone number whose WhatsApp status has not been confirmed
        return isPhoneValid && isUnverified(effectiveStatus);

      case 'whatsapp_unavailable':
        // Confirmed unregistered through supported verification
        return isVerifiedUnavailable(effectiveStatus);

      case 'invalid_number':
        // Phone number fails validation rules or missing
        return !isPhoneValid || isInvalidNumber(effectiveStatus);

      default:
        return true;
    }
  });
}
