// lib/providers/types.ts
// Standardized Provider Adapter Contract & Capability Declarations

import { Restaurant } from '../types';

export interface ProviderCapability {
  supportsRatings: boolean;
  supportsReviewCounts: boolean;
  supportsPhoneNumbers: boolean;
  supportsWebsites: boolean;
  supportsPagination: boolean;
  supportsRealTimeStatus: boolean;
  requiresCommercialKey: boolean;
  maxResultsPerQuery: number;
  termsNotes: string;
}

export interface ProviderSearchParams {
  query: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  category?: string;
  pageToken?: string;
  countryCode?: string;
}

export interface ProviderSearchResult {
  restaurants: Partial<Restaurant>[];
  nextPageToken?: string;
  totalEstimatedResults?: number;
  usageCount: number;
  status?: 'success' | 'empty' | 'rate_limited' | 'error';
  errorMessage?: string;
  sourceEngine?: 'overpass' | 'nominatim' | 'offline_local' | 'google_places' | 'osm_direct';
  boundingBoxUsed?: string;
}

export interface BusinessDataProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapability;

  isConfigured(): boolean;
  testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }>;
  searchBusinesses(params: ProviderSearchParams): Promise<ProviderSearchResult>;
}
