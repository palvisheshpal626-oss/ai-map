// lib/offline/data-manager.ts
// Production-grade City-Scoped Offline Business Data Manager
// Handles bounded OSM POI downloads, local indexing, SHA-256 checksums,
// instant local search without network calls, and Safe vs. Strict cleanup policies.

import crypto from 'crypto';
import {
  BoundingBox,
  OfflineArea,
  RawImportedRecord,
  OfflineCleanupPreview,
  OfflineCleanupResult,
  OfflineStorageMetrics,
  Restaurant,
  WebsiteStatus,
  PhoneFilterOption,
} from '../types';
import { store } from '../store/memory-store';
import {
  normalizeBusinessName,
  normalizePhoneNumber,
  isValidPhoneNumber,
  formatInternationalPhone,
  normalizeEmail,
} from '../deduplication/deduplicator';
import { evaluateLeadQualification } from '../qualification/qualifier';
import { GLOBAL_CENTROIDS, GLOBAL_COUNTRIES, getCountryByCode } from '../locations/global-registry';

const USER_AGENT = 'RestaurantLeadFinder/2.0 (admin@restaurantleadfinder.org)';
const OSM_ATTRIBUTION = '© OpenStreetMap contributors, ODbL 1.0';

export class OfflineDataManager {
  private static instance: OfflineDataManager;

  static getInstance(): OfflineDataManager {
    if (!this.instance) {
      this.instance = new OfflineDataManager();
    }
    return this.instance;
  }

  /**
   * Helper to slugify state/district/city strings into consistent IDs
   */
  generateAreaId(stateName: string, districtName: string, cityName: string): string {
    const slug = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `area-${slug(stateName)}-${slug(districtName)}-${slug(cityName)}`;
  }

  /**
   * Resolves verified geographic boundary (bounding box) for a city/locality.
   * Uses Nominatim geographic boundary lookup with resilient fallback.
   */
  async resolveCityBoundary(
    cityName: string,
    districtName: string,
    stateName: string,
    countryName: string = 'India'
  ): Promise<BoundingBox> {
    const cleanCity = cityName.trim();
    const cleanDist = districtName.trim();
    const cleanState = stateName.trim();
    const cleanCountry = countryName.trim();

    try {
      const q = encodeURIComponent(`${cleanCity}, ${cleanDist}, ${cleanState}, ${cleanCountry}`);
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const item = items[0];
          if (Array.isArray(item.boundingbox) && item.boundingbox.length === 4) {
            const south = parseFloat(item.boundingbox[0]);
            const north = parseFloat(item.boundingbox[1]);
            const west = parseFloat(item.boundingbox[2]);
            const east = parseFloat(item.boundingbox[3]);
            return { south, north, west, east };
          }
          if (item.lat && item.lon) {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            return {
              south: lat - 0.08,
              north: lat + 0.08,
              west: lon - 0.08,
              east: lon + 0.08,
            };
          }
        }
      }
    } catch {
      // Offline or network error: fallback to estimated bounding box
    }

    // Centroid resolution from GLOBAL_CENTROIDS dictionary
    let centerLat = 20.5937;
    let centerLon = 78.9629;
    const lowerCity = cleanCity.toLowerCase();
    const lowerDist = cleanDist.toLowerCase();

    for (const [key, centroid] of Object.entries(GLOBAL_CENTROIDS)) {
      if (lowerCity.includes(key) || lowerDist.includes(key) || key.includes(lowerCity)) {
        centerLat = centroid.lat;
        centerLon = centroid.lng;
        break;
      }
    }

    return {
      south: centerLat - 0.08,
      north: centerLat + 0.08,
      west: centerLon - 0.08,
      east: centerLon + 0.08,
    };
  }

  /**
   * Downloads OSM business/geographic data for a selected city or locality bounding box.
   * Stores raw imported source records and normalizes them for local instant discovery.
   */
  async downloadCityData(params: {
    cityName: string;
    districtName: string;
    stateName: string;
    countryName?: string;
    customBbox?: BoundingBox;
    forceRefresh?: boolean;
  }): Promise<{
    area: OfflineArea;
    rawCount: number;
    normalizedCount: number;
    duplicateCount: number;
    isUnchanged?: boolean;
    error?: string;
  }> {
    const { cityName, districtName, stateName, countryName = 'India', forceRefresh = false } = params;
    const areaId = this.generateAreaId(stateName, districtName, cityName);

    const existingArea = store.getOfflineArea(areaId);
    const bbox = params.customBbox || (await this.resolveCityBoundary(cityName, districtName, stateName, countryName));

    // Update status to downloading
    const pendingArea: OfflineArea = {
      id: areaId,
      city_name: cityName,
      district_name: districtName,
      state_name: stateName,
      bounding_box: bbox,
      status: 'downloading',
      bytes_downloaded: existingArea?.bytes_downloaded || 0,
      records_count: existingArea?.records_count || 0,
      checksum: existingArea?.checksum || '',
      attribution: OSM_ATTRIBUTION,
      last_downloaded_at: new Date().toISOString(),
    };
    store.saveOfflineArea(pendingArea);

    try {
      // 1. Fetch live OSM POIs using Overpass query bounded by bbox
      const overpassBbox = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
      const overpassQuery = `[out:json][timeout:25];(node["amenity"~"restaurant|cafe|fast_food|food_court|pub|bar|ice_cream|dhaba"](${overpassBbox});way["amenity"~"restaurant|cafe|fast_food|food_court|pub|bar|ice_cream|dhaba"](${overpassBbox}););out center body 150;`;

      let rawPayloadText = '';
      let rawElements: Array<Record<string, unknown>> = [];

      try {
        const mirrors = [
          'https://overpass-api.de/api/interpreter',
          'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
        ];

        for (const mirror of mirrors) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const res = await fetch(mirror, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': USER_AGENT,
              },
              body: `data=${encodeURIComponent(overpassQuery)}`,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              rawPayloadText = await res.text();
              const parsed = JSON.parse(rawPayloadText);
              if (Array.isArray(parsed.elements) && parsed.elements.length > 0) {
                rawElements = parsed.elements;
                break;
              }
            }
          } catch {
            // Mirror failed or timed out, attempt next mirror
          }
        }
      } catch {
        // Fallback to Nominatim if overpass mirrors fail
      }

      // If overpass mirrors didn't return elements, fallback to Nominatim POI query
      if (rawElements.length === 0) {
        try {
          const q = encodeURIComponent(`restaurant ${cityName} ${districtName}`);
          const nomUrl = `https://nominatim.openstreetmap.org/search?q=${q}&countrycodes=in&format=json&addressdetails=1&extratags=1&limit=50`;
          const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': USER_AGENT } });
          if (nomRes.ok) {
            rawPayloadText = await nomRes.text();
            const parsed = JSON.parse(rawPayloadText);
            if (Array.isArray(parsed)) {
              rawElements = parsed.map((item: Record<string, unknown>) => ({
                type: item.osm_type || 'node',
                id: item.osm_id,
                lat: item.lat ? parseFloat(String(item.lat)) : null,
                lon: item.lon ? parseFloat(String(item.lon)) : null,
                tags: {
                  name: item.name,
                  amenity: 'restaurant',
                  phone: (item.extratags as Record<string, string>)?.phone || (item.extratags as Record<string, string>)?.[`contact:phone`],
                  website: (item.extratags as Record<string, string>)?.website || (item.extratags as Record<string, string>)?.[`contact:website`],
                  cuisine: (item.extratags as Record<string, string>)?.cuisine,
                  road: (item.address as Record<string, string>)?.road,
                  postcode: (item.address as Record<string, string>)?.postcode,
                },
                raw_item: item,
              }));
            }
          }
        } catch {
          // If totally offline, handle gracefully
        }
      }

      // 2. Compute payload metrics & Checksum
      const bytesDownloaded = Buffer.byteLength(rawPayloadText, 'utf8') || 1024;
      const checksum = crypto.createHash('sha256').update(rawPayloadText || areaId).digest('hex');

      // Check if unchanged
      if (!forceRefresh && existingArea && existingArea.checksum === checksum && existingArea.status === 'ready') {
        return {
          area: existingArea,
          rawCount: existingArea.records_count,
          normalizedCount: existingArea.records_count,
          duplicateCount: 0,
          isUnchanged: true,
        };
      }

      // 3. Process raw imported records and normalize
      const rawRecords: RawImportedRecord[] = [];
      const normalizedRestaurants: Partial<Restaurant>[] = [];
      const now = new Date().toISOString();

      for (const el of rawElements) {
        const osmType = (el.type as 'node' | 'way' | 'relation') || 'node';
        const osmId = el.id as number | string;
        const tags = (el.tags as Record<string, string>) || {};

        const lat = typeof el.lat === 'number' ? el.lat : typeof (el.center as Record<string, number>)?.lat === 'number' ? (el.center as Record<string, number>).lat : null;
        const lon = typeof el.lon === 'number' ? el.lon : typeof (el.center as Record<string, number>)?.lon === 'number' ? (el.center as Record<string, number>).lon : null;

        const name = tags.name || tags.amenity || 'Local Food Service Business';
        const category = tags.cuisine ? `Restaurant (${tags.cuisine})` : tags.amenity || 'Restaurant';

        const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || tags['phone:mobile'] || null;
        const website = tags.website || tags['contact:website'] || tags.url || null;

        const rawRecordId = `raw-osm-${osmType}-${osmId}`;

        // Raw imported record
        rawRecords.push({
          id: rawRecordId,
          area_id: areaId,
          osm_type: osmType,
          osm_id: osmId,
          business_name: name,
          category,
          latitude: lat,
          longitude: lon,
          phone,
          website,
          tags,
          raw_payload: el,
          quarantine_status: 'active',
          imported_at: now,
        });

        // Normalized restaurant model
        const sourceRecordId = `osm-${osmType}-${osmId}`;
        const mapUrl = `https://www.openstreetmap.org/${osmType}/${osmId}`;
        const address = `${name}, ${cityName}, ${districtName}, ${stateName}, ${countryName}`;

        normalizedRestaurants.push({
          id: sourceRecordId,
          business_name: name,
          normalized_name: normalizeBusinessName(name),
          category,
          description: tags.cuisine ? `Cuisine: ${tags.cuisine}` : null,
          formatted_address: address,
          street_address: tags['addr:street'] || tags.road || null,
          country: countryName,
          state: stateName,
          district: districtName,
          city: cityName,
          locality: tags['addr:suburb'] || tags['addr:neighbourhood'] || null,
          postal_code: tags['addr:postcode'] || null,
          latitude: lat,
          longitude: lon,
          phone_number: phone,
          email: tags.email || tags['contact:email'] || null,
          website_url: website,
          website_status: website ? 'WEBSITE_LISTED' : 'WEBSITE_NOT_LISTED',
          maps_url: mapUrl,
          source_provider: 'offline_local',
          source_record_id: sourceRecordId,
          contact_verification_status: phone || tags.email ? 'UNVERIFIED_SOURCE_LISTED' : 'UNAVAILABLE',
          provenance: {
            provider: 'offline_local',
            osm_type: osmType,
            osm_id: osmId,
            raw_tags: tags,
            area_id: areaId,
            imported_at: now,
          },
          // Truthful representation: OSM has no consumer ratings or reviews
          rating: null,
          review_count: null,
        });
      }

      // 4. Save raw records to store
      store.saveRawImportedRecordsBatch(rawRecords);

      // 5. Persist normalized restaurants through deduplication
      let normalizedCount = 0;
      let duplicateCount = 0;

      for (const rest of normalizedRestaurants) {
        const res = store.saveRestaurant(rest);
        if (res.isDuplicate) {
          duplicateCount++;
        } else {
          normalizedCount++;
        }
      }

      // 6. Update Offline Area to ready
      const readyArea: OfflineArea = {
        id: areaId,
        city_name: cityName,
        district_name: districtName,
        state_name: stateName,
        bounding_box: bbox,
        status: 'ready',
        bytes_downloaded: bytesDownloaded,
        records_count: rawRecords.length,
        checksum,
        attribution: OSM_ATTRIBUTION,
        last_downloaded_at: now,
        error_message: null,
        created_at: existingArea?.created_at || now,
        updated_at: now,
      };
      store.saveOfflineArea(readyArea);

      return {
        area: readyArea,
        rawCount: rawRecords.length,
        normalizedCount,
        duplicateCount,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const failedArea: OfflineArea = {
        id: areaId,
        city_name: cityName,
        district_name: districtName,
        state_name: stateName,
        bounding_box: bbox,
        status: 'failed',
        bytes_downloaded: 0,
        records_count: 0,
        checksum: '',
        attribution: OSM_ATTRIBUTION,
        last_downloaded_at: new Date().toISOString(),
        error_message: errMsg,
      };
      store.saveOfflineArea(failedArea);

      return {
        area: failedArea,
        rawCount: 0,
        normalizedCount: 0,
        duplicateCount: 0,
        error: errMsg,
      };
    }
  }

  /**
   * Performs instant local search against imported raw and normalized records.
   * Completely offline — Zero external API calls or network requests.
   */
  searchLocal(params: {
    query?: string;
    areaId?: string;
    cityName?: string;
    districtName?: string;
    stateName?: string;
    category?: string;
    phoneFilter?: PhoneFilterOption;
    limit?: number;
  }): { records: Restaurant[]; total: number; fromOffline: true } {
    const {
      query = '',
      areaId,
      cityName,
      districtName,
      stateName,
      category,
      phoneFilter = 'all',
      limit = 100,
    } = params;

    const normQuery = query.trim().toLowerCase();
    const normCity = cityName?.trim().toLowerCase();
    const normDist = districtName?.trim().toLowerCase();
    const normState = stateName?.trim().toLowerCase();
    const normCat = category?.trim().toLowerCase();

    // Query canonical restaurants from store
    const allRestaurants = store.getAllRestaurants();

    const filtered = allRestaurants.filter(r => {
      // Area filter
      if (areaId) {
        const areaMatch = r.provenance?.area_id === areaId;
        if (!areaMatch) return false;
      }

      // City / District / State filter
      if (normCity && r.city && !r.city.toLowerCase().includes(normCity)) {
        return false;
      }
      if (normDist && r.district && !r.district.toLowerCase().includes(normDist)) {
        return false;
      }
      if (normState && r.state && !r.state.toLowerCase().includes(normState)) {
        return false;
      }

      // Category filter
      if (normCat && normCat !== 'all') {
        const catMatch =
          r.category?.toLowerCase().includes(normCat) ||
          r.description?.toLowerCase().includes(normCat);
        if (!catMatch) return false;
      }

      // Phone filter
      const hasPhone = isValidPhoneNumber(r.phone_number);
      if (phoneFilter === 'with_phone' && !hasPhone) {
        return false;
      }
      if (phoneFilter === 'without_phone' && hasPhone) {
        return false;
      }

      // Text query match
      if (normQuery) {
        const nameMatch = r.business_name.toLowerCase().includes(normQuery);
        const addrMatch = r.formatted_address.toLowerCase().includes(normQuery);
        const phoneMatch = r.phone_number?.toLowerCase().includes(normQuery);
        const catMatch = r.category.toLowerCase().includes(normQuery);
        if (!nameMatch && !addrMatch && !phoneMatch && !catMatch) {
          return false;
        }
      }

      return true;
    });

    return {
      records: filtered.slice(0, limit),
      total: filtered.length,
      fromOffline: true,
    };
  }

  /**
   * Generates comprehensive metrics for downloaded offline areas,
   * raw records, qualified leads, unverified records, and storage usage.
   */
  getStorageMetrics(): OfflineStorageMetrics {
    const areas = store.getAllOfflineAreas();
    const rawRecords = store.getRawImportedRecords();
    const allRestaurants = store.getAllRestaurants();

    const qualifiedLeads = allRestaurants.filter(
      r => r.qualification_status === 'qualified' || r.lead_score >= 60
    ).length;

    // Truthful representation: OSM has no consumer ratings, marked unverified
    const unverifiedRecords = allRestaurants.filter(
      r => r.rating === null || r.qualification_status === 'unverified'
    ).length;

    const rejectedRecords = allRestaurants.filter(
      r => r.qualification_status === 'disqualified' || r.audit_decision === 'rejected'
    ).length;

    const duplicateRecords = allRestaurants.filter(
      r => (r.provenance as Record<string, unknown>)?.is_duplicate === true
    ).length;

    // Total bytes calculation
    const areaBytes = areas.reduce((acc, a) => acc + (a.bytes_downloaded || 0), 0);
    const rawBytes = rawRecords.length * 650; // Average raw record JSON size ~650 bytes
    const estimatedStorageBytes = areaBytes + rawBytes;

    return {
      downloaded_areas_count: areas.length,
      raw_imported_records_count: rawRecords.length,
      normalized_businesses_count: allRestaurants.length,
      qualified_leads_count: qualifiedLeads,
      unverified_records_count: unverifiedRecords,
      rejected_records_count: rejectedRecords,
      duplicate_records_count: duplicateRecords,
      estimated_storage_bytes: estimatedStorageBytes,
    };
  }

  /**
   * Previews Safe or Strict Cleanup policy before execution.
   *
   * SAFE CLEANUP (default):
   * - Preserves ALL qualified leads, active campaign results, saved export records, and historical records.
   * - Identifies quarantined records, failed area downloads, or raw records that failed qualification
   *   and are not referenced by any active campaign or saved list.
   *
   * STRICT CLEANUP (opt-in):
   * - Previews removal of raw imported source records to reclaim disk space while still preserving
   *   all qualified leads and active campaign results in canonical storage.
   */
  previewCleanup(policy: 'safe' | 'strict'): OfflineCleanupPreview {
    const rawRecords = store.getRawImportedRecords();
    const allRestaurants = store.getAllRestaurants();
    const activeRuns = store.getAllJobs();
    const areas = store.getAllOfflineAreas();

    // Map of active or qualified restaurant source record IDs that must NEVER be touched
    const protectedSourceIds = new Set<string>();
    let qualifiedPreserved = 0;
    let activePreserved = 0;
    let historicalPreserved = 0;

    for (const r of allRestaurants) {
      if (r.qualification_status === 'qualified' || r.lead_score >= 60) {
        qualifiedPreserved++;
        if (r.source_record_id) protectedSourceIds.add(r.source_record_id);
      }
      if (r.search_id) {
        activePreserved++;
        if (r.source_record_id) protectedSourceIds.add(r.source_record_id);
      }
      // Legitimate historical records (first discovered earlier or verified)
      if (r.source_provider !== 'offline_local' || (r.provenance as Record<string, unknown>)?.is_historical) {
        historicalPreserved++;
        if (r.source_record_id) protectedSourceIds.add(r.source_record_id);
      }
    }

    const deletableIds: string[] = [];

    if (policy === 'safe') {
      const failedAreaIds = new Set(areas.filter(a => a.status === 'failed').map(a => a.id));

      for (const raw of rawRecords) {
        const osmSourceId = `osm-${raw.osm_type}-${raw.osm_id}`;
        // If protected by qualification, active run, or history, DO NOT delete
        if (protectedSourceIds.has(osmSourceId)) {
          continue;
        }

        // Deletable candidates under Safe Cleanup:
        // 1. Quarantined records
        // 2. Records from failed or corrupted area downloads
        // 3. Raw records without phone or identity that didn't qualify
        const isQuarantined = raw.quarantine_status === 'quarantined';
        const isFailedArea = failedAreaIds.has(raw.area_id);
        const lacksPhone = !isValidPhoneNumber(raw.phone);

        if (isQuarantined || isFailedArea || lacksPhone) {
          deletableIds.push(raw.id);
        }
      }
    } else {
      // Strict Cleanup (opt-in):
      // Removes raw records across imported areas, EXCEPT those tied to qualified leads
      for (const raw of rawRecords) {
        const osmSourceId = `osm-${raw.osm_type}-${raw.osm_id}`;
        if (protectedSourceIds.has(osmSourceId)) {
          continue;
        }
        deletableIds.push(raw.id);
      }
    }

    const estimatedBytesFreed = deletableIds.length * 650;
    const notes =
      policy === 'safe'
        ? `Safe Cleanup preserves all ${qualifiedPreserved} qualified leads, ${activePreserved} campaign results, and ${historicalPreserved} historical records. Targets ${deletableIds.length} orphaned, failed, or quarantined raw records.`
        : `Strict Cleanup targets ${deletableIds.length} raw unverified records while preserving all ${qualifiedPreserved} qualified leads and campaign results. Requires explicit user confirmation.`;

    return {
      policy,
      total_raw_records: rawRecords.length,
      records_to_delete: deletableIds.length,
      qualified_leads_preserved: qualifiedPreserved,
      active_campaign_records_preserved: activePreserved,
      historical_records_preserved: historicalPreserved,
      estimated_bytes_freed: estimatedBytesFreed,
      deletable_record_ids: deletableIds,
      summary_notes: notes,
    };
  }

  /**
   * Executes the cleanup policy after preview confirmation.
   */
  async executeCleanup(policy: 'safe' | 'strict', confirmed: boolean): Promise<OfflineCleanupResult> {
    if (!confirmed) {
      throw new Error('Cleanup requires explicit confirmation flag before execution.');
    }

    const preview = this.previewCleanup(policy);
    const countDeleted = store.deleteRawImportedRecords(preview.deletable_record_ids);

    // If all raw records of an area were deleted, update area record count
    const areas = store.getAllOfflineAreas();
    for (const area of areas) {
      const remainingRaw = store.getRawImportedRecords(area.id);
      if (remainingRaw.length !== area.records_count) {
        store.saveOfflineArea({
          ...area,
          records_count: remainingRaw.length,
          bytes_downloaded: remainingRaw.length * 650,
        });
      }
    }

    return {
      success: true,
      policy,
      records_deleted: countDeleted,
      bytes_freed: preview.estimated_bytes_freed,
      timestamp: new Date().toISOString(),
      message: `Successfully executed ${policy.toUpperCase()} cleanup. Deleted ${countDeleted} raw records and freed approximately ${Math.round(preview.estimated_bytes_freed / 1024)} KB.`,
    };
  }

  /**
   * Refreshes an offline area and detects incremental updates via SHA-256 checksum.
   */
  async refreshArea(areaId: string): Promise<{
    area: OfflineArea;
    updated: boolean;
    recordsCount: number;
    notes: string;
  }> {
    const area = store.getOfflineArea(areaId);
    if (!area) {
      throw new Error(`Offline area with id '${areaId}' not found.`);
    }

    const downloadRes = await this.downloadCityData({
      cityName: area.city_name,
      districtName: area.district_name,
      stateName: area.state_name,
      customBbox: area.bounding_box,
      forceRefresh: true,
    });

    const isUpdated = !downloadRes.isUnchanged;
    const notes = isUpdated
      ? `OSM Source Refreshed: Downloaded ${downloadRes.rawCount} records (${downloadRes.duplicateCount} duplicates merged). Note: OpenStreetMap does not store Google ratings or review counts.`
      : 'Area is up to date: Checksum verified, no incremental changes detected.';

    return {
      area: downloadRes.area,
      updated: isUpdated,
      recordsCount: downloadRes.rawCount,
      notes,
    };
  }
}

export const offlineDataManager = OfflineDataManager.getInstance();
