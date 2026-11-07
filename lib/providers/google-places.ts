// lib/providers/google-places.ts
// Official Google Places API (New) REST Adapter
// Endpoints: https://places.googleapis.com/v1/places:searchText
// Uses standard X-Goog-Api-Key and X-Goog-FieldMask headers.
// Follows strict field masking to optimize costs and minimize billable SKU charges.
// Places API (New) TextSearch documentation: https://developers.google.com/maps/documentation/places/web-service/text-search

import { BusinessDataProvider, ProviderCapability, ProviderSearchParams, ProviderSearchResult } from './types';
import { Restaurant, WebsiteStatus } from '../types';
import { classifyHospitalityTier } from '../classification/business-tier';

export class GooglePlacesProvider implements BusinessDataProvider {
  readonly id = 'google_places';
  readonly name = 'Google Places API (New)';

  readonly capabilities: ProviderCapability = {
    supportsRatings: true,
    supportsReviewCounts: true,
    supportsPhoneNumbers: true,
    supportsWebsites: true,
    supportsPagination: true,
    supportsRealTimeStatus: true,
    requiresCommercialKey: true,
    maxResultsPerQuery: 20, // Places API (New) Text Search returns up to 20 per page
    termsNotes:
      'Complies with Google Maps Platform policies. Requires Places API (New) enabled in Google Cloud Console. Caching limits: max 30-day cache on place details; Place IDs may be retained indefinitely.',
  };

  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_PLACES_API_KEY || null;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10 && !this.apiKey.startsWith('mock'));
  }

  /**
   * FieldMask for Places API (New) Text Search:
   * Requests only the fields required for restaurant lead discovery:
   * - places.id
   * - places.displayName
   * - places.formattedAddress
   * - places.location
   * - places.rating
   * - places.userRatingCount
   * - places.nationalPhoneNumber
   * - places.internationalPhoneNumber
   * - places.websiteUri
   * - places.businessStatus
   * - places.primaryType
   * - nextPageToken
   */
  private static FIELD_MASK = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.rating',
    'places.userRatingCount',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.websiteUri',
    'places.businessStatus',
    'places.primaryType',
    'places.types',
    'places.googleMapsUri',
    'nextPageToken',
  ].join(',');

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Google Places API key is missing or not configured. Set GOOGLE_PLACES_API_KEY in your environment (.env.local).',
      };
    }

    const start = Date.now();
    try {
      // Test lightweight search using the Places API (New) Text Search endpoint
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey!,
          'X-Goog-FieldMask': 'places.id,places.displayName',
        },
        body: JSON.stringify({
          textQuery: 'restaurant Lucknow Uttar Pradesh',
          pageSize: 1,
        }),
      });

      const latencyMs = Date.now() - start;
      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: 'Connection successful. Google Places API (New) is authenticated and operational.',
          latencyMs,
        };
      } else {
        const errMessage = data.error?.message || data.error?.status || response.statusText;
        return {
          success: false,
          message: `Google Places API request failed: HTTP ${response.status} - ${errMessage}`,
          latencyMs,
        };
      }
    } catch (err: unknown) {
      return {
        success: false,
        message: `Network error connecting to Google Places: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async searchBusinesses(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'Google Places API key is not configured. Please supply a valid GOOGLE_PLACES_API_KEY in settings or environment.'
      );
    }

    const requestBody: Record<string, unknown> = {
      textQuery: params.query,
      pageSize: 20,
    };

    // Location bias if coordinates are provided
    if (params.latitude && params.longitude) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: params.latitude,
            longitude: params.longitude,
          },
          radius: params.radiusMeters || 5000.0,
        },
      };
    }

    // Pagination token for subsequent pages
    if (params.pageToken) {
      requestBody.pageToken = params.pageToken;
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey!,
        'X-Goog-FieldMask': GooglePlacesProvider.FIELD_MASK,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || `HTTP ${response.status} ${response.statusText}`;
      if (response.status === 403 || response.status === 401) {
        throw new Error(`Google Places Authentication / Quota Error: ${errMsg}`);
      }
      throw new Error(`Google Places API Error: ${errMsg}`);
    }

    const rawPlaces = data.places || [];
    const restaurants: Partial<Restaurant>[] = [];

    for (const place of rawPlaces) {
      // Exclude permanently or temporarily closed businesses
      if (place.businessStatus === 'CLOSED_PERMANENTLY' || place.businessStatus === 'CLOSED_TEMPORARILY') {
        continue;
      }

      const websiteUri = place.websiteUri || null;
      const websiteStatus: WebsiteStatus = websiteUri ? 'WEBSITE_LISTED' : 'WEBSITE_NOT_LISTED';

      const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
      const name = place.displayName?.text || 'Restaurant';

      // Format category from primaryType or types
      const rawCategory = place.primaryType || (place.types && place.types[0]) || 'restaurant';
      const formattedCategory = rawCategory
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      const candidatePartial: Partial<Restaurant> = {
        id: `gp-${place.id}`,
        business_name: name,
        formatted_address: place.formattedAddress || `${name}, India`,
        rating: typeof place.rating === 'number' ? place.rating : null,
        review_count: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
        business_status: place.businessStatus || 'OPERATIONAL',
        latitude: place.location?.latitude || null,
        longitude: place.location?.longitude || null,
        phone_number: phone,
        website_url: websiteUri,
        website_status: websiteStatus,
        maps_url: place.googleMapsUri || null,
        category: formattedCategory,
        source_provider: 'google_places',
        source_record_id: place.id,
      };

      const tierInfo = classifyHospitalityTier(candidatePartial);
      candidatePartial.hospitality_tier = tierInfo.tier;
      candidatePartial.brand_name = tierInfo.brandName;
      candidatePartial.is_established_chain = tierInfo.isEstablishedChain;

      restaurants.push(candidatePartial);
    }

    return {
      restaurants,
      nextPageToken: data.nextPageToken,
      totalEstimatedResults: rawPlaces.length,
      usageCount: 1, // Consumed 1 Places API (New) TextSearch request
    };
  }
}
