import { describe, it, expect } from 'vitest';
import { OpenStreetMapOverpassProvider } from './providers/osm-overpass';
import { store } from './store/memory-store';
import { ScanWorker } from './workers/scan-worker';
import { getAdministrativePlaces, isLocationInGlobalScope } from './locations/global-registry';

describe('International Discovery - Singapore Verified Pipeline', () => {
  it('correctly resolves and validates Singapore locations without Indian fallback contamination', () => {
    const adminRes = getAdministrativePlaces('SG', 'Central Region', 'Downtown & Marina Core');
    expect(adminRes.places.length).toBeGreaterThan(0);
    const downtownPlace = adminRes.places.find(p => p.name === 'Downtown Core');
    expect(downtownPlace).toBeDefined();
    expect(downtownPlace!.countryCode).toBe('SG');
    expect(downtownPlace!.countryName).toBe('Singapore');

    const inScope = isLocationInGlobalScope(
      downtownPlace!.id,
      'SG',
      'Central Region',
      'Downtown & Marina Core'
    );
    expect(inScope).toBe(true);

    // Mismatched country or division must be rejected
    const foreignCountryScope = isLocationInGlobalScope(
      downtownPlace!.id,
      'IN',
      'Uttar Pradesh',
      'Lucknow'
    );
    expect(foreignCountryScope).toBe(false);
  });

  it('searches live OpenStreetMap data for Singapore and retrieves authentic venues', async () => {
    const provider = new OpenStreetMapOverpassProvider();
    const res = await provider.searchBusinesses({
      query: 'Restaurant in Downtown Core, Central Region, Singapore',
      category: 'Restaurant',
      latitude: 1.2879,
      longitude: 103.8519,
      countryCode: 'SG',
    });

    expect(res.status).toBe('success');
    expect(res.restaurants.length).toBeGreaterThan(0);
    console.log(`[SINGAPORE DISCOVERY TEST] Fetched ${res.restaurants.length} live records for Downtown Core, Singapore`);

    const first = res.restaurants[0];
    console.log(`   Sample Restaurant: "${first.business_name}"`);
    console.log(`   Address: "${first.formatted_address}"`);
    console.log(`   Country: "${first.country}", Lat: ${first.latitude}, Lon: ${first.longitude}`);

    expect(first.country).toBe('Singapore');
    expect(first.latitude).toBeGreaterThan(1.15);
    expect(first.latitude).toBeLessThan(1.48);
    expect(first.longitude).toBeGreaterThan(103.6);
    expect(first.longitude).toBeLessThan(104.05);
  });

  it('runs a complete Singapore scan job and successfully discovers and qualifies leads', async () => {
    const adminRes = getAdministrativePlaces('SG', 'Central Region', 'Downtown & Marina Core');
    const downtownPlace = adminRes.places.find(p => p.name === 'Downtown Core')!;

    const config = {
      selected_country: 'SG',
      selected_district: {
        state: 'Central Region',
        district: 'Downtown & Marina Core',
      },
      selected_locations: [downtownPlace.id],
      categories: ['Restaurant'],
      contact_filters: {
        phone_filter: 'all' as const,
        phone: 'optional' as const,
        include_without_phone: true,
      },
    };

    const job = store.createJob('Singapore Downtown Core Discovery', config as any, 'osm_overpass');
    expect(job).toBeDefined();
    expect(job.selected_country).toBe('SG');

    const tasks = store.getTasksForJob(job.id);
    expect(tasks.length).toBe(1);
    expect(tasks[0].status).toBe('queued');

    // Run the worker
    await ScanWorker.runJob(job.id);

    const updatedJob = store.getJobById(job.id);
    expect(updatedJob).toBeDefined();
    console.log(`[SINGAPORE SCAN RESULT] Status: ${updatedJob!.status}`);
    console.log(`   Total Fetched: ${updatedJob!.progress_counters?.fetched_count}`);
    console.log(`   Discovered: ${updatedJob!.progress_counters?.discovered_count}`);
    console.log(`   Qualified: ${updatedJob!.progress_counters?.qualified_count}`);
    console.log(`   Tasks completed: ${updatedJob!.progress_counters?.completed_tasks}/${updatedJob!.progress_counters?.total_tasks}`);

    expect(updatedJob!.progress_counters?.completed_tasks).toBe(1);
    expect(updatedJob!.progress_counters?.fetched_count).toBeGreaterThan(0);
    expect(updatedJob!.progress_counters?.discovered_count).toBeGreaterThan(0);
    expect(updatedJob!.progress_counters?.qualified_count).toBeGreaterThan(0);
    expect(updatedJob!.status).toMatch(/completed/);
  });
});
