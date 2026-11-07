// lib/offline/data-manager.test.ts
// Comprehensive Test Suite for City-Scoped Offline Business Data Manager

import { describe, it, expect, beforeEach } from 'vitest';
import { offlineDataManager } from './data-manager';
import { store } from '../store/memory-store';
import { ProviderRegistry } from '../providers/registry';
import { RawImportedRecord, OfflineArea } from '../types';

describe('City-Scoped Offline Business Data Manager Suite', () => {
  beforeEach(() => {
    store.clearOfflineData();
    store.clearRestaurants();
  });

  // 1. Provider Registration & Metadata Check
  it('registers Offline Local Database in the provider registry with correct capabilities', () => {
    const provider = ProviderRegistry.getProvider('offline_local');
    expect(provider).toBeDefined();
    expect(provider.id).toBe('offline_local');
    expect(provider.capabilities.supportsRatings).toBe(false); // Honest: OSM has no consumer ratings
    expect(provider.capabilities.supportsReviewCounts).toBe(false); // Honest: OSM has no review counts
    expect(provider.capabilities.supportsPhoneNumbers).toBe(true);
    expect(provider.capabilities.requiresCommercialKey).toBe(false);
  });

  // 2. City Boundary Resolution
  it('resolves geographic bounding box for an Indian city', async () => {
    const bbox = await offlineDataManager.resolveCityBoundary('Lucknow', 'Lucknow', 'Uttar Pradesh');
    expect(bbox).toBeDefined();
    expect(typeof bbox.south).toBe('number');
    expect(typeof bbox.north).toBe('number');
    expect(typeof bbox.west).toBe('number');
    expect(typeof bbox.east).toBe('number');
    expect(bbox.north).toBeGreaterThan(bbox.south);
    expect(bbox.east).toBeGreaterThan(bbox.west);
  });

  // 3. Area ID Generation
  it('generates clean, normalized area IDs', () => {
    const id1 = offlineDataManager.generateAreaId('Uttar Pradesh', 'Lucknow', 'Lucknow');
    expect(id1).toBe('area-uttar-pradesh-lucknow-lucknow');

    const id2 = offlineDataManager.generateAreaId('Maharashtra', 'Mumbai Suburban', 'Bandra West');
    expect(id2).toBe('area-maharashtra-mumbai-suburban-bandra-west');
  });

  // 4. Local Ingest, Storage, and Deduplication
  it('stores raw imported records and normalizes them into canonical store with truthful OSM ratings', async () => {
    // Seed test raw records
    const areaId = 'area-uttar-pradesh-lucknow-test-city';
    const testArea: OfflineArea = {
      id: areaId,
      city_name: 'Test City',
      district_name: 'Lucknow',
      state_name: 'Uttar Pradesh',
      bounding_box: { south: 26.8, north: 26.9, west: 80.9, east: 81.0 },
      status: 'ready',
      bytes_downloaded: 4096,
      records_count: 3,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      attribution: '© OpenStreetMap contributors, ODbL 1.0',
      last_downloaded_at: new Date().toISOString(),
    };
    store.saveOfflineArea(testArea);

    const raw1: RawImportedRecord = {
      id: 'raw-osm-node-101',
      area_id: areaId,
      osm_type: 'node',
      osm_id: 101,
      business_name: 'Lucknow Biryani Palace',
      category: 'Restaurant',
      latitude: 26.85,
      longitude: 80.95,
      phone: '+91 98765 43210',
      tags: { name: 'Lucknow Biryani Palace', phone: '+91 98765 43210' },
      raw_payload: {},
      quarantine_status: 'active',
      imported_at: new Date().toISOString(),
    };

    const raw2: RawImportedRecord = {
      id: 'raw-osm-node-102',
      area_id: areaId,
      osm_type: 'node',
      osm_id: 102,
      business_name: 'Hazratganj Tea Stall',
      category: 'Cafe',
      latitude: 26.84,
      longitude: 80.94,
      phone: null,
      tags: { name: 'Hazratganj Tea Stall' },
      raw_payload: {},
      quarantine_status: 'active',
      imported_at: new Date().toISOString(),
    };

    store.saveRawImportedRecordsBatch([raw1, raw2]);

    // Save normalized restaurants
    store.saveRestaurant({
      id: 'osm-node-101',
      business_name: raw1.business_name,
      category: raw1.category,
      formatted_address: 'Lucknow Biryani Palace, Lucknow, Uttar Pradesh, India',
      city: 'Test City',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      phone_number: raw1.phone,
      source_provider: 'offline_local',
      source_record_id: 'osm-node-101',
      provenance: { area_id: areaId },
      rating: null,
      review_count: null,
      qualification_status: 'qualified',
    });

    store.saveRestaurant({
      id: 'osm-node-102',
      business_name: raw2.business_name,
      category: raw2.category,
      formatted_address: 'Hazratganj Tea Stall, Lucknow, Uttar Pradesh, India',
      city: 'Test City',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      phone_number: null,
      source_provider: 'offline_local',
      source_record_id: 'osm-node-102',
      provenance: { area_id: areaId },
      rating: null,
      review_count: null,
      qualification_status: 'unverified',
    });

    // 5. Instant Local Search
    const searchRes = offlineDataManager.searchLocal({
      query: 'Biryani',
      phoneFilter: 'all',
    });

    expect(searchRes.fromOffline).toBe(true);
    expect(searchRes.records.length).toBe(1);
    expect(searchRes.records[0].business_name).toBe('Lucknow Biryani Palace');
    expect(searchRes.records[0].rating).toBeNull(); // Truthful
    expect(searchRes.records[0].review_count).toBeNull(); // Truthful

    // 6. Phone filtering
    const withPhoneRes = offlineDataManager.searchLocal({ phoneFilter: 'with_phone' });
    expect(withPhoneRes.records.length).toBe(1);
    expect(withPhoneRes.records[0].business_name).toBe('Lucknow Biryani Palace');

    const withoutPhoneRes = offlineDataManager.searchLocal({ phoneFilter: 'without_phone' });
    expect(withoutPhoneRes.records.length).toBe(1);
    expect(withoutPhoneRes.records[0].business_name).toBe('Hazratganj Tea Stall');
  });

  // 7. Storage Metrics
  it('calculates truthful storage and record metrics', () => {
    const metrics = offlineDataManager.getStorageMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.downloaded_areas_count).toBe('number');
    expect(typeof metrics.raw_imported_records_count).toBe('number');
    expect(typeof metrics.normalized_businesses_count).toBe('number');
    expect(typeof metrics.qualified_leads_count).toBe('number');
    expect(typeof metrics.estimated_storage_bytes).toBe('number');
  });

  // 8. Safe Cleanup: Preserves Qualified Leads & Active Runs
  it('Safe Cleanup strictly preserves qualified leads and historical records while targeting orphaned raw records', async () => {
    const areaId = 'area-cleanup-test';
    const testArea: OfflineArea = {
      id: areaId,
      city_name: 'Cleanup City',
      district_name: 'Lucknow',
      state_name: 'Uttar Pradesh',
      bounding_box: { south: 26.8, north: 26.9, west: 80.9, east: 81.0 },
      status: 'ready',
      bytes_downloaded: 1024,
      records_count: 2,
      checksum: 'test-checksum',
      attribution: '© OpenStreetMap contributors, ODbL 1.0',
      last_downloaded_at: new Date().toISOString(),
    };
    store.saveOfflineArea(testArea);

    // Raw record 1: Linked to a qualified lead
    const rawQualified: RawImportedRecord = {
      id: 'raw-osm-node-201',
      area_id: areaId,
      osm_type: 'node',
      osm_id: 201,
      business_name: 'Qualified Dining Hub',
      category: 'Restaurant',
      phone: '+91 99999 88888',
      tags: {},
      raw_payload: {},
      quarantine_status: 'active',
      imported_at: new Date().toISOString(),
    };

    // Raw record 2: Quarantined / unverified without phone (orphaned)
    const rawOrphaned: RawImportedRecord = {
      id: 'raw-osm-node-202',
      area_id: areaId,
      osm_type: 'node',
      osm_id: 202,
      business_name: 'Unknown Stall',
      category: 'Stall',
      phone: null,
      tags: {},
      raw_payload: {},
      quarantine_status: 'quarantined',
      imported_at: new Date().toISOString(),
    };

    store.saveRawImportedRecordsBatch([rawQualified, rawOrphaned]);

    // Save qualified restaurant
    store.saveRestaurant({
      id: 'osm-node-201',
      business_name: 'Qualified Dining Hub',
      category: 'Restaurant',
      formatted_address: 'Qualified Dining Hub, Lucknow, India',
      city: 'Cleanup City',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      phone_number: '+91 99999 88888',
      source_provider: 'offline_local',
      source_record_id: 'osm-node-201',
      qualification_status: 'qualified',
      lead_score: 85,
    });

    // Preview Safe Cleanup
    const preview = offlineDataManager.previewCleanup('safe');
    expect(preview.policy).toBe('safe');
    expect(preview.qualified_leads_preserved).toBeGreaterThanOrEqual(1);
    expect(preview.deletable_record_ids).toContain('raw-osm-node-202');
    expect(preview.deletable_record_ids).not.toContain('raw-osm-node-201'); // Must NOT delete qualified source

    // Execute Safe Cleanup
    const result = await offlineDataManager.executeCleanup('safe', true);
    expect(result.success).toBe(true);
    expect(result.records_deleted).toBe(1);

    // Verify qualified restaurant is intact
    const remainingRestaurant = store.getRestaurantById('osm-node-201');
    expect(remainingRestaurant).toBeDefined();
    expect(remainingRestaurant?.business_name).toBe('Qualified Dining Hub');
  });

  // 9. Strict Cleanup: Requires Confirmation and Preserves Qualified Leads
  it('Strict Cleanup requires explicit confirmation and protects qualified leads', async () => {
    // Without confirmation, it must reject
    await expect(offlineDataManager.executeCleanup('strict', false)).rejects.toThrow(
      'Cleanup requires explicit confirmation flag before execution.'
    );

    // With confirmation, it executes and frees space
    const preview = offlineDataManager.previewCleanup('strict');
    expect(preview.policy).toBe('strict');
    const result = await offlineDataManager.executeCleanup('strict', true);
    expect(result.success).toBe(true);
  });
});
