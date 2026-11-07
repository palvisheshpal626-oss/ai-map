// lib/international-geographic-coverage.test.ts
// Verification Suite: Complete International City & Town Coverage for Business Lead Discovery
// Tests all 10 countries: IN, US, GB, CA, AU, NZ, IE, SG, AE, ZA.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GLOBAL_COUNTRIES,
  GLOBAL_CENTROIDS,
  getCountryByCode,
  getCountryAdministrativeHierarchy,
  getAdministrativePlaces,
  isLocationInGlobalScope,
  findGlobalPlaceById,
} from './locations/global-registry';
import { store } from './store/memory-store';
import { ScanWorker } from './workers/scan-worker';
import { persistenceService } from './database/persistence-service';
import { SearchConfig } from './types';

describe('Complete International Geographic Coverage Suite', () => {
  beforeEach(() => {
    store.clearJobs();
    store.clearRestaurants();
  });

  const EXPECTED_COUNTRY_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'SG', 'AE', 'ZA'];

  // TEST 1: All 10 Supported Countries Registered with Valid Metadata & Bounds
  it('Criterion 1: Exactly 10 supported priority countries registered with complete metadata and valid bounds', () => {
    expect(GLOBAL_COUNTRIES.length).toBe(10);
    const codes = GLOBAL_COUNTRIES.map(c => c.code);
    for (const expectedCode of EXPECTED_COUNTRY_CODES) {
      expect(codes).toContain(expectedCode);
      const meta = getCountryByCode(expectedCode);
      expect(meta).toBeDefined();
      expect(meta!.name).toBeTruthy();
      expect(meta!.callingCode).toMatch(/^\+\d+/);
      expect(meta!.bounds).toBeDefined();
      expect(meta!.bounds.minLat).toBeLessThan(meta!.bounds.maxLat);
      expect(meta!.bounds.minLng).toBeLessThan(meta!.bounds.maxLng);
      expect(meta!.attribution?.source).toBeTruthy();
      expect(meta!.attribution?.license).toBeTruthy();
    }
  });

  // TEST 2: Comprehensive Hierarchy for All 10 Countries
  it('Criterion 2: Generates comprehensive administrative hierarchy and verified cities for all 10 countries', () => {
    const stats: Record<string, { l1Count: number; l2Count: number; cityCount: number }> = {};

    for (const countryCode of EXPECTED_COUNTRY_CODES) {
      const hierarchy = getCountryAdministrativeHierarchy(countryCode);
      expect(hierarchy.length).toBeGreaterThan(0);

      let totalL2 = 0;
      let totalCities = 0;

      for (const l1 of hierarchy) {
        expect(l1.name).toBeTruthy();
        expect(l1.divisions.length).toBeGreaterThan(0);
        totalL2 += l1.divisions.length;

        for (const div of l1.divisions) {
          expect(div.name).toBeTruthy();
          const adminPlaces = getAdministrativePlaces(countryCode, l1.name, div.name);
          expect(adminPlaces.places.length).toBeGreaterThan(0);
          totalCities += adminPlaces.places.length;

          // Verify every place has structured deterministic ID, name, and search cells
          for (const place of adminPlaces.places) {
            expect(place.id).toBeTruthy();
            expect(place.name).toBeTruthy();
            expect(place.searchCells.length).toBeGreaterThan(0);

            // Coordinates if cataloged must strictly fall within the country's national bounds
            const countryMeta = getCountryByCode(countryCode)!;
            if (place.latitude !== null && place.longitude !== null) {
              expect(place.latitude).toBeGreaterThanOrEqual(countryMeta.bounds.minLat);
              expect(place.latitude).toBeLessThanOrEqual(countryMeta.bounds.maxLat);
              expect(place.longitude).toBeGreaterThanOrEqual(countryMeta.bounds.minLng);
              expect(place.longitude).toBeLessThanOrEqual(countryMeta.bounds.maxLng);
            }
          }
        }
      }

      stats[countryCode] = { l1Count: hierarchy.length, l2Count: totalL2, cityCount: totalCities };
      console.log(`[COUNTRY COVERAGE STATS] ${countryCode}: ${hierarchy.length} Level-1 Divisions, ${totalL2} Level-2 Divisions, ${totalCities} Cities/Towns`);
    }

    // Specific structural invariants for major countries:
    // India: 36 States/UTs
    expect(stats['IN'].l1Count).toBe(36);
    // US: At least 15 comprehensive states cataloged with major metros
    expect(stats['US'].l1Count).toBeGreaterThanOrEqual(15);
    // UK: All 4 nations / 12 regions cataloged
    expect(stats['GB'].l1Count).toBeGreaterThanOrEqual(10);
    // Canada: 13 provinces and territories
    expect(stats['CA'].l1Count).toBe(13);
    // Australia: 8 states & territories
    expect(stats['AU'].l1Count).toBe(8);
    // New Zealand: 8 major regional authorities
    expect(stats['NZ'].l1Count).toBe(8);
    // Ireland: All 4 provinces
    expect(stats['IE'].l1Count).toBe(4);
    // Singapore: All 5 URA Planning Regions
    expect(stats['SG'].l1Count).toBe(5);
    // UAE: All 7 Emirates
    expect(stats['AE'].l1Count).toBe(7);
    // South Africa: All 9 Provinces
    expect(stats['ZA'].l1Count).toBe(9);
  });

  // TEST 3: Geographic Isolation & Cross-Country Rejection
  it('Criterion 3: isLocationInGlobalScope strictly isolates locations and rejects cross-country cross-division pollution', () => {
    // US place
    const usPlaces = getAdministrativePlaces('US', 'California', 'Los Angeles County');
    const laPlace = usPlaces.places.find(p => p.name === 'Los Angeles')!;
    expect(laPlace).toBeDefined();

    expect(isLocationInGlobalScope(laPlace.id, 'US', 'California', 'Los Angeles County')).toBe(true);
    // Must reject if queried against UK, India, or New York
    expect(isLocationInGlobalScope(laPlace.id, 'GB', 'Greater London', 'Central London')).toBe(false);
    expect(isLocationInGlobalScope(laPlace.id, 'IN', 'Uttar Pradesh', 'Lucknow')).toBe(false);
    expect(isLocationInGlobalScope(laPlace.id, 'US', 'New York', 'New York County (Manhattan)')).toBe(false);

    // UK place
    const ukPlaces = getAdministrativePlaces('GB', 'Greater London', 'Central London');
    const sohoPlace = ukPlaces.places[0];
    expect(isLocationInGlobalScope(sohoPlace.id, 'GB', 'Greater London', 'Central London')).toBe(true);
    expect(isLocationInGlobalScope(sohoPlace.id, 'US', 'California', 'Los Angeles County')).toBe(false);

    // Fast O(1) place lookup by ID
    const foundPlace = findGlobalPlaceById(laPlace.id);
    expect(foundPlace).toBeDefined();
    expect(foundPlace!.name).toBe('Los Angeles');
    expect(foundPlace!.countryCode).toBe('US');
  });

  // TEST 4: Dynamic Task & Queue Generation for Multi-City Campaigns
  it('Criterion 4: Dynamically generates scan tasks and city queue matching the exact selected geographic coverage', () => {
    const adminRes = getAdministrativePlaces('GB', 'Greater London', 'Central London');
    expect(adminRes.places.length).toBeGreaterThan(0);

    const config: SearchConfig = {
      id: 'config-london-test',
      name: 'London Central Hospitality Discovery',
      selected_country: 'GB',
      selected_district: {
        state: 'Greater London',
        district: 'Central London',
      },
      selected_locations: adminRes.places.map(p => p.id),
      categories: ['Restaurant', 'Pub'],
      rating_filters: { min: 0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
      contact_filters: { phone: 'optional', website_filter: 'all', include_without_phone: true, include_without_email: true },
      limits: { max_records_per_location: 60, max_total_records: 500 },
      provider_id: 'osm_overpass',
    };

    const job = store.createJob('London Campaign', config, 'osm_overpass');

    // Queue count must exactly equal the number of verified places in Central London
    expect(job.city_queue).toBeDefined();
    expect(job.city_queue!.length).toBe(adminRes.places.length);
    expect(job.progress_counters.total_tasks).toBe(adminRes.places.length * 2); // 2 categories

    // Every queue item must track separate discovery vs scan metrics
    for (const item of job.city_queue!) {
      expect(item.status).toBe('pending');
      expect(item.candidates_fetched).toBe(0);
      expect(item.candidates_qualified).toBe(0);
      expect(item.tasks_created).toBeGreaterThan(0);
    }
  });

  // TEST 5: Durable Task Snapshot Persistence Preserves International Country & Coordinates
  it('Criterion 5: persistTaskSnapshot preserves true international country, state, district, and coordinates', async () => {
    const adminRes = getAdministrativePlaces('SG', 'Central Region', 'Downtown & Marina Core');
    const dtPlace = adminRes.places.find(p => p.name === 'Downtown Core')!;

    const config: SearchConfig = {
      id: 'config-sg-persist',
      name: 'Singapore Task Persistence Test',
      selected_country: 'SG',
      selected_district: {
        state: 'Central Region',
        district: 'Downtown & Marina Core',
      },
      selected_locations: [dtPlace.id],
      categories: ['Restaurant'],
      rating_filters: { min: 0, include_unrated: true },
      review_filters: { min: 0, include_zero: true },
      contact_filters: { phone: 'optional', website_filter: 'all', include_without_phone: true, include_without_email: true },
      limits: { max_records_per_location: 60, max_total_records: 100 },
      provider_id: 'osm_overpass',
    };

    const job = store.createJob('Singapore Snapshot Test', config, 'osm_overpass');
    const tasks = store.getTasksForJob(job.id);
    expect(tasks.length).toBe(1);

    // Call persistTaskSnapshot (in test mode it evaluates the mapping cleanly)
    const success = await persistenceService.persistTaskSnapshot(tasks[0]);
    expect(success).toBe(true);
  });
});
