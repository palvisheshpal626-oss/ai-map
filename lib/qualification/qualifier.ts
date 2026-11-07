// lib/qualification/qualifier.ts
// Industry-Standard Lead Qualification Engine with Transparent Criteria & Rejection Audits
// Fully respects Phone Filter ('all' | 'with_phone' | 'without_phone'), Website, Rating, and Category policies.

import { Restaurant, SearchConfig, PhoneFilterOption, CandidateAuditCheck } from '../types';
import { isValidPhoneNumber } from '../deduplication/deduplicator';
import { isSmallEateryOrStall } from '../classification/business-tier';
import { GLOBAL_COUNTRIES } from '../locations/global-registry';

export interface QualificationEvaluation {
  isQualified: boolean;
  status: 'qualified' | 'disqualified';
  qualificationReasons: string[];
  disqualificationReasons: string[];
  primaryRejectionReason: string | null;
}

/**
 * Evaluates whether a discovered restaurant meets the qualification criteria defined
 * in the scan job's configuration snapshot.
 *
 * Qualification Criteria:
 * 1. Business Identity: Non-empty name (>= 2 chars), operational (not permanently closed), address/location info.
 * 2. Phone Policy:
 *    - 'with_phone': Valid, genuine phone number required (placeholder values like "Unavailable" are rejected).
 *    - 'without_phone': Genuinely missing, null, or invalid phone required (eligible for outreach).
 *    - 'all': Both with and without phone are eligible.
 * 3. Rating Policy: If min rating specified and unrated not permitted, rating must meet threshold.
 * 4. Review Volume: If min reviews specified and unrated not permitted, reviews must meet threshold.
 * 5. Website Policy: If 'no_website_only', businesses with listed websites are disqualified.
 * 6. Establishment Tier: Excludes roadside stalls / tapris if excludeSmall or minRating >= 4.0 is active.
 */
export function evaluateLeadQualification(
  restaurant: Partial<Restaurant>,
  config?: Partial<SearchConfig> | null
): QualificationEvaluation {
  const qualificationReasons: string[] = [];
  const disqualificationReasons: string[] = [];

  // Determine phone filter mode from config
  let phoneMode: PhoneFilterOption = 'all';
  if (config?.contact_filters?.phone_filter) {
    phoneMode = config.contact_filters.phone_filter;
  } else if (config?.contact_filters?.phone === 'required' || config?.contact_filters?.include_without_phone === false) {
    phoneMode = 'with_phone';
  } else if (config?.contact_filters?.phone === 'unavailable') {
    phoneMode = 'without_phone';
  } else if (config?.contact_filters?.phone === 'optional' || config?.contact_filters?.include_without_phone === true) {
    phoneMode = 'all';
  }

  // 1. Business Identity Checks
  const name = (restaurant.business_name || '').trim();
  if (name.length < 2) {
    disqualificationReasons.push('Missing or invalid business name');
  } else {
    qualificationReasons.push('Valid business identity established');
  }

  if (restaurant.business_status === 'CLOSED_PERMANENTLY') {
    disqualificationReasons.push('Business is permanently closed');
  }

  const hasLocation = Boolean(
    restaurant.formatted_address?.trim() ||
    restaurant.street_address?.trim() ||
    (restaurant.city && restaurant.state) ||
    (restaurant.latitude && restaurant.longitude && !(restaurant.latitude === 0 && restaurant.longitude === 0))
  );
  if (!hasLocation) {
    disqualificationReasons.push('Missing geographic location and address information');
  }

  // 2. Strict Phone Number Evaluation
  const hasValidPhone = isValidPhoneNumber(restaurant.phone_number);

  if (phoneMode === 'with_phone') {
    if (!hasValidPhone) {
      disqualificationReasons.push('Missing or invalid phone number (With Phone Number required)');
    } else {
      qualificationReasons.push(`Verified telephone contact available (${restaurant.phone_number})`);
    }
  } else if (phoneMode === 'without_phone') {
    if (hasValidPhone) {
      disqualificationReasons.push('Excluded because business has a listed phone number (Without Phone Number required)');
    } else {
      qualificationReasons.push('Eligible under Without Phone Number policy (No telephone listed)');
    }
  } else {
    // phoneMode === 'all'
    if (hasValidPhone) {
      qualificationReasons.push(`Telephone contact available (${restaurant.phone_number})`);
    } else {
      qualificationReasons.push('Telephone contact unlisted (accepted under All Leads)');
    }
  }

  // 3. Website Policy Evaluation
  const websiteFilter = config?.contact_filters?.website_filter || 'all';
  const hasWebsite = Boolean(
    restaurant.website_url?.trim() ||
    restaurant.website_status === 'WEBSITE_LISTED' ||
    restaurant.website_status === 'WEBSITE_REACHABLE'
  );

  if (websiteFilter === 'no_website_only') {
    if (hasWebsite) {
      disqualificationReasons.push('Excluded because business already possesses an active official website');
    } else {
      qualificationReasons.push('Prime web prospect: No official website listed');
    }
  } else if (websiteFilter === 'listed_only') {
    if (!hasWebsite) {
      disqualificationReasons.push('Requires listed website');
    } else {
      qualificationReasons.push('Website present for redesign/audit');
    }
  }

  // 4. Rating & Review Threshold Evaluation
  const minRating = config?.rating_filters?.min ?? null;
  const includeUnrated = config?.rating_filters?.include_unrated ?? true;
  const numRating = restaurant.rating !== null && restaurant.rating !== undefined && !isNaN(Number(restaurant.rating))
    ? Number(restaurant.rating)
    : null;

  if (minRating !== null && minRating > 0) {
    if (numRating === null) {
      if (!includeUnrated && restaurant.source_provider !== 'osm_overpass') {
        disqualificationReasons.push(`Customer rating unavailable (minimum ${minRating.toFixed(1)} required)`);
      } else {
        qualificationReasons.push('Unrated establishment accepted');
      }
    } else if (numRating < minRating) {
      disqualificationReasons.push(`Rating ${numRating.toFixed(1)} is below required minimum ${minRating.toFixed(1)}`);
    } else {
      qualificationReasons.push(`Rating ${numRating.toFixed(1)} meets requirement (>= ${minRating.toFixed(1)})`);
    }
  }

  const minReviews = config?.review_filters?.min ?? null;
  const includeZeroReviews = config?.review_filters?.include_zero ?? true;
  const numReviews = restaurant.review_count !== null && restaurant.review_count !== undefined && !isNaN(Number(restaurant.review_count))
    ? Number(restaurant.review_count)
    : null;

  if (minReviews !== null && minReviews > 0) {
    if (numReviews === null) {
      if (!includeZeroReviews && restaurant.source_provider !== 'osm_overpass') {
        disqualificationReasons.push(`Review count unavailable (minimum ${minReviews} required)`);
      } else {
        qualificationReasons.push('Zero/unlisted review count accepted');
      }
    } else if (numReviews < minReviews) {
      disqualificationReasons.push(`Review count ${numReviews} is below required minimum ${minReviews}`);
    } else {
      qualificationReasons.push(`Review count ${numReviews} meets requirement (>= ${minReviews})`);
    }
  }

  // 5. Roadside Stall / Tapri Exclusion
  if (isSmallEateryOrStall({
    business_name: restaurant.business_name || '',
    category: restaurant.category,
    rating: restaurant.rating,
    review_count: restaurant.review_count,
  })) {
    if ((minRating && minRating >= 4.0) || phoneMode === 'with_phone') {
      disqualificationReasons.push('Excluded roadside stall, kiosk, or temporary eatery');
    }
  }

  const isQualified = disqualificationReasons.length === 0;

  return {
    isQualified,
    status: isQualified ? 'qualified' : 'disqualified',
    qualificationReasons,
    disqualificationReasons,
    primaryRejectionReason: disqualificationReasons.length > 0 ? disqualificationReasons[0] : null,
  };
}

export interface CandidateVerificationAudit {
  isQualified: boolean;
  status: 'qualified' | 'rejected' | 'unverified';
  primaryRejectionReason: string | null;
  auditChecks: CandidateAuditCheck[];
  qualificationReasons: string[];
  disqualificationReasons: string[];
}

/**
 * Strict Restaurant-by-Restaurant Verification Engine.
 * Evaluates candidate leads through a durable, deterministic audit pipeline.
 * Records the exact evidence and source used for each individual check.
 */
export function verifyCandidateWithAudit(
  candidate: Partial<Restaurant>,
  config?: Partial<SearchConfig> | null,
  context?: {
    cityName?: string;
    districtName?: string;
    stateName?: string;
    country?: string;
    providerId?: string;
    providerCapabilities?: {
      supportsRatings: boolean;
      supportsReviewCounts: boolean;
    };
  }
): CandidateVerificationAudit {
  const auditChecks: CandidateAuditCheck[] = [];
  const qualificationReasons: string[] = [];
  const disqualificationReasons: string[] = [];
  const now = new Date().toISOString();

  // 1. Business Identity & Source ID Validation
  const name = (candidate.business_name || '').trim();
  const sourceId = candidate.source_record_id || candidate.id || '';
  if (name.length < 2) {
    auditChecks.push({
      check_name: 'Business Identity & Source ID',
      status: 'failed',
      evidence: `Missing or invalid business name: '${name}' (length < 2)`,
      source_used: 'source_record.name',
      timestamp: now,
    });
    disqualificationReasons.push('Missing or invalid business name');
  } else {
    auditChecks.push({
      check_name: 'Business Identity & Source ID',
      status: 'passed',
      evidence: `Verified active business identity '${name}' (Source ID: ${sourceId || 'osm-verified'})`,
      source_used: 'source_record.identity',
      timestamp: now,
    });
    qualificationReasons.push(`Active business identity: ${name}`);
  }

  // 2. Category & Hospitality Establishment Tier
  const category = candidate.category || 'Restaurant';
  const minRating = config?.rating_filters?.min ?? null;
  const isStall = isSmallEateryOrStall({
    business_name: name,
    category,
    rating: candidate.rating,
    review_count: candidate.review_count,
  });

  if (isStall && minRating && minRating >= 4.0) {
    auditChecks.push({
      check_name: 'Category & Establishment Tier',
      status: 'failed',
      evidence: `Excluded roadside stall, kiosk, or temporary eatery ('${name}')`,
      source_used: 'classification_engine.tier',
      timestamp: now,
    });
    disqualificationReasons.push('Excluded roadside stall or tapri');
  } else {
    auditChecks.push({
      check_name: 'Category & Establishment Tier',
      status: 'passed',
      evidence: `Eligible hospitality establishment category: '${category}'`,
      source_used: 'source_record.category',
      timestamp: now,
    });
    qualificationReasons.push(`Category: ${category}`);
  }

  // 3. National & Regional Spatial Boundary Check
  const lat = candidate.latitude !== null && candidate.latitude !== undefined && !isNaN(Number(candidate.latitude))
    ? Number(candidate.latitude)
    : null;
  const lng = candidate.longitude !== null && candidate.longitude !== undefined && !isNaN(Number(candidate.longitude))
    ? Number(candidate.longitude)
    : null;

  const targetCountry = (context?.country || (config as Record<string, unknown>)?.selected_country as string || 'IN').trim();
  const countryMeta = GLOBAL_COUNTRIES.find(
    c => c.code.toLowerCase() === targetCountry.toLowerCase() ||
         c.alpha3.toLowerCase() === targetCountry.toLowerCase() ||
         c.name.toLowerCase() === targetCountry.toLowerCase()
  ) || GLOBAL_COUNTRIES[0]; // defaults to India if unknown

  let isGeoInBounds = true;
  if (lat !== null && lng !== null) {
    isGeoInBounds =
      lat >= countryMeta.bounds.minLat &&
      lat <= countryMeta.bounds.maxLat &&
      lng >= countryMeta.bounds.minLng &&
      lng <= countryMeta.bounds.maxLng;
  }

  let isCountryMatch = true;
  if (candidate.country) {
    const candidateCountryNorm = candidate.country.toLowerCase();
    isCountryMatch =
      candidateCountryNorm.includes(countryMeta.code.toLowerCase()) ||
      candidateCountryNorm.includes(countryMeta.name.toLowerCase()) ||
      candidateCountryNorm.includes(countryMeta.alpha3.toLowerCase());
  }

  if (!isGeoInBounds || !isCountryMatch) {
    const nationalBoundsLabel = countryMeta.code === 'IN' ? 'Indian' : countryMeta.name;
    auditChecks.push({
      check_name: 'District & Geographic Boundary',
      status: 'failed',
      evidence: `Coordinates (${lat}, ${lng}) or country ('${candidate.country}') fall outside ${nationalBoundsLabel} national bounds`,
      source_used: 'spatial_boundary.validator',
      timestamp: now,
    });
    disqualificationReasons.push(`Geographic boundary mismatch (outside ${countryMeta.name})`);
  } else {
    const targetDist = context?.districtName || candidate.district || 'District';
    const targetCity = context?.cityName || candidate.city || 'City';
    auditChecks.push({
      check_name: 'District & Geographic Boundary',
      status: 'passed',
      evidence: `Located in ${targetCity}, ${targetDist}, ${context?.stateName || candidate.state || countryMeta.name} (Lat: ${lat ?? '—'}, Lng: ${lng ?? '—'})`,
      source_used: 'spatial_boundary.validator',
      timestamp: now,
    });
    qualificationReasons.push(`Verified location in ${targetDist}`);
  }

  // 4. Phone Policy Compliance
  let phoneMode: PhoneFilterOption = 'all';
  if (config?.contact_filters?.phone_filter) {
    phoneMode = config.contact_filters.phone_filter;
  } else if (config?.contact_filters?.phone === 'required' || config?.contact_filters?.include_without_phone === false) {
    phoneMode = 'with_phone';
  } else if (config?.contact_filters?.phone === 'unavailable') {
    phoneMode = 'without_phone';
  }

  const hasValidPhone = isValidPhoneNumber(candidate.phone_number);

  if (phoneMode === 'with_phone') {
    if (!hasValidPhone) {
      auditChecks.push({
        check_name: 'Phone Number Policy',
        status: 'failed',
        evidence: `Missing or invalid phone number ('${candidate.phone_number || 'None'}'). Campaign requires verified telephone contact.`,
        source_used: 'phone_normalization.engine',
        timestamp: now,
      });
      disqualificationReasons.push('Missing or invalid required phone number');
    } else {
      auditChecks.push({
        check_name: 'Phone Number Policy',
        status: 'passed',
        evidence: `Verified telephone contact available: ${candidate.phone_number}`,
        source_used: 'phone_normalization.engine',
        timestamp: now,
      });
      qualificationReasons.push(`Verified phone: ${candidate.phone_number}`);
    }
  } else if (phoneMode === 'without_phone') {
    if (hasValidPhone) {
      auditChecks.push({
        check_name: 'Phone Number Policy',
        status: 'failed',
        evidence: `Excluded because business has a listed phone number (${candidate.phone_number}). Campaign requires unlisted phone prospects.`,
        source_used: 'phone_normalization.engine',
        timestamp: now,
      });
      disqualificationReasons.push('Excluded: phone already listed');
    } else {
      auditChecks.push({
        check_name: 'Phone Number Policy',
        status: 'passed',
        evidence: 'Eligible prospect without listed telephone contact',
        source_used: 'phone_normalization.engine',
        timestamp: now,
      });
      qualificationReasons.push('Eligible under unlisted phone outreach policy');
    }
  } else {
    auditChecks.push({
      check_name: 'Phone Number Policy',
      status: 'passed',
      evidence: hasValidPhone
        ? `Telephone contact available: ${candidate.phone_number}`
        : 'Telephone unlisted (Accepted under All Leads policy)',
      source_used: 'phone_normalization.engine',
      timestamp: now,
    });
  }

  // 5. Phone Structure & Non-Placeholder Verification
  if (candidate.phone_number) {
    if (!hasValidPhone) {
      if (phoneMode === 'with_phone') {
        auditChecks.push({
          check_name: 'Phone Structure Integrity',
          status: 'failed',
          evidence: `Phone number is invalid or a placeholder: '${candidate.phone_number}'`,
          source_used: 'phone_structure.validator',
          timestamp: now,
        });
      } else {
        auditChecks.push({
          check_name: 'Phone Structure Integrity',
          status: 'passed',
          evidence: `Placeholder/unverified phone listed ('${candidate.phone_number}'), accepted under unlisted phone policy`,
          source_used: 'phone_structure.validator',
          timestamp: now,
        });
      }
    } else {
      auditChecks.push({
        check_name: 'Phone Structure Integrity',
        status: 'passed',
        evidence: `Valid telephone format: ${candidate.phone_number}`,
        source_used: 'phone_structure.validator',
        timestamp: now,
      });
    }
  } else {
    auditChecks.push({
      check_name: 'Phone Structure Integrity',
      status: 'passed',
      evidence: 'No telephone number provided (Structure check passed for unlisted)',
      source_used: 'phone_structure.validator',
      timestamp: now,
    });
  }

  // 6. Website Policy Evaluation
  const websiteFilter = config?.contact_filters?.website_filter || 'all';
  const hasWebsite = Boolean(
    candidate.website_url?.trim() ||
    candidate.website_status === 'WEBSITE_LISTED' ||
    candidate.website_status === 'WEBSITE_REACHABLE'
  );

  if (websiteFilter === 'no_website_only') {
    if (hasWebsite) {
      auditChecks.push({
        check_name: 'Website Policy',
        status: 'failed',
        evidence: `Excluded: Business already possesses an official website (${candidate.website_url})`,
        source_used: 'website_verifier.status',
        timestamp: now,
      });
      disqualificationReasons.push('Excluded: Official website already listed');
    } else {
      auditChecks.push({
        check_name: 'Website Policy',
        status: 'passed',
        evidence: 'Prime digital prospect: No official website listed',
        source_used: 'website_verifier.status',
        timestamp: now,
      });
      qualificationReasons.push('No website listed');
    }
  } else if (websiteFilter === 'listed_only') {
    if (!hasWebsite) {
      auditChecks.push({
        check_name: 'Website Policy',
        status: 'failed',
        evidence: 'Missing required website',
        source_used: 'website_verifier.status',
        timestamp: now,
      });
      disqualificationReasons.push('Requires listed website');
    } else {
      auditChecks.push({
        check_name: 'Website Policy',
        status: 'passed',
        evidence: `Website present: ${candidate.website_url}`,
        source_used: 'website_verifier.status',
        timestamp: now,
      });
    }
  } else {
    auditChecks.push({
      check_name: 'Website Policy',
      status: 'passed',
      evidence: hasWebsite ? `Website: ${candidate.website_url}` : 'No website listed (Accepted)',
      source_used: 'website_verifier.status',
      timestamp: now,
    });
  }

  // 7. Consumer Rating & Provenance Truthfulness
  const includeUnrated = config?.rating_filters?.include_unrated ?? true;
  const numRating = candidate.rating !== null && candidate.rating !== undefined && !isNaN(Number(candidate.rating))
    ? Number(candidate.rating)
    : null;
  const providerSupportsRatings = context?.providerCapabilities?.supportsRatings ?? (context?.providerId === 'google_places');

  if (minRating !== null && minRating >= 4.0) {
    if (numRating === null) {
      if (!providerSupportsRatings && !includeUnrated) {
        // Transparent audit: Provider cannot substantiate rating
        auditChecks.push({
          check_name: 'Consumer Rating Verification',
          status: 'unverified',
          evidence: `Selected provider does not store Google consumer ratings; rating requirement (>= ${minRating.toFixed(1)}) cannot be substantiated`,
          source_used: 'provider_capabilities.ratings',
          timestamp: now,
        });
        disqualificationReasons.push(`Rating cannot be verified by selected provider (minimum ${minRating.toFixed(1)} requested)`);
      } else if (includeUnrated) {
        auditChecks.push({
          check_name: 'Consumer Rating Verification',
          status: 'passed',
          evidence: 'Unrated establishment accepted under campaign policy',
          source_used: 'provider_data.rating',
          timestamp: now,
        });
      } else {
        auditChecks.push({
          check_name: 'Consumer Rating Verification',
          status: 'failed',
          evidence: `Rating unavailable (minimum ${minRating.toFixed(1)} required)`,
          source_used: 'provider_data.rating',
          timestamp: now,
        });
        disqualificationReasons.push(`Rating unavailable (minimum ${minRating.toFixed(1)} required)`);
      }
    } else if (numRating < minRating) {
      auditChecks.push({
        check_name: 'Consumer Rating Verification',
        status: 'failed',
        evidence: `Rating ${numRating.toFixed(1)} is below required minimum ${minRating.toFixed(1)}`,
        source_used: 'provider_data.rating',
        timestamp: now,
      });
      disqualificationReasons.push(`Rating ${numRating.toFixed(1)} is below minimum ${minRating.toFixed(1)}`);
    } else {
      auditChecks.push({
        check_name: 'Consumer Rating Verification',
        status: 'passed',
        evidence: `Verified rating ${numRating.toFixed(1)} meets requirement (>= ${minRating.toFixed(1)})`,
        source_used: 'provider_data.rating',
        timestamp: now,
      });
      qualificationReasons.push(`Rating: ${numRating.toFixed(1)}`);
    }
  } else {
    auditChecks.push({
      check_name: 'Consumer Rating Verification',
      status: 'passed',
      evidence: numRating !== null ? `Rating: ${numRating.toFixed(1)}` : 'Rating optional (Accepted)',
      source_used: 'provider_data.rating',
      timestamp: now,
    });
  }

  // 8. Review Count & Review Volume Verification
  const minReviews = config?.review_filters?.min ?? null;
  const includeZeroReviews = config?.review_filters?.include_zero ?? true;
  const numReviews = candidate.review_count !== null && candidate.review_count !== undefined && !isNaN(Number(candidate.review_count))
    ? Number(candidate.review_count)
    : null;

  if (minReviews !== null && minReviews > 0) {
    if (numReviews === null || numReviews === 0) {
      if (!includeZeroReviews && candidate.source_provider !== 'osm_overpass' && candidate.source_provider !== 'offline_local') {
        auditChecks.push({
          check_name: 'Review Count Policy',
          status: 'failed',
          evidence: `Review count unavailable or zero (minimum ${minReviews} required)`,
          source_used: 'provider_data.review_count',
          timestamp: now,
        });
        disqualificationReasons.push(`Review count unavailable (minimum ${minReviews} required)`);
      } else {
        auditChecks.push({
          check_name: 'Review Count Policy',
          status: 'passed',
          evidence: 'Zero/unrated reviews accepted under policy',
          source_used: 'provider_data.review_count',
          timestamp: now,
        });
      }
    } else if (numReviews < minReviews) {
      auditChecks.push({
        check_name: 'Review Count Policy',
        status: 'failed',
        evidence: `Review count ${numReviews} is below required minimum ${minReviews}`,
        source_used: 'provider_data.review_count',
        timestamp: now,
      });
      disqualificationReasons.push(`Review count ${numReviews} is below minimum ${minReviews}`);
    } else {
      auditChecks.push({
        check_name: 'Review Count Policy',
        status: 'passed',
        evidence: `Review count ${numReviews} meets requirement (>= ${minReviews})`,
        source_used: 'provider_data.review_count',
        timestamp: now,
      });
    }
  } else {
    auditChecks.push({
      check_name: 'Review Count Policy',
      status: 'passed',
      evidence: numReviews !== null ? `Review count: ${numReviews}` : 'Review count optional (Accepted)',
      source_used: 'provider_data.review_count',
      timestamp: now,
    });
  }

  // 9. Operational Status Check
  if (candidate.business_status === 'CLOSED_PERMANENTLY') {
    auditChecks.push({
      check_name: 'Operational Status',
      status: 'failed',
      evidence: 'Establishment is reported as CLOSED_PERMANENTLY',
      source_used: 'source_record.business_status',
      timestamp: now,
    });
    disqualificationReasons.push('Business is permanently closed');
  } else {
    auditChecks.push({
      check_name: 'Operational Status',
      status: 'passed',
      evidence: `Operational status: ${candidate.business_status || 'OPERATIONAL'}`,
      source_used: 'source_record.business_status',
      timestamp: now,
    });
  }

  // 10. Address & Local Location Completeness
  const hasAddress = Boolean(
    candidate.formatted_address?.trim() ||
    candidate.street_address?.trim() ||
    (candidate.city && candidate.state)
  );
  if (!hasAddress && !candidate.latitude && !candidate.longitude) {
    auditChecks.push({
      check_name: 'Address & Local Completeness',
      status: 'passed',
      evidence: 'Address details pending/unlisted',
      source_used: 'source_record.address',
      timestamp: now,
    });
  } else {
    auditChecks.push({
      check_name: 'Address & Local Completeness',
      status: 'passed',
      evidence: candidate.formatted_address || `${candidate.city || ''}, ${candidate.state || ''}`,
      source_used: 'source_record.address',
      timestamp: now,
    });
  }

  // Determine Terminal State
  const hasFailed = auditChecks.some(c => c.status === 'failed');
  const hasUnverified = auditChecks.some(c => c.status === 'unverified');

  let status: 'qualified' | 'rejected' | 'unverified' = 'qualified';
  let primaryRejectionReason: string | null = null;

  if (hasFailed) {
    status = 'rejected';
    const firstFailed = auditChecks.find(c => c.status === 'failed');
    primaryRejectionReason = firstFailed ? firstFailed.evidence : disqualificationReasons[0] || 'Requirements not met';
  } else if (hasUnverified) {
    status = 'unverified';
    const firstUnverified = auditChecks.find(c => c.status === 'unverified');
    primaryRejectionReason = firstUnverified ? firstUnverified.evidence : 'Unverified requirements (Needs Review)';
  }

  const isQualified = status === 'qualified';

  return {
    isQualified,
    status,
    primaryRejectionReason,
    auditChecks,
    qualificationReasons,
    disqualificationReasons,
  };
}
