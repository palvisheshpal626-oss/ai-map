// lib/providers/offline-provider.ts
// Offline Local Database Data Provider Adapter
// Allows search campaigns to run instantly from locally downloaded city extracts with ZERO API costs.

import { BusinessDataProvider, ProviderCapability, ProviderSearchParams, ProviderSearchResult } from './types';
import { Restaurant } from '../types';
import { offlineDataManager } from '../offline/data-manager';
import { store } from '../store/memory-store';

export class OfflineDataProvider implements BusinessDataProvider {
  readonly id = 'offline_local';
  readonly name = 'Offline Local Database (OpenStreetMap Extracts)';

  readonly capabilities: ProviderCapability = {
    supportsRatings: false, // Transparent: OpenStreetMap does not store consumer ratings
    supportsReviewCounts: false, // Transparent: OpenStreetMap does not store review counts
    supportsPhoneNumbers: true,
    supportsWebsites: true,
    supportsPagination: false,
    supportsRealTimeStatus: true,
    requiresCommercialKey: false,
    maxResultsPerQuery: 500,
    termsNotes: 'Local indexed storage. Open Database License (ODbL 1.0). Zero external API calls, instant execution.',
  };

  isConfigured(): boolean {
    return true;
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    const areas = store.getAllOfflineAreas();
    const readyAreas = areas.filter(a => a.status === 'ready');
    const latencyMs = Date.now() - start;

    if (readyAreas.length > 0) {
      return {
        success: true,
        message: `Offline database ready: ${readyAreas.length} city extract(s) available locally.`,
        latencyMs,
      };
    } else {
      return {
        success: true,
        message: 'Offline database engine is ready. Download city extracts in the Offline Data Manager to populate records.',
        latencyMs,
      };
    }
  }

  async searchBusinesses(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const query = params.query?.trim() || '';

    // Search local store through OfflineDataManager
    const searchRes = offlineDataManager.searchLocal({
      query,
      category: params.category,
      limit: 150,
    });

    return {
      restaurants: searchRes.records,
      totalEstimatedResults: searchRes.total,
      usageCount: 0, // Zero API calls made!
    };
  }
}
