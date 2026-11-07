// lib/providers/registry.ts
// Provider Registry with Fallback & Capability Matrix

import { BusinessDataProvider } from './types';
import { GooglePlacesProvider } from './google-places';
import { OpenStreetMapOverpassProvider } from './osm-overpass';
import { OfflineDataProvider } from './offline-provider';

export class ProviderRegistry {
  private static providers: Map<string, BusinessDataProvider> = new Map();

  static initialize() {
    if (this.providers.size === 0) {
      const google = new GooglePlacesProvider();
      const osm = new OpenStreetMapOverpassProvider();
      const offline = new OfflineDataProvider();

      this.providers.set(google.id, google);
      this.providers.set(osm.id, osm);
      this.providers.set(offline.id, offline);
    }
  }

  static registerProvider(provider: BusinessDataProvider) {
    this.initialize();
    this.providers.set(provider.id, provider);
  }

  static getProvider(id: string): BusinessDataProvider {
    this.initialize();
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Data provider with id '${id}' not found in registry.`);
    }
    return provider;
  }

  static getAllProviders(): BusinessDataProvider[] {
    this.initialize();
    return Array.from(this.providers.values());
  }

  static getActiveProvider(): BusinessDataProvider {
    this.initialize();
    // OpenStreetMap/Overpass is the primary free open provider
    const osm = this.providers.get('osm_overpass');
    if (osm) return osm;

    const google = this.providers.get('google_places');
    if (google && google.isConfigured()) {
      return google;
    }
    return this.providers.get('osm_overpass')!;
  }
}
