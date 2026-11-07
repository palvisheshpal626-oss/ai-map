// lib/workers/queue-processor.test.ts
// Integration test verifying scan job queue processing, auto-recovery, and provider validation

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../store/memory-store';
import { ScanWorker } from './scan-worker';
import { persistenceService } from '../database/persistence-service';
import { SearchConfig } from '../types';

function createMockConfig(name: string): SearchConfig {
  return {
    id: `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    selected_country: 'IN',
    selected_district: { state: 'Uttar Pradesh', district: 'Lucknow' },
    selected_locations: ['city-uttar-pradesh-lucknow-lucknow'],
    categories: ['Restaurant'],
    rating_filters: { min: 0, max: null, include_unrated: true },
    review_filters: { min: 0, max: null, include_zero: true },
    contact_filters: { phone: 'optional', website_filter: 'all' },
    limits: {
      max_records_per_location: 50,
      max_total_records: 500,
    },
    provider_id: 'osm_overpass',
  };
}

describe('Scan Jobs Queue & Worker Execution Suite', () => {
  beforeEach(() => {
    // Clear in-memory jobs before tests
    (store as any).scanJobs.clear();
    (store as any).scanTasks.clear();
  });

  it('immediately surfaces configuration error when provider is unconfigured instead of hanging in queued', async () => {
    const config = createMockConfig('Unconfigured Places Test');
    const job = store.createJob('Unconfigured Places Test', config, 'google_places');
    expect(job.status).toBe('queued');

    // Run the job
    await ScanWorker.runJob(job.id);

    const updated = store.getJobById(job.id);
    expect(updated).toBeDefined();
    expect(updated?.status).toBe('failed');
    expect(updated?.error_summary).toContain('Google Places');
    expect(updated?.error_summary).toContain('not configured');

    const tasks = store.getTasksForJob(job.id);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].status).toBe('failed');
    expect(tasks[0].last_error).toContain('not configured');
  });

  it('allows resuming or starting a queued job via resumeJob', async () => {
    const config = createMockConfig('Resume Queued Test');
    const job = store.createJob('Resume Queued Test', config, 'google_places');
    expect(job.status).toBe('queued');

    // Call resumeJob on queued job
    ScanWorker.resumeJob(job.id);

    // Wait a brief tick for async worker dispatch
    await new Promise(r => setTimeout(r, 50));

    const updated = store.getJobById(job.id);
    expect(updated?.status).not.toBe('queued');
  });

  it('processQueuedJobs automatically pumps jobs out of queued state', async () => {
    const config = createMockConfig('Auto Pump Test');
    const job = store.createJob('Auto Pump Test', config, 'google_places');
    expect(job.status).toBe('queued');

    ScanWorker.processQueuedJobs();

    // Wait a brief tick
    await new Promise(r => setTimeout(r, 50));

    const updated = store.getJobById(job.id);
    expect(updated?.status).not.toBe('queued');
  });

  it('atomically claims a job and recovers even if job was not pre-persisted to Supabase', async () => {
    const config = createMockConfig('Claim Job Resilience Test');
    const job = store.createJob('Claim Job Resilience Test', config, 'osm_overpass');
    expect(job.status).toBe('queued');

    // Test claimJob directly
    const claimed = await persistenceService.claimJob(job.id, { allowTestPersistence: true });
    expect(claimed).toBe(true);
  });
});
