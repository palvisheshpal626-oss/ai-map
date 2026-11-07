import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store/memory-store';
import { persistenceService } from '@/lib/database/persistence-service';
import { WebsiteStatus, Restaurant, PhoneFilterOption, WhatsAppFilterOption } from '@/lib/types';
import { classifyHospitalityTier, isSmallEateryOrStall } from '@/lib/classification/business-tier';
import { isValidPhoneNumber } from '@/lib/deduplication/deduplicator';
import { filterRecordsByWhatsApp } from '@/lib/whatsapp/verifier';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('run_id');
    const jobId = searchParams.get('job_id') || searchParams.get('search_id');
    const targetRunId = runId || jobId;
    const view = searchParams.get('view'); // 'live' | 'saved'
    const search = searchParams.get('search')?.toLowerCase() || '';
    const state = searchParams.get('state')?.toLowerCase() || '';
    const district = searchParams.get('district')?.toLowerCase() || '';
    const city = searchParams.get('city')?.toLowerCase() || '';
    const category = searchParams.get('category')?.toLowerCase() || '';
    const websiteStatus = searchParams.get('website_status') as WebsiteStatus | null;
    const ratingFilter = searchParams.get('rating_filter')?.toLowerCase() || '';
    const minRating = searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : null;
    const maxRating = searchParams.get('max_rating') ? parseFloat(searchParams.get('max_rating')!) : null;
    const minReviews = searchParams.get('min_reviews') ? parseInt(searchParams.get('min_reviews')!, 10) : null;
    const businessType = searchParams.get('business_type')?.toLowerCase() || '';
    const brandFilter = searchParams.get('brand')?.toLowerCase() || '';
    const premiumOnly = searchParams.get('premium_only') === 'true';
    const excludeSmall = searchParams.get('exclude_small') !== 'false';
    const qualifiedOnly = searchParams.get('qualified_only') === 'true';
    const noWebsiteOnly = searchParams.get('no_website_only') === 'true';
    const phoneFilter = searchParams.get('phone_filter') as PhoneFilterOption | null;
    const whatsAppFilter = (searchParams.get('whatsapp_filter') || searchParams.get('whatsapp_status')) as WhatsAppFilterOption | null;
    const phoneOnly = searchParams.get('phone_only') === 'true';
    const emailOnly = searchParams.get('email_only') === 'true';
    const coordsOnly = searchParams.get('coords_only') === 'true';

    const includeWithoutPhone = searchParams.get('include_without_phone') !== 'false';
    const includeWithoutEmail = searchParams.get('include_without_email') !== 'false';
    const includeUnrated = searchParams.get('include_unrated') === 'true';

    // 1. Separate Active Live Discovery / Specific Job from Saved Database
    let baseList: Restaurant[] = [];
    let activeRun = null;

    if (targetRunId) {
      activeRun = store.getSearchRun(targetRunId);
      baseList = store.getRestaurantsForRun(targetRunId);
      if (baseList.length === 0) {
        const { leads } = await persistenceService.getCampaignPersistedLeads(targetRunId);
        if (leads.length > 0) {
          baseList = leads;
        }
      }
    } else if (view === 'live') {
      activeRun = store.getLatestSearchRun();
      baseList = activeRun ? [...activeRun.results] : [];
    } else {
      // Saved / History Database records (from Supabase)
      baseList = store.getAllRestaurants();
      if (baseList.length === 0) {
        await store.syncFromSupabase();
        baseList = store.getAllRestaurants();
      }
    }

    // Baseline statistics before additional filtering
    const totalDiscovered = baseList.length;
    let totalMeetingRatingThreshold = 0;
    let totalExcludedBelowThreshold = 0;
    let totalHotelsAndChains = 0;
    const chainsFoundSet = new Set<string>();

    for (const r of baseList) {
      const isRated = r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating));
      if (isRated && Number(r.rating) >= 4.0) {
        totalMeetingRatingThreshold++;
      } else {
        totalExcludedBelowThreshold++;
      }
      const tierInfo = classifyHospitalityTier(r);
      if (tierInfo.isEstablishedChain || tierInfo.categoryGroup === 'hotels') {
        totalHotelsAndChains++;
        if (tierInfo.brandName) chainsFoundSet.add(tierInfo.brandName);
      }
    }

    let list = [...baseList];

    // 2. Text Search
    if (search) {
      list = list.filter(
        r =>
          r.business_name.toLowerCase().includes(search) ||
          r.formatted_address.toLowerCase().includes(search) ||
          (r.brand_name && r.brand_name.toLowerCase().includes(search)) ||
          (r.phone_number && r.phone_number.includes(search)) ||
          (r.email && r.email.toLowerCase().includes(search)) ||
          (r.category && r.category.toLowerCase().includes(search)) ||
          (r.city && r.city.toLowerCase().includes(search)) ||
          (r.district && r.district.toLowerCase().includes(search))
      );
    }

    // 3. Geographic Filters
    if (state) {
      list = list.filter(r => r.state && r.state.toLowerCase() === state);
    }

    if (district) {
      list = list.filter(
        r =>
          (r.district && r.district.toLowerCase() === district) ||
          (r.city && r.city.toLowerCase() === district)
      );
    }

    if (city) {
      list = list.filter(
        r =>
          (r.city && r.city.toLowerCase() === city) ||
          (r.district && r.district.toLowerCase() === city)
      );
    }

    // 4. Category Filtering
    if (category) {
      const catNorm = category.toLowerCase().trim();
      list = list.filter(r => {
        if (!r.category) return false;
        const rCat = r.category.toLowerCase().trim();

        if (catNorm.includes('hotel')) {
          return rCat.includes('hotel') || rCat.includes('resort') || rCat.includes('lodging');
        }
        if (catNorm.includes('fine dining') || catNorm.includes('fine_dining')) {
          return rCat.includes('fine dining') || rCat.includes('fine_dining') || rCat.includes('upscale');
        }
        if (catNorm.includes('cafe') || catNorm.includes('coffee')) {
          return rCat.includes('cafe') || rCat.includes('coffee');
        }
        if (catNorm.includes('bakery')) {
          return rCat.includes('bakery');
        }
        if (catNorm.includes('sweet') || catNorm.includes('mithai')) {
          return rCat.includes('sweet') || rCat.includes('mithai') || rCat.includes('confectionery');
        }
        if (catNorm.includes('fast food') || catNorm.includes('fast_food')) {
          return rCat.includes('fast food') || rCat.includes('fast_food');
        }
        if (catNorm.includes('pizza') || catNorm.includes('burger')) {
          return rCat.includes('pizza') || rCat.includes('burger');
        }
        if (catNorm === 'restaurants' || catNorm === 'restaurant') {
          return rCat.includes('restaurant') || rCat.includes('dining') || rCat.includes('bhojanalaya');
        }
        return rCat.includes(catNorm);
      });
    }

    // 5. Business Type Filter
    if (businessType && businessType !== 'all') {
      list = list.filter(r => {
        const tierInfo = classifyHospitalityTier(r);

        if (businessType === 'all_premium') {
          return (
            (tierInfo.tier === 'luxury' ||
              tierInfo.tier === 'premium' ||
              tierInfo.tier === 'established') &&
            !tierInfo.isSmallOutlet
          );
        }
        if (businessType === 'hotels') {
          return tierInfo.categoryGroup === 'hotels' || tierInfo.tier === 'luxury';
        }
        if (businessType === 'fine_dining') {
          return tierInfo.categoryGroup === 'fine_dining';
        }
        if (businessType === 'premium_restaurants') {
          return (
            tierInfo.categoryGroup === 'fine_dining' ||
            tierInfo.categoryGroup === 'premium_dining' ||
            tierInfo.categoryGroup === 'hotel_restaurants'
          );
        }
        if (businessType === 'chains') {
          return tierInfo.isEstablishedChain;
        }
        if (businessType === 'hotel_restaurants') {
          return tierInfo.categoryGroup === 'hotel_restaurants';
        }
        return true;
      });
    }

    // 6. Brand Filter
    if (brandFilter) {
      list = list.filter(r => {
        const brand = r.brand_name?.toLowerCase() || '';
        const name = r.business_name.toLowerCase();
        return brand.includes(brandFilter) || name.includes(brandFilter);
      });
    }

    // 7. Exclude Small Roadside Stalls
    if (excludeSmall || premiumOnly) {
      list = list.filter(r => !isSmallEateryOrStall(r));
    }

    // 8. Contact Details Filters
    if (websiteStatus) {
      list = list.filter(r => r.website_status === websiteStatus);
    }

    if (noWebsiteOnly) {
      list = list.filter(
        r =>
          r.website_status === 'WEBSITE_NOT_LISTED' ||
          r.website_status === 'VERIFIED_NO_OFFICIAL_WEBSITE'
      );
    }

    // Strict Phone Filter: All Leads | With Phone Number | Without Phone Number
    if (phoneFilter === 'with_phone') {
      list = list.filter(r => isValidPhoneNumber(r.phone_number));
    } else if (phoneFilter === 'without_phone') {
      list = list.filter(r => !isValidPhoneNumber(r.phone_number));
    } else if (phoneOnly || !includeWithoutPhone) {
      list = list.filter(r => isValidPhoneNumber(r.phone_number));
    }

    // WhatsApp Availability Filter
    if (whatsAppFilter && whatsAppFilter !== 'all') {
      list = filterRecordsByWhatsApp(list, whatsAppFilter);
    }

    if (emailOnly || !includeWithoutEmail) {
      list = list.filter(r => Boolean(r.email && r.email.includes('@')));
    }

    if (coordsOnly) {
      list = list.filter(
        r =>
          r.latitude !== null &&
          r.latitude !== undefined &&
          r.longitude !== null &&
          r.longitude !== undefined &&
          !(Number(r.latitude) === 0 && Number(r.longitude) === 0)
      );
    }

    // 9. Strict Rating Filtering
    const effectiveMinRating = premiumOnly ? (minRating !== null ? Math.max(minRating, 4.0) : 4.0) : minRating;

    if (ratingFilter === 'unrated') {
      list = list.filter(r => r.rating === null || r.rating === undefined || isNaN(Number(r.rating)));
    } else if (ratingFilter === 'rated') {
      list = list.filter(r => r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating)));
    } else if (effectiveMinRating !== null && !isNaN(effectiveMinRating)) {
      list = list.filter(r => {
        if (r.rating === null || r.rating === undefined || isNaN(Number(r.rating))) {
          return includeUnrated;
        }
        const numRating = Number(r.rating);
        const meetsMin = numRating >= effectiveMinRating;
        const meetsMax = maxRating === null || isNaN(maxRating) || numRating <= maxRating;
        return meetsMin && meetsMax;
      });
    } else if (maxRating !== null && !isNaN(maxRating)) {
      list = list.filter(r => {
        if (r.rating === null || r.rating === undefined || isNaN(Number(r.rating))) {
          return includeUnrated;
        }
        return Number(r.rating) <= maxRating;
      });
    }

    // 10. Minimum Review Count Threshold
    if (minReviews !== null && !isNaN(minReviews)) {
      list = list.filter(r => {
        if (r.review_count === null || r.review_count === undefined || isNaN(Number(r.review_count))) {
          return includeUnrated;
        }
        return Number(r.review_count) >= minReviews;
      });
    }

    // 11. Qualification Filter
    if (qualifiedOnly) {
      list = list.filter(r => r.lead_score >= 60);
    }

    // 12. Sort: Relevance Score Descending
    list.sort((a, b) => {
      const scoreB = b.relevance_score ?? b.lead_score;
      const scoreA = a.relevance_score ?? a.lead_score;
      if (scoreB !== scoreA) return scoreB - scoreA;

      const ratingB = a.rating !== null && a.rating !== undefined ? Number(b.rating) : -1;
      const ratingA = a.rating !== null && a.rating !== undefined ? Number(a.rating) : -1;
      if (ratingB !== ratingA) return ratingB - ratingA;

      return (b.review_count ?? -1) - (a.review_count ?? -1);
    });

    return NextResponse.json(
      {
        success: true,
        runId: runId || activeRun?.runId || null,
        view: runId || view === 'live' ? 'live' : 'saved',
        total: list.length,
        metrics: {
          totalDiscovered,
          totalMeetingRatingThreshold,
          totalExcludedBelowThreshold,
          totalHotelsAndChains,
          recognizedChainsCount: chainsFoundSet.size,
          recognizedChains: Array.from(chainsFoundSet),
        },
        restaurants: list,
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
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
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
