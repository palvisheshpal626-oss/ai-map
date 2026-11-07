// lib/scoring/lead-scorer.ts
// Industry-Grade Multi-Factor Relevance & Lead-Priority Scoring Engine
// Combines transparent lead qualification scoring (ratings, reviews, website absence, phone)
// with advanced hospitality relevance ranking (luxury hotels, fine dining, recognized chains).

import { Restaurant, WebsiteStatus } from '../types';
import { classifyHospitalityTier } from '../classification/business-tier';
import { isValidPhoneNumber } from '../deduplication/deduplicator';

export interface LeadScoreWeights {
  ratingWeight: number; // default 25
  reviewWeight: number; // default 30
  websiteAbsenceWeight: number; // default 20
  phoneWeight: number; // default 15
  completenessWeight: number; // default 10
  brandWeight?: number;
  categoryWeight?: number;
}

export const DEFAULT_LEAD_WEIGHTS: LeadScoreWeights = {
  ratingWeight: 25,
  reviewWeight: 30,
  websiteAbsenceWeight: 20,
  phoneWeight: 15,
  completenessWeight: 10,
};

export interface ScoreResult {
  totalScore: number;
  relevanceScore: number;
  breakdown: {
    ratingScore: number;
    reviewScore: number;
    websiteScore: number;
    phoneScore: number;
    completenessScore: number;
    brandScore?: number;
    categoryScore?: number;
  };
  reasons: string[];
}

/**
 * Calculates a transparent, explainable lead priority and relevance score (0-100)
 */
export function calculateLeadScore(
  restaurant: Partial<Restaurant>,
  weights: LeadScoreWeights = DEFAULT_LEAD_WEIGHTS
): ScoreResult {
  const reasons: string[] = [];

  const rating = restaurant.rating !== null && restaurant.rating !== undefined ? Number(restaurant.rating) : null;
  const reviews = restaurant.review_count !== null && restaurant.review_count !== undefined ? Number(restaurant.review_count) : null;

  // 1. Rating Score (0 to ratingWeight, default 25)
  let ratingScore = 0;
  if (rating !== null && !isNaN(rating)) {
    if (rating >= 4.5) {
      ratingScore = weights.ratingWeight;
      reasons.push(`Top-tier customer rating (${rating.toFixed(1)}/5.0)`);
    } else if (rating >= 4.0) {
      ratingScore = Math.round(weights.ratingWeight * 0.85);
      reasons.push(`Strong positive rating (${rating.toFixed(1)}/5.0)`);
    } else if (rating >= 3.5) {
      ratingScore = Math.round(weights.ratingWeight * 0.6);
      reasons.push(`Moderate rating (${rating.toFixed(1)}/5.0)`);
    } else {
      ratingScore = Math.round(weights.ratingWeight * 0.3);
      reasons.push(`Low rating (${rating.toFixed(1)}/5.0)`);
    }
  } else {
    reasons.push('No public rating recorded (0 rating points)');
  }

  // 2. Review Count Score (0 to reviewWeight, default 30)
  let reviewScore = 0;
  if (reviews !== null && !isNaN(reviews)) {
    if (reviews >= 500) {
      reviewScore = weights.reviewWeight;
      reasons.push(`High customer volume (${reviews.toLocaleString('en-IN')}+ reviews)`);
    } else if (reviews >= 200) {
      reviewScore = Math.round(weights.reviewWeight * 0.85);
      reasons.push(`Substantial customer reviews (${reviews} reviews)`);
    } else if (reviews >= 50) {
      reviewScore = Math.round(weights.reviewWeight * 0.65);
      reasons.push(`Established local visibility (${reviews} reviews)`);
    } else if (reviews >= 10) {
      reviewScore = Math.round(weights.reviewWeight * 0.35);
      reasons.push(`Emerging business (${reviews} reviews)`);
    } else if (reviews > 0) {
      reviewScore = Math.round(weights.reviewWeight * 0.15);
      reasons.push(`Minimal review volume (${reviews} reviews)`);
    } else {
      reasons.push('Verified zero public reviews');
    }
  } else {
    reasons.push('No public review count available in data source');
  }

  // 3. Website Absence Score (0 to websiteAbsenceWeight, default 20)
  let websiteScore = 0;
  const status: WebsiteStatus = restaurant.website_status || 'WEBSITE_NOT_LISTED';

  if (status === 'VERIFIED_NO_OFFICIAL_WEBSITE') {
    websiteScore = weights.websiteAbsenceWeight;
    reasons.push('Verified: No official website exists (Prime Web Dev Prospect)');
  } else if (status === 'WEBSITE_NOT_LISTED') {
    websiteScore = Math.round(weights.websiteAbsenceWeight * 0.9);
    reasons.push('No website listed on public business profile');
  } else if (status === 'WEBSITE_UNREACHABLE') {
    websiteScore = Math.round(weights.websiteAbsenceWeight * 0.7);
    reasons.push('Listed website is broken or unreachable (Redesign Prospect)');
  } else if (status === 'VERIFICATION_PENDING') {
    websiteScore = Math.round(weights.websiteAbsenceWeight * 0.5);
    reasons.push('Website absence verification is pending');
  } else if (status === 'WEBSITE_LISTED' || status === 'WEBSITE_REACHABLE') {
    websiteScore = 0;
    reasons.push('Active website already present');
  }

  if (restaurant.opportunity && restaurant.opportunity.categoryCode !== 'H') {
    reasons.push(`Opportunity: ${restaurant.opportunity.categoryLabel} (${restaurant.opportunity.recommendedService})`);
  }

  // 4. Phone Availability Score (0 to phoneWeight, default 15)
  let phoneScore = 0;
  const hasPhone = isValidPhoneNumber(restaurant.phone_number);
  if (hasPhone) {
    phoneScore = weights.phoneWeight;
    reasons.push('Direct telephone/mobile available for outreach');
  } else {
    reasons.push('No telephone number available for direct call');
  }

  // 5. Data Completeness Score (0 to completenessWeight, default 10)
  let completenessScore = 0;
  let completenessSignals = 0;
  if (restaurant.formatted_address && restaurant.formatted_address.length > 10) completenessSignals++;
  if (restaurant.locality) completenessSignals++;
  if (restaurant.latitude && restaurant.longitude) completenessSignals++;
  if (restaurant.category) completenessSignals++;

  completenessScore = Math.round((completenessSignals / 4) * weights.completenessWeight);
  if (completenessSignals >= 3) {
    reasons.push('High address and geospatial data completeness');
  }

  const totalScore = Math.min(
    100,
    Math.max(0, ratingScore + reviewScore + websiteScore + phoneScore + completenessScore)
  );

  // --- RELEVANCE MULTI-FACTOR RANKING SCORE (0 - 100) ---
  // Prioritizes: 4.5+ star verified ratings, high review volumes, luxury hotels, recognized chains
  const classification = classifyHospitalityTier(restaurant);
  let relRating = 0;
  if (rating !== null) {
    if (rating >= 4.7) relRating = 30;
    else if (rating >= 4.5) relRating = 27;
    else if (rating >= 4.2) relRating = 23;
    else if (rating >= 4.0) relRating = 19;
    else if (rating >= 3.5) relRating = 10;
  }

  let relReviews = 0;
  if (reviews !== null && reviews > 0) {
    if (reviews >= 2000) relReviews = 25;
    else if (reviews >= 1000) relReviews = 22;
    else if (reviews >= 500) relReviews = 19;
    else if (reviews >= 250) relReviews = 15;
    else if (reviews >= 100) relReviews = 11;
    else if (reviews >= 50) relReviews = 7;
    else relReviews = 3;
  }

  let relBrand = 0;
  if (classification.isEstablishedChain && classification.brandName) {
    relBrand = classification.tier === 'luxury' ? 20 : 16;
  } else if (classification.tier === 'luxury') {
    relBrand = 16;
  } else if (classification.tier === 'premium') {
    relBrand = 12;
  } else if (!classification.isSmallOutlet) {
    relBrand = 6;
  }

  let relCategory = 0;
  if (classification.categoryGroup === 'hotels') relCategory = 15;
  else if (classification.categoryGroup === 'fine_dining') relCategory = 14;
  else if (classification.categoryGroup === 'chains') relCategory = 12;
  else if (classification.categoryGroup === 'hotel_restaurants' || classification.categoryGroup === 'premium_dining') relCategory = 10;
  else if (!classification.isSmallOutlet) relCategory = 6;

  let relContacts = 0;
  if (hasPhone) relContacts += 4;
  if (restaurant.website_url || restaurant.maps_url) relContacts += 3;
  if (restaurant.latitude && restaurant.longitude) relContacts += 3;

  const relevanceScore = Math.min(100, Math.max(0, relRating + relReviews + relBrand + relCategory + relContacts));

  return {
    totalScore,
    relevanceScore,
    breakdown: {
      ratingScore,
      reviewScore,
      websiteScore,
      phoneScore,
      completenessScore,
      brandScore: relBrand,
      categoryScore: relCategory,
    },
    reasons,
  };
}
