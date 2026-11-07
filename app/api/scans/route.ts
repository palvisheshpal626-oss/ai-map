import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store/memory-store';
import { ScanWorker } from '@/lib/workers/scan-worker';
import { persistenceService } from '@/lib/database/persistence-service';
import { SearchConfig } from '@/lib/types';
import { findVerifiedCityById } from '@/lib/locations/india';
import { isLocationInGlobalScope } from '@/lib/locations/global-registry';

export async function GET() {
  let jobs = store.getAllJobs();
  if (jobs.length === 0) {
    await store.syncJobsFromSupabase();
    jobs = store.getAllJobs();
  }
  // Auto-pump any queued jobs to guarantee resilient execution
  ScanWorker.processQueuedJobs();
  return NextResponse.json({ success: true, jobs: store.getAllJobs() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, config, providerId } = body as {
      name: string;
      config: SearchConfig;
      providerId: string;
    };

    if (!name || !config || ((!config.selected_locations || config.selected_locations.length === 0) && !config.selected_district)) {
      return NextResponse.json(
        { success: false, error: 'Job name and at least one target location or district are required.' },
        { status: 400 }
      );
    }

    // Server-side Geographic Validation & Isolation Check
    const targetDist = config.selected_district?.district;
    const targetState = config.selected_district?.state;
    const targetCountry = (config.selected_country || 'IN').toUpperCase();
    const isIndia = targetCountry === 'IN' || targetCountry === 'INDIA';

    if (targetDist && config.selected_locations && config.selected_locations.length > 0) {
      const foreignLocations: string[] = [];
      const validLocations: string[] = [];

      for (const locId of config.selected_locations) {
        if (isIndia) {
          if (locId.startsWith('city-')) {
            const city = findVerifiedCityById(locId);
            if (city && city.district.trim().toLowerCase() !== targetDist.trim().toLowerCase()) {
              foreignLocations.push(`${locId} (${city.name}, ${city.district})`);
              continue;
            }
          }
          validLocations.push(locId);
        } else {
          const inGlobal = isLocationInGlobalScope(locId, targetCountry, targetState || '', targetDist);
          if (!inGlobal) {
            foreignLocations.push(locId);
            continue;
          }
          validLocations.push(locId);
        }
      }

      if (foreignLocations.length > 0) {
        console.warn(
          `[GEOGRAPHIC ISOLATION] Detected and quarantined ${foreignLocations.length} foreign location(s) from campaign '${name}':`,
          foreignLocations
        );
        if (validLocations.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Geographic validation failed: Queued locations belong to a different district than targeted district '${targetDist}, ${targetState}'. Quarantined foreign locations: ${foreignLocations.join(', ')}`,
            },
            { status: 400 }
          );
        }
        // Sanitize configuration to strictly keep only verified locations of target district
        config.selected_locations = validLocations;
      }
    }

    const job = store.createJob(name, config, providerId || 'osm_overpass');

    // Durably persist initial job record and tasks to Supabase
    await persistenceService.persistJobSnapshot(job);
    const tasks = store.getTasksForJob(job.id);
    for (const task of tasks) {
      await persistenceService.persistTaskSnapshot(task);
    }

    // Launch worker asynchronously in background
    setTimeout(() => {
      ScanWorker.runJob(job.id);
    }, 10);

    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
