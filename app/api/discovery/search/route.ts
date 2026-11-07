import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store/memory-store';
import { ProviderRegistry } from '@/lib/providers/registry';
import { Restaurant, PhoneFilterOption, ScanJob } from '@/lib/types';
import { classifyHospitalityTier, isSmallEateryOrStall } from '@/lib/classification/business-tier';
import { calculateLeadScore } from '@/lib/scoring/lead-scorer';
import { findDuplicateRestaurant, isValidPhoneNumber } from '@/lib/deduplication/deduplicator';
import { evaluateLeadQualification } from '@/lib/qualification/qualifier';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query = '',
      category = '',
      state = '',
      district = '',
      city = '',
      locality = '',
      latitude,
      longitude,
      radiusMeters,
      providerId = 'osm_overpass',
      minRating = null,
      maxRating = null,
      minReviews = null,
      includeUnrated = false,
      businessType = 'all',
      brand = '',
      phoneFilter,
      phoneOnly = false,
      includeWithoutPhone = true,
      emailOnly = false,
      coordsOnly = false,
      excludeSmall = true,
      pageToken,
    } = body as Record<string, any>;

    // 1. Generate unique search run ID
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 2. Initialize active search run in store immediately with empty state
    store.startSearchRun(runId, {
      query,
      category,
      state,
      district,
      city,
      locality,
      providerId,
      minRatingApplied: minRating,
      minReviewsApplied: minReviews,
    });

    // 3. Provider validation
    if (providerId === 'google_places') {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey || apiKey.trim().length <= 10 || apiKey.startsWith('mock')) {
        const errorMsg =
          'Google Places API key is not configured. Set a valid GOOGLE_PLACES_API_KEY in your server environment (.env.local) to use Google Places discovery.';
        store.updateSearchRun(runId, {
          status: 'failed',
          error: errorMsg,
          completedAt: new Date().toISOString(),
        });

        return NextResponse.json(
          {
            success: false,
            error: errorMsg,
            runId,
            providerId,
            total: 0,
            restaurants: [],
          },
          {
            status: 400,
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
          }
        );
      }
    }

    // 4. Construct live search query with strict geographic anchoring
    const locParts: string[] = [];
    if (locality && String(locality).trim()) locParts.push(String(locality).trim());
    if (city && String(city).trim() && String(city).trim().toLowerCase() !== String(locality || '').trim().toLowerCase()) {
      locParts.push(String(city).trim());
    }
    if (
      district &&
      String(district).trim() &&
      String(district).trim().toLowerCase() !== String(city || '').trim().toLowerCase() &&
      String(district).trim().toLowerCase() !== String(locality || '').trim().toLowerCase()
    ) {
      locParts.push(String(district).trim());
    }
    if (state && String(state).trim()) locParts.push(String(state).trim());
    locParts.push('India');
    const targetLoc = locParts.join(', ');

    const targetCat = category && String(category).trim() ? String(category).trim() : 'Restaurants';
    const cleanQuery = (query || '').trim();

    let finalSearchQuery = '';
    if (cleanQuery) {
      const lowerQ = cleanQuery.toLowerCase();
      const lowerCity = (city || '').toLowerCase().trim();
      const lowerState = (state || '').toLowerCase().trim();
      const alreadyHasCity = lowerCity && lowerQ.includes(lowerCity);
      const alreadyHasState = lowerState && lowerQ.includes(lowerState);

      if (alreadyHasCity || alreadyHasState) {
        finalSearchQuery = lowerQ.includes('india') ? cleanQuery : `${cleanQuery}, India`;
      } else {
        finalSearchQuery = `${cleanQuery} in ${targetLoc}`;
      }
    } else {
      finalSearchQuery = `${targetCat} in ${targetLoc}`;
    }

    console.log(
      `[DISCOVERY REQUEST] Run ID: ${runId} | Provider: ${providerId} | Query: "${finalSearchQuery}" | City: "${city || ''}" | State: "${state || ''}" | Category: "${targetCat}"`
    );

    const provider = ProviderRegistry.getProvider(providerId);

    // 5. Execute live provider request with 15-second timeout safeguard
    let rawResults;
    try {
      const searchPromise = provider.searchBusinesses({
        query: finalSearchQuery,
        category: targetCat,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        radiusMeters: radiusMeters ? Number(radiusMeters) : 10000,
        pageToken,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Provider timeout: ${provider.name} did not respond within 15 seconds`)), 15000)
      );

      rawResults = await Promise.race([searchPromise, timeoutPromise]);
    } catch (providerErr: unknown) {
      const errMsg = providerErr instanceof Error ? providerErr.message : String(providerErr);
      store.updateSearchRun(runId, {
        status: 'failed',
        error: errMsg,
        completedAt: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: errMsg,
          runId,
          providerId,
          total: 0,
          restaurants: [],
        },
        {
          status: 502,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
        }
      );
    }

    const rawCandidates = rawResults.restaurants || [];
    const totalFetched = rawCandidates.length;

    console.log(
      `[DISCOVERY PROVIDER RESPONSE] Run ID: ${runId} | Provider: ${providerId} | Raw Fetched: ${totalFetched}`
    );

    // 6. If provider returns 0 businesses, return empty state immediately without fallback
    if (totalFetched === 0) {
      store.updateSearchRun(runId, {
        status: 'empty',
        totalFetched: 0,
        totalFilteredOut: 0,
        totalResults: 0,
        results: [],
        completedAt: new Date().toISOString(),
      });

      // Register empty scan job in store so Job Manager is aware of the completed run
      store.registerLiveSearchJob({
        id: runId,
        name: finalSearchQuery || `${targetCat} in ${targetLoc}`,
        configuration_snapshot: {
          selected_locations: [targetLoc],
          categories: [targetCat],
          rating_filters: {
            min: minRating ? Number(minRating) : 0,
            max: maxRating ? Number(maxRating) : 5,
            include_unrated: includeUnrated,
          },
          review_filters: {
            min: minReviews ? Number(minReviews) : 0,
            include_zero: includeUnrated,
          },
          contact_filters: {
            phone: phoneFilter === 'with_phone' ? 'required' : phoneFilter === 'without_phone' ? 'unavailable' : 'optional',
            phone_filter: phoneFilter || (phoneOnly ? 'with_phone' : 'all'),
            website_filter: 'all',
            include_without_phone: includeWithoutPhone,
            include_without_email: true,
          },
        },
        provider_id: providerId,
        status: 'completed',
        progress_counters: {
          total_tasks: 1,
          completed_tasks: 1,
          failed_tasks: 0,
          fetched_count: 0,
          discovered_count: 0,
          qualified_count: 0,
          rejected_count: 0,
          rejection_breakdown: {},
          duplicate_count: 0,
        },
        usage_counters: {
          api_requests: 1,
          estimated_cost_inr: providerId === 'google_places' ? 2.5 : 0,
        },
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: true,
          runId,
          providerId,
          status: 'empty',
          totalFetched: 0,
          totalFilteredOut: 0,
          total: 0,
          restaurants: [],
          message: 'No businesses found for this search. Try another city, category, or rating threshold.',
        },
        {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
      );
    }

    // 7. Deduplicate returned businesses within this provider response batch
    const deduplicatedCandidates: Partial<Restaurant>[] = [];
    const seenProviderIds = new Set<string>();

    for (const cand of rawCandidates) {
      const provId = cand.source_record_id || cand.id;
      if (provId && seenProviderIds.has(provId)) {
        continue;
      }
      if (provId) seenProviderIds.add(provId);

      const dup = findDuplicateRestaurant(cand, deduplicatedCandidates);
      if (!dup.isDuplicate) {
        deduplicatedCandidates.push(cand);
      }
    }

    const duplicateCandidates = totalFetched - deduplicatedCandidates.length;
    const rejectionBreakdown: Record<string, number> = {};
    if (duplicateCandidates > 0) {
      rejectionBreakdown['duplicate_provider'] = duplicateCandidates;
    }

    // 8. Apply User Filter Pipeline to the New Results
    const matchedRestaurants: Restaurant[] = [];

    for (const cand of deduplicatedCandidates) {
      // Strict Geographic Filtering: Ensure returned candidate is actually within requested state
      if (state && String(state).trim()) {
        const normState = String(state).trim().toLowerCase();
        const candState = (cand.state || '').toLowerCase();
        const candAddr = (cand.formatted_address || '').toLowerCase();
        if (candState && !candState.includes(normState) && !candAddr.includes(normState)) {
          rejectionBreakdown['state_mismatch'] = (rejectionBreakdown['state_mismatch'] || 0) + 1;
          continue;
        }
      }

      // Strict Geographic Filtering: Ensure returned candidate is actually within requested city/district
      if (city && String(city).trim()) {
        const normCity = String(city).trim().toLowerCase();
        const candCity = (cand.city || '').toLowerCase();
        const candDist = (cand.district || '').toLowerCase();
        const candAddr = (cand.formatted_address || '').toLowerCase();
        const matchesCity = candCity.includes(normCity) || candDist.includes(normCity) || candAddr.includes(normCity);
        if (!matchesCity) {
          rejectionBreakdown['city_mismatch'] = (rejectionBreakdown['city_mismatch'] || 0) + 1;
          continue;
        }
      }

      // Enrich location details
      if (state && !cand.state) cand.state = state;
      if (district && !cand.district) cand.district = district;
      if (city && !cand.city) cand.city = city;
      if (locality && !cand.locality) cand.locality = locality;
      if (targetCat && !cand.category) cand.category = targetCat;

      const numRating = cand.rating !== null && cand.rating !== undefined ? Number(cand.rating) : null;
      const numReviews = cand.review_count !== null && cand.review_count !== undefined ? Number(cand.review_count) : null;

      // Filter: Rating Threshold
      if (minRating !== null && !isNaN(Number(minRating)) && Number(minRating) > 0) {
        if (numRating === null) {
          if (!includeUnrated) {
            rejectionBreakdown['unrated'] = (rejectionBreakdown['unrated'] || 0) + 1;
            continue; // Exclude unrated records
          }
        } else if (numRating < Number(minRating)) {
          rejectionBreakdown['low_rating'] = (rejectionBreakdown['low_rating'] || 0) + 1;
          continue; // Exclude below threshold
        }
      }

      if (maxRating !== null && !isNaN(Number(maxRating))) {
        if (numRating !== null && numRating > Number(maxRating)) {
          rejectionBreakdown['high_rating'] = (rejectionBreakdown['high_rating'] || 0) + 1;
          continue;
        }
      }

      // Filter: Review Count Threshold
      if (minReviews !== null && !isNaN(Number(minReviews)) && Number(minReviews) > 0) {
        if (numReviews === null) {
          if (!includeUnrated) {
            rejectionBreakdown['no_reviews'] = (rejectionBreakdown['no_reviews'] || 0) + 1;
            continue;
          }
        } else if (numReviews < Number(minReviews)) {
          rejectionBreakdown['low_reviews'] = (rejectionBreakdown['low_reviews'] || 0) + 1;
          continue;
        }
      }

      // Filter: Roadside Stalls / Kiosks
      if (excludeSmall && isSmallEateryOrStall({
        business_name: cand.business_name || '',
        category: cand.category,
        rating: cand.rating,
        review_count: cand.review_count,
      })) {
        rejectionBreakdown['small_stall'] = (rejectionBreakdown['small_stall'] || 0) + 1;
        continue;
      }

      // Filter: Business Type / Hospitality Tier
      const tierInfo = classifyHospitalityTier(cand);
      cand.hospitality_tier = tierInfo.tier;
      cand.brand_name = tierInfo.brandName;
      cand.is_established_chain = tierInfo.isEstablishedChain;

      if (businessType && businessType !== 'all') {
        if (businessType === 'all_premium') {
          const isPrem = (tierInfo.tier === 'luxury' || tierInfo.tier === 'premium' || tierInfo.isEstablishedChain) && !tierInfo.isSmallOutlet;
          if (!isPrem) {
            rejectionBreakdown['not_premium'] = (rejectionBreakdown['not_premium'] || 0) + 1;
            continue;
          }
        } else if (businessType === 'hotels') {
          if (tierInfo.categoryGroup !== 'hotels' && tierInfo.tier !== 'luxury') {
            rejectionBreakdown['not_hotel'] = (rejectionBreakdown['not_hotel'] || 0) + 1;
            continue;
          }
        } else if (businessType === 'fine_dining') {
          if (tierInfo.categoryGroup !== 'fine_dining') {
            rejectionBreakdown['not_fine_dining'] = (rejectionBreakdown['not_fine_dining'] || 0) + 1;
            continue;
          }
        } else if (businessType === 'premium_restaurants') {
          if (tierInfo.categoryGroup !== 'fine_dining' && tierInfo.categoryGroup !== 'premium_dining' && tierInfo.categoryGroup !== 'hotel_restaurants') {
            rejectionBreakdown['not_premium_restaurant'] = (rejectionBreakdown['not_premium_restaurant'] || 0) + 1;
            continue;
          }
        } else if (businessType === 'chains') {
          if (!tierInfo.isEstablishedChain) {
            rejectionBreakdown['not_chain'] = (rejectionBreakdown['not_chain'] || 0) + 1;
            continue;
          }
        } else if (businessType === 'hotel_restaurants') {
          if (tierInfo.categoryGroup !== 'hotel_restaurants') {
            rejectionBreakdown['not_hotel_restaurant'] = (rejectionBreakdown['not_hotel_restaurant'] || 0) + 1;
            continue;
          }
        }
      }

      // Filter: Brand
      if (brand) {
        const brandNorm = brand.toLowerCase();
        const candBrand = (cand.brand_name || '').toLowerCase();
        const candName = (cand.business_name || '').toLowerCase();
        if (!candBrand.includes(brandNorm) && !candName.includes(brandNorm)) {
          rejectionBreakdown['brand_mismatch'] = (rejectionBreakdown['brand_mismatch'] || 0) + 1;
          continue;
        }
      }

      // Strict Phone Filter: all | with_phone | without_phone
      const hasPhone = isValidPhoneNumber(cand.phone_number);
      if (phoneFilter === 'with_phone' && !hasPhone) {
        rejectionBreakdown['missing_phone'] = (rejectionBreakdown['missing_phone'] || 0) + 1;
        continue;
      }
      if (phoneFilter === 'without_phone' && hasPhone) {
        rejectionBreakdown['has_phone'] = (rejectionBreakdown['has_phone'] || 0) + 1;
        continue;
      }
      if (phoneOnly && !hasPhone) {
        rejectionBreakdown['missing_phone'] = (rejectionBreakdown['missing_phone'] || 0) + 1;
        continue;
      }

      // Filter: Contact Channels
      if (emailOnly && (!cand.email || !cand.email.includes('@'))) {
        rejectionBreakdown['missing_email'] = (rejectionBreakdown['missing_email'] || 0) + 1;
        continue;
      }
      if (coordsOnly && (!cand.latitude || !cand.longitude || (cand.latitude === 0 && cand.longitude === 0))) {
        rejectionBreakdown['missing_coords'] = (rejectionBreakdown['missing_coords'] || 0) + 1;
        continue;
      }

      // Transparent Lead Qualification
      const qual = evaluateLeadQualification(cand, {
        rating_filters: { min: Number(minRating) || 0, include_unrated: includeUnrated },
        review_filters: { min: Number(minReviews) || 0, include_zero: includeUnrated },
        contact_filters: {
          phone: phoneFilter === 'with_phone' ? 'required' : phoneFilter === 'without_phone' ? 'unavailable' : 'optional',
          phone_filter: phoneFilter || (phoneOnly ? 'with_phone' : 'all'),
          website_filter: 'all',
        },
      });
      cand.qualification_status = qual.status;
      cand.qualification_reasons = qual.qualificationReasons;
      cand.disqualification_reason = qual.primaryRejectionReason;

      // Calculate score and associate with this search run
      const scoring = calculateLeadScore(cand);
      cand.search_id = runId;
      cand.lead_score = scoring.totalScore;
      cand.relevance_score = scoring.relevanceScore;

      // Save into memory store and persist new record
      const { restaurant } = store.saveRestaurant(cand);
      matchedRestaurants.push(restaurant);
    }

    // 9. Sort by multi-factor relevance score descending
    matchedRestaurants.sort((a, b) => {
      const scoreB = b.relevance_score ?? b.lead_score;
      const scoreA = a.relevance_score ?? a.lead_score;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.rating ?? -1) - (a.rating ?? -1);
    });

    const totalFilteredOut = totalFetched - matchedRestaurants.length;

    // 10. Update the run with exact results
    store.updateSearchRun(runId, {
      status: matchedRestaurants.length > 0 ? 'completed' : 'empty',
      totalFetched,
      totalFilteredOut,
      totalResults: matchedRestaurants.length,
      results: matchedRestaurants,
      completedAt: new Date().toISOString(),
    });

    // 11. Register job in Scan Jobs Manager with synchronized progress counters
    const qualifiedLeadsCount = matchedRestaurants.filter(r => r.qualification_status === 'qualified').length;
    const scanJob: ScanJob = {
      id: runId,
      name: finalSearchQuery || `${targetCat} in ${targetLoc}`,
      configuration_snapshot: {
        selected_locations: [targetLoc],
        categories: [targetCat],
        rating_filters: {
          min: minRating ? Number(minRating) : 0,
          max: maxRating ? Number(maxRating) : 5,
          include_unrated: includeUnrated,
        },
        review_filters: {
          min: minReviews ? Number(minReviews) : 0,
          include_zero: includeUnrated,
        },
        contact_filters: {
          phone: phoneFilter === 'with_phone' ? 'required' : phoneFilter === 'without_phone' ? 'unavailable' : 'optional',
          phone_filter: phoneFilter || (phoneOnly ? 'with_phone' : 'all'),
          website_filter: 'all',
          include_without_phone: includeWithoutPhone,
          include_without_email: true,
        },
      },
      provider_id: providerId,
      status: 'completed',
      progress_counters: {
        total_tasks: 1,
        completed_tasks: 1,
        failed_tasks: 0,
        fetched_count: totalFetched,
        discovered_count: matchedRestaurants.length,
        qualified_count: qualifiedLeadsCount,
        rejected_count: totalFilteredOut,
        rejection_breakdown: rejectionBreakdown,
        duplicate_count: duplicateCandidates,
      },
      usage_counters: {
        api_requests: 1,
        estimated_cost_inr: providerId === 'google_places' ? 2.5 : 0,
      },
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.registerLiveSearchJob(scanJob);

    console.log(
      `[DISCOVERY COMPLETED] Run ID: ${runId} | Provider: ${providerId} | Fetched: ${totalFetched} | Filtered: ${totalFilteredOut} | Matches: ${matchedRestaurants.length}`
    );

    return NextResponse.json(
      {
        success: true,
        runId,
        providerId,
        status: matchedRestaurants.length > 0 ? 'completed' : 'empty',
        totalFetched,
        totalFilteredOut,
        total: matchedRestaurants.length,
        restaurants: matchedRestaurants,
        nextPageToken: rawResults.nextPageToken,
        message:
          matchedRestaurants.length === 0
            ? 'No businesses found for this search. Try another city, category, or rating threshold.'
            : undefined,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown discovery error';
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        total: 0,
        restaurants: [],
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}
