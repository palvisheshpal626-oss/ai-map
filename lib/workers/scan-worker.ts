// lib/workers/scan-worker.ts
// Background Scan Worker Engine with Concurrency Control, Retry with Jitter, and Checkpointing
// Implements District-First, City-by-City, Restaurant-by-Restaurant Discovery & Audit Pipeline

import { store } from '../store/memory-store';
import { ProviderRegistry } from '../providers/registry';
import { ScanJob, ScanTask, PhoneFilterOption, CandidateAuditRecord, CityQueueItem, DistrictCoverageSummary, Restaurant } from '../types';
import { getNormalizedIndiaLocations, findLocationById, isLocationInDistrict } from '../locations/india';
import { findGlobalPlaceById, getCountryByCode, isLocationInGlobalScope } from '../locations/global-registry';
import { verifyCandidateWithAudit } from '../qualification/qualifier';
import { analyzeRestaurantOpportunity } from '../websites/opportunity-analyzer';
import { persistenceService } from '../database/persistence-service';

export class ScanWorker {
  // Concurrency lock to prevent multiple concurrent runs of the same job
  private static activeJobLocks = new Set<string>();

  /**
   * Processes all queued tasks / cities for a given job asynchronously without blocking HTTP response
   */
  static async runJob(jobId: string) {
    if (this.activeJobLocks.has(jobId)) {
      return;
    }
    const claimed = await persistenceService.claimJob(jobId);
    if (!claimed) {
      return;
    }
    this.activeJobLocks.add(jobId);

    try {
      const job = store.getJobById(jobId);
      if (!job || job.status === 'cancelled') return;

      store.updateJob(jobId, { status: 'running', started_at: job.started_at || new Date().toISOString() });
      await persistenceService.persistJobSnapshot(store.getJobById(jobId)!);
      let currentRun = store.getSearchRun(jobId);
      if (!currentRun) {
        currentRun = store.startSearchRun(jobId, {
          query: job.name,
          providerId: job.provider_id,
          minRatingApplied: job.configuration_snapshot?.rating_filters?.min,
          minReviewsApplied: job.configuration_snapshot?.review_filters?.min,
        });
      }

      const provider = ProviderRegistry.getProvider(job.provider_id);

      // Fast-fail if provider is not configured rather than retrying 40+ tasks fruitlessly
      if (!provider.isConfigured()) {
        const errorMsg = `Selected provider '${provider.name}' (${job.provider_id}) is not configured. Missing required API key or credentials in environment.`;
        console.warn(`[WORKER] ${errorMsg} Marking job ${jobId} failed.`);

        const allTasks = store.getTasksForJob(jobId);
        for (const task of allTasks) {
          if (task.status === 'queued') {
            store.updateTask(task.id, {
              status: 'failed',
              last_error: errorMsg,
            });
            await persistenceService.persistTaskSnapshot(store.getTaskById(task.id)!);
          }
        }

        if (job.city_queue && job.city_queue.length > 0) {
          for (const cityItem of job.city_queue) {
            store.updateCityQueueItem(jobId, cityItem.id, {
              status: 'failed',
              last_error: errorMsg,
            });
          }
        }

        store.updateJob(jobId, {
          status: 'failed',
          error_summary: errorMsg,
          diagnostic_summary: errorMsg,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        await persistenceService.persistJobSnapshot(store.getJobById(jobId)!);
        return;
      }
      const locations = getNormalizedIndiaLocations();
      const locMap = new Map(locations.map(l => [l.id, l]));

      // Idempotent tracking: initialize from existing records already stored for this job
      const existingJobRecords = store.getRestaurantsForRun(jobId);
      const discoveredSet = new Set<string>(existingJobRecords.map(r => r.id));
      const qualifiedSet = new Set<string>(
        existingJobRecords.filter(r => r.qualification_status === 'qualified').map(r => r.id)
      );
      const unverifiedSet = new Set<string>(
        existingJobRecords.filter(r => r.qualification_status === 'unverified').map(r => r.id)
      );
      const jobSeenIds = new Set<string>(existingJobRecords.map(r => r.id));
      let duplicateCount = job.progress_counters?.duplicate_count || 0;
      let totalFetched = job.progress_counters?.fetched_count || 0;
      let rejectedCount = job.progress_counters?.rejected_count || 0;
      let totalPersisted = job.progress_counters?.persisted_count || 0;
      let totalPersistFailed = job.progress_counters?.persistence_failed_count || 0;
      let totalAssociated = job.progress_counters?.associated_count || 0;
      const rejectionBreakdown: Record<string, number> = { ...(job.progress_counters?.rejection_breakdown || {}) };
      let apiRequests = job.usage_counters?.api_requests || 0;

      const configSnapshot = job.configuration_snapshot;

      // --- PRE-FLIGHT GEOGRAPHIC ISOLATION AUDIT ---
      // Ensure all queued tasks and cityQueue items strictly belong to targeted district & state.
      const targetCountry = (job.selected_country || configSnapshot?.selected_country || 'IN').toUpperCase();
      const isIndia = targetCountry === 'IN' || targetCountry === 'INDIA';

      const targetDistNorm = (job.selected_district?.district || configSnapshot?.selected_district?.district || '').trim().toLowerCase();
      const targetStateNorm = (job.selected_district?.state || configSnapshot?.selected_district?.state || '').trim().toLowerCase();

      if (targetDistNorm) {
        const allJobTasks = store.getTasksForJob(jobId);
        for (const task of allJobTasks) {
          const isMatch = isIndia
            ? isLocationInDistrict(task.location_id, targetStateNorm, targetDistNorm)
            : isLocationInGlobalScope(task.location_id, targetCountry, targetStateNorm, targetDistNorm);

          if (!isMatch) {
            console.warn(
              `[WORKER ISOLATION] Quarantining foreign task '${task.id}' (Location: '${task.location_id}'). Target district is '${job.selected_district?.district}'.`
            );
            store.updateTask(task.id, {
              status: 'cancelled',
              last_error: `Geographic isolation: Location does not belong to target district ${job.selected_district?.district}.`,
            });
          }
        }

        if (job.city_queue && job.city_queue.length > 0) {
          for (const cityItem of job.city_queue) {
            const isMatch = isIndia
              ? isLocationInDistrict(cityItem.id, targetStateNorm, targetDistNorm)
              : isLocationInGlobalScope(cityItem.id, targetCountry, targetStateNorm, targetDistNorm);

            if (!isMatch) {
              console.warn(
                `[WORKER ISOLATION] Quarantining foreign city queue item '${cityItem.city_name}' (${cityItem.district_name}). Target is '${job.selected_district?.district}'.`
              );
              store.updateCityQueueItem(jobId, cityItem.id, {
                status: 'failed',
                last_error: `Geographic isolation mismatch: City belongs to ${cityItem.district_name}, expected ${job.selected_district?.district}.`,
              });
            }
          }
        }
      }

      // 1. Check if job has queued scan tasks (strictly uncancelled)
      const queuedTasks = store.getTasksForJob(jobId).filter(t => t.status === 'queued' || t.status === 'running');

      if (queuedTasks.length > 0) {
        // Task-driven execution (supports location picker & legacy tests)
        for (const task of queuedTasks) {
          const currentJob = store.getJobById(jobId);
          if (!currentJob || currentJob.status === 'paused' || currentJob.status === 'cancelled') {
            break;
          }

          store.updateTask(task.id, { status: 'running', attempted_at: new Date().toISOString() });
          await persistenceService.persistTaskSnapshot(store.getTaskById(task.id)!);

          const loc = locMap.get(task.location_id) || findLocationById(task.location_id);
          const globalPlace = !loc ? findGlobalPlaceById(task.location_id) : undefined;
          const locName = loc?.locality || loc?.city || loc?.district || globalPlace?.name || 'Local Area';
          const cityName = loc?.city || globalPlace?.name || locName;
          const districtName = loc?.district || globalPlace?.level2Name || cityName;
          const stateName = loc?.state || globalPlace?.level1Name || 'State';
          const targetCountryCode = (globalPlace?.countryCode || job.selected_country || configSnapshot?.selected_country || 'IN').toUpperCase();
          const targetCountryName = globalPlace?.countryName || (getCountryByCode(targetCountryCode)?.name || 'India');

          // Update current city being processed
          store.updateJob(jobId, { current_city: `${locName} (${districtName})` });

          // Also update matching city in city_queue if present
          if (job.city_queue && job.city_queue.length > 0) {
            const matchingCity = job.city_queue.find(
              c => c.city_name.toLowerCase().includes(cityName.toLowerCase()) ||
                   cityName.toLowerCase().includes(c.city_name.toLowerCase()) ||
                   c.id === task.location_id
            );
            if (matchingCity && matchingCity.status === 'pending') {
              store.updateCityQueueItem(jobId, matchingCity.id, {
                status: 'in_progress',
                started_at: new Date().toISOString(),
              });
            }
          }

          try {
            const searchQuery = `${task.category} in ${locName}, ${stateName}, ${targetCountryName}`;

            const result = await provider.searchBusinesses({
              query: searchQuery,
              category: task.category,
              latitude: loc?.latitude || globalPlace?.latitude || undefined,
              longitude: loc?.longitude || globalPlace?.longitude || undefined,
              countryCode: targetCountryCode,
            });

            if (result.status === 'rate_limited' || result.status === 'error') {
              throw new Error(result.errorMessage || `Provider ${job.provider_id} encountered ${result.status}`);
            }

            apiRequests += result.usageCount;

            let taskDiscovered = 0;
            let taskQualified = 0;
            let taskRejected = 0;
            let taskUnverified = 0;
            let taskPersisted = 0;
            let taskPersistFailed = 0;
            let taskAssociated = 0;

            // Restaurant-by-restaurant verification engine
            for (const candidate of result.restaurants) {
              const liveJob = store.getJobById(jobId);
              if (liveJob?.status === 'paused' || liveJob?.status === 'cancelled') break;

              totalFetched++;
              store.updateJob(jobId, { current_candidate: candidate.business_name || 'Candidate' });

              if (loc) {
                candidate.state = loc.state;
                candidate.district = loc.district || loc.city || loc.state;
                candidate.city = loc.city || loc.district || loc.state;
                if (loc.locality) candidate.locality = loc.locality;
              } else if (globalPlace) {
                candidate.state = globalPlace.level1Name;
                candidate.district = globalPlace.level2Name;
                candidate.city = globalPlace.name;
                candidate.country = globalPlace.countryName;
              }
              candidate.category = task.category;
              candidate.search_id = jobId;

              // Run strict 7-point audit check
              const auditResult = verifyCandidateWithAudit(candidate, configSnapshot, {
                cityName,
                districtName,
                stateName,
                country: targetCountryName,
                providerId: job.provider_id,
                providerCapabilities: provider.capabilities,
              });

              // Log candidate audit trail
              const auditRecord: CandidateAuditRecord = {
                id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                job_id: jobId,
                city_name: cityName,
                district_name: districtName,
                business_name: candidate.business_name || 'Unknown',
                candidate_name: candidate.business_name || 'Unknown',
                category: candidate.category || 'Restaurant',
                phone_number: candidate.phone_number || null,
                website_url: candidate.website_url || null,
                rating: candidate.rating ?? null,
                review_count: candidate.review_count ?? null,
                decision: auditResult.status,
                primary_reason: auditResult.primaryRejectionReason,
                rejection_reason: auditResult.primaryRejectionReason,
                checks: auditResult.auditChecks,
                restaurant_data: candidate,
                evaluated_at: new Date().toISOString(),
                processed_at: new Date().toISOString(),
              };
              store.addCandidateAudit(jobId, auditRecord);

              if (auditResult.status === 'rejected') {
                taskRejected++;
                rejectedCount++;
                let breakdownCategory = 'other';
                const lowerReason = (auditResult.primaryRejectionReason || '').toLowerCase();
                if (lowerReason.includes('outside india') || lowerReason.includes('boundary') || lowerReason.includes('geographic')) {
                  breakdownCategory = 'out_of_bounds';
                } else if (lowerReason.includes('missing or invalid required phone') || lowerReason.includes('missing or invalid phone')) {
                  breakdownCategory = 'missing_phone';
                } else if (lowerReason.includes('phone already listed')) {
                  breakdownCategory = 'has_phone';
                } else if (lowerReason.includes('rating')) {
                  breakdownCategory = 'low_rating';
                } else if (lowerReason.includes('review')) {
                  breakdownCategory = 'low_reviews';
                } else if (lowerReason.includes('stall') || lowerReason.includes('tapri') || lowerReason.includes('kiosk')) {
                  breakdownCategory = 'small_stall';
                }
                rejectionBreakdown[breakdownCategory] = (rejectionBreakdown[breakdownCategory] || 0) + 1;
                continue;
              }

              // Terminal state: qualified or unverified
              candidate.qualification_status = auditResult.status;
              candidate.qualification_reasons = auditResult.qualificationReasons;
              candidate.disqualification_reason = auditResult.primaryRejectionReason;
              candidate.audit_trail = auditResult.auditChecks;
              candidate.opportunity = analyzeRestaurantOpportunity({ restaurant: candidate });

              // Durable Database Persistence with Campaign Association
              const persistRes = await persistenceService.persistLead(candidate, jobId);
              if (persistRes.success) {
                taskPersisted++;
                totalPersisted++;
                if (persistRes.associated) {
                  taskAssociated++;
                  totalAssociated++;
                } else if (jobId) {
                  taskPersistFailed++;
                  totalPersistFailed++;
                }
                if (!persistRes.isNew) {
                  duplicateCount++;
                }
              } else {
                taskPersistFailed++;
                totalPersistFailed++;
              }

              const { restaurant, isDuplicate } = store.saveRestaurant({ ...candidate, search_id: jobId });

              const currentRun = store.getSearchRun(jobId);
              if (currentRun && !currentRun.results.some(r => r.id === restaurant.id)) {
                currentRun.results.push(restaurant);
                currentRun.totalResults = currentRun.results.length;
              }

              if (jobSeenIds.has(restaurant.id)) {
                duplicateCount++;
              } else {
                jobSeenIds.add(restaurant.id);
                discoveredSet.add(restaurant.id);
                taskDiscovered++;
                if (auditResult.status === 'qualified') {
                  qualifiedSet.add(restaurant.id);
                  taskQualified++;
                } else if (auditResult.status === 'unverified') {
                  unverifiedSet.add(restaurant.id);
                  taskUnverified++;
                }
              }
            }

            store.updateTask(task.id, {
              status: 'completed',
              records_discovered: taskDiscovered,
              completed_at: new Date().toISOString(),
            });
            await persistenceService.persistTaskSnapshot(store.getTaskById(task.id)!);

            // Update matching city queue item if exists
            if (job.city_queue && job.city_queue.length > 0) {
              const matchingCity = job.city_queue.find(
                c => c.city_name.toLowerCase().includes(cityName.toLowerCase()) ||
                     cityName.toLowerCase().includes(c.city_name.toLowerCase()) ||
                     c.id === task.location_id
              );
              if (matchingCity) {
                const allLocTasks = store.getTasksForJob(jobId).filter(
                  t => t.location_id === matchingCity.id || t.location_id === task.location_id
                );
                const allDone = allLocTasks.every(t => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled');
                const hasFailed = allLocTasks.some(t => t.status === 'failed');

                let cityStatus: 'pending' | 'in_progress' | 'completed' | 'partially_covered' = 'in_progress';
                if (allDone) {
                  cityStatus = hasFailed || matchingCity.coverage_gap_reported ? 'partially_covered' : 'completed';
                }

                store.updateCityQueueItem(jobId, matchingCity.id, {
                  status: cityStatus,
                  completed_at: allDone ? new Date().toISOString() : undefined,
                  candidates_fetched: (matchingCity.candidates_fetched || 0) + (result.restaurants?.length || 0),
                  candidates_qualified: (matchingCity.candidates_qualified || 0) + taskQualified,
                  candidates_rejected: (matchingCity.candidates_rejected || 0) + taskRejected,
                  candidates_unverified: (matchingCity.candidates_unverified || 0) + taskUnverified,
                  candidates_persisted: (matchingCity.candidates_persisted || 0) + taskPersisted,
                  tasks_completed: (matchingCity.tasks_completed || 0) + 1,
                  provider_succeeded: true,
                });
              }
            }
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            store.updateTask(task.id, {
              status: 'failed',
              last_error: errMsg,
              retry_count: task.retry_count + 1,
            });

            if (job.city_queue && job.city_queue.length > 0) {
              const matchingCity = job.city_queue.find(
                c => c.city_name.toLowerCase().includes(cityName.toLowerCase()) ||
                     cityName.toLowerCase().includes(c.city_name.toLowerCase()) ||
                     c.id === task.location_id
              );
              if (matchingCity) {
                store.updateCityQueueItem(jobId, matchingCity.id, {
                  status: 'partially_covered',
                  last_error: errMsg,
                  tasks_failed: (matchingCity.tasks_failed || 0) + 1,
                  provider_succeeded: false,
                });
              }
            }
          }

          // Update live progress on Job after every task batch
          this.syncJobProgress(jobId, {
            discoveredCount: discoveredSet.size,
            qualifiedCount: qualifiedSet.size,
            unverifiedCount: unverifiedSet.size,
            duplicateCount,
            totalFetched,
            rejectedCount,
            rejectionBreakdown,
            apiRequests,
            persistedCount: totalPersisted,
            persistenceFailedCount: totalPersistFailed,
            associatedCount: totalAssociated,
            providerId: job.provider_id,
          });

          // Polite backoff delay between batches
          const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
          const jitterMs = Math.floor(Math.random() * 300);
          const delay = isTestEnv ? 2 : 1200 + jitterMs;
          await new Promise(r => setTimeout(r, delay));
        }
      } else if (job.city_queue && job.city_queue.length > 0) {
        // Pure District-First Sequential City Queue execution
        const categories = configSnapshot?.categories?.length ? configSnapshot.categories : ['Restaurant'];

        for (const city of job.city_queue) {
          const currentJob = store.getJobById(jobId);
          if (!currentJob || currentJob.status === 'paused' || currentJob.status === 'cancelled') {
            break;
          }

          if (city.status === 'completed') {
            continue;
          }

          store.updateCityQueueItem(jobId, city.id, {
            status: 'in_progress',
            started_at: new Date().toISOString(),
          });
          store.updateJob(jobId, { current_city: `${city.city_name}, ${city.district_name}` });

          let cityFetched = 0;
          let cityQualified = 0;
          let cityRejected = 0;
          let cityUnverified = 0;

          const cells = city.search_cells && city.search_cells.length > 0
            ? city.search_cells
            : [{ name: city.city_name, lat: undefined as unknown as number, lng: undefined as unknown as number }];

          const cityCandidates: Partial<Restaurant>[] = [];

          try {
            for (const rawCell of cells) {
              const liveJob = store.getJobById(jobId);
              if (liveJob?.status === 'paused' || liveJob?.status === 'cancelled') break;

              const cellName = typeof rawCell === 'string' ? rawCell : rawCell.name;
              const cellLat = typeof rawCell === 'object' ? rawCell.lat : undefined;
              const cellLng = typeof rawCell === 'object' ? rawCell.lng : undefined;

              const targetCountryCode = (job.selected_country || configSnapshot?.selected_country || 'IN').toUpperCase();
              const targetCountryName = getCountryByCode(targetCountryCode)?.name || 'India';
              for (const cat of categories) {
                const searchQuery = `${cat} in ${cellName}, ${city.city_name}, ${city.district_name}, ${city.state_name}, ${targetCountryName}`;
                const searchRes = await provider.searchBusinesses({
                  query: searchQuery,
                  category: cat,
                  latitude: cellLat,
                  longitude: cellLng,
                  countryCode: targetCountryCode,
                });

                if (searchRes.status === 'rate_limited' || searchRes.status === 'error') {
                  throw new Error(searchRes.errorMessage || `Provider ${job.provider_id} encountered ${searchRes.status}`);
                }

                apiRequests += searchRes.usageCount;

                for (const b of searchRes.restaurants) {
                  b.category = b.category || cat;
                  b.city = city.city_name;
                  b.district = city.district_name;
                  b.state = city.state_name;
                  b.country = targetCountryName;
                  cityCandidates.push(b);
                }
              }
            }

            // Deduplicate newly discovered records across the city
            const uniqueCityCandidates: Partial<Restaurant>[] = [];
            const seenKeys = new Set<string>();

            for (const cand of cityCandidates) {
              const key = `${(cand.business_name || '').toLowerCase()}|${cand.latitude ?? ''}|${cand.longitude ?? ''}|${cand.phone_number || ''}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueCityCandidates.push(cand);
              }
            }

            // Restaurant-by-restaurant verification engine
            for (const candidate of uniqueCityCandidates) {
              const liveJob = store.getJobById(jobId);
              if (liveJob?.status === 'paused' || liveJob?.status === 'cancelled') break;

              totalFetched++;
              cityFetched++;
              store.updateJob(jobId, { current_candidate: candidate.business_name || 'Candidate' });

              candidate.search_id = jobId;
              candidate.city_id = city.id;

              const targetCountryName = getCountryByCode(job.selected_country || 'IN')?.name || 'India';
              const auditResult = verifyCandidateWithAudit(candidate, configSnapshot, {
                cityName: city.city_name,
                districtName: city.district_name,
                stateName: city.state_name,
                country: targetCountryName,
                providerId: job.provider_id,
                providerCapabilities: provider.capabilities,
              });

              const auditRecord: CandidateAuditRecord = {
                id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                job_id: jobId,
                city_name: city.city_name,
                district_name: city.district_name,
                business_name: candidate.business_name || 'Unknown',
                candidate_name: candidate.business_name || 'Unknown',
                category: candidate.category || 'Restaurant',
                phone_number: candidate.phone_number || null,
                website_url: candidate.website_url || null,
                rating: candidate.rating ?? null,
                review_count: candidate.review_count ?? null,
                decision: auditResult.status,
                primary_reason: auditResult.primaryRejectionReason,
                rejection_reason: auditResult.primaryRejectionReason,
                checks: auditResult.auditChecks,
                restaurant_data: candidate,
                evaluated_at: new Date().toISOString(),
                processed_at: new Date().toISOString(),
              };
              store.addCandidateAudit(jobId, auditRecord);

              if (auditResult.status === 'rejected') {
                cityRejected++;
                rejectedCount++;
                let breakdownCategory = 'other';
                const lowerReason = (auditResult.primaryRejectionReason || '').toLowerCase();
                if (lowerReason.includes('outside india') || lowerReason.includes('boundary') || lowerReason.includes('geographic')) {
                  breakdownCategory = 'out_of_bounds';
                } else if (lowerReason.includes('missing or invalid required phone') || lowerReason.includes('missing or invalid phone')) {
                  breakdownCategory = 'missing_phone';
                } else if (lowerReason.includes('phone already listed')) {
                  breakdownCategory = 'has_phone';
                } else if (lowerReason.includes('rating')) {
                  breakdownCategory = 'low_rating';
                } else if (lowerReason.includes('review')) {
                  breakdownCategory = 'low_reviews';
                } else if (lowerReason.includes('stall') || lowerReason.includes('tapri') || lowerReason.includes('kiosk')) {
                  breakdownCategory = 'small_stall';
                }
                rejectionBreakdown[breakdownCategory] = (rejectionBreakdown[breakdownCategory] || 0) + 1;
                continue;
              }

              candidate.qualification_status = auditResult.status;
              candidate.qualification_reasons = auditResult.qualificationReasons;
              candidate.disqualification_reason = auditResult.primaryRejectionReason;
              candidate.audit_trail = auditResult.auditChecks;
              candidate.opportunity = analyzeRestaurantOpportunity({ restaurant: candidate });

              // Durable Database Persistence with Campaign Association
              const persistRes = await persistenceService.persistLead(candidate, jobId);
              if (persistRes.success) {
                totalPersisted++;
                if (persistRes.associated) {
                  totalAssociated++;
                } else if (jobId) {
                  totalPersistFailed++;
                }
                if (!persistRes.isNew) {
                  duplicateCount++;
                }
              } else {
                totalPersistFailed++;
              }

              const { restaurant, isDuplicate } = store.saveRestaurant({ ...candidate, search_id: jobId });

              const currentRun = store.getSearchRun(jobId);
              if (currentRun && !currentRun.results.some(r => r.id === restaurant.id)) {
                currentRun.results.push(restaurant);
                currentRun.totalResults = currentRun.results.length;
              }

              if (jobSeenIds.has(restaurant.id)) {
                duplicateCount++;
              } else {
                jobSeenIds.add(restaurant.id);
                discoveredSet.add(restaurant.id);
                if (auditResult.status === 'qualified') {
                  qualifiedSet.add(restaurant.id);
                  cityQualified++;
                } else if (auditResult.status === 'unverified') {
                  unverifiedSet.add(restaurant.id);
                  cityUnverified++;
                }
              }
            }

            store.updateCityQueueItem(jobId, city.id, {
              status: city.coverage_gap_reported ? 'partially_covered' : 'completed',
              completed_at: new Date().toISOString(),
              candidates_fetched: cityFetched,
              candidates_qualified: cityQualified,
              candidates_rejected: cityRejected,
              candidates_unverified: cityUnverified,
            });
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            store.updateCityQueueItem(jobId, city.id, {
              status: 'failed',
              error: errMsg,
            });
          }

          this.syncJobProgress(jobId, {
            discoveredCount: discoveredSet.size,
            qualifiedCount: qualifiedSet.size,
            unverifiedCount: unverifiedSet.size,
            duplicateCount,
            totalFetched,
            rejectedCount,
            rejectionBreakdown,
            apiRequests,
            persistedCount: totalPersisted,
            persistenceFailedCount: totalPersistFailed,
            associatedCount: totalAssociated,
            providerId: job.provider_id,
          });

          // Polite pause between cities
          const delay = process.env.NODE_ENV === 'test' ? 5 : 1200;
          await new Promise(r => setTimeout(r, delay));
        }
      }

      // Finalize job
      const finalJob = store.getJobById(jobId);
      if (finalJob && finalJob.status === 'running') {
        const allTasks = store.getTasksForJob(jobId);
        const hasFailedTask = allTasks.some(t => t.status === 'failed');
        const hasFailedCity = finalJob.city_queue?.some(c => c.status === 'failed');
        const hasPersistenceFailures = (finalJob.progress_counters?.persistence_failed_count || 0) > 0;

        store.updateJob(jobId, {
          status: hasFailedTask || hasFailedCity || hasPersistenceFailures ? 'completed_with_warnings' : 'completed',
          current_candidate: null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        store.updateSearchRun(jobId, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
        await persistenceService.persistJobSnapshot(store.getJobById(jobId)!);
      }
    } finally {
      this.activeJobLocks.delete(jobId);
    }
  }

  /**
   * Helper to recalculate coverage summary and update job progress counters
   */
  private static syncJobProgress(
    jobId: string,
    stats: {
      discoveredCount: number;
      qualifiedCount: number;
      unverifiedCount: number;
      duplicateCount: number;
      totalFetched: number;
      rejectedCount: number;
      rejectionBreakdown: Record<string, number>;
      apiRequests: number;
      persistedCount?: number;
      persistenceFailedCount?: number;
      associatedCount?: number;
      providerId: string;
    }
  ) {
    const job = store.getJobById(jobId);
    if (!job) return;

    const allTasks = store.getTasksForJob(jobId);
    const activeTasks = allTasks.filter(t => t.status !== 'cancelled');
    const completedTasks = activeTasks.filter(t => t.status === 'completed').length;
    const failedTasks = activeTasks.filter(t => t.status === 'failed').length;

    const cityQueue = store.getJobCityQueue(jobId);
    let coverageSummary: DistrictCoverageSummary | undefined = job.coverage_summary;

    if (cityQueue.length > 0) {
      // Exclude any quarantined foreign items from the district coverage summary
      const activeCities = cityQueue.filter(c => !c.last_error?.includes('Geographic isolation mismatch'));
      const completedCities = activeCities.filter(c => c.status === 'completed').length;
      const partiallyCovered = activeCities.filter(c => c.status === 'partially_covered').length;
      const failedCities = activeCities.filter(c => c.status === 'failed').length;
      const pendingCities = activeCities.filter(c => c.status === 'pending').length;
      const inProgressCities = activeCities.filter(c => c.status === 'in_progress').length;
      const doneCities = completedCities + partiallyCovered;
      const totalCities = activeCities.length;
      const coveragePct = totalCities > 0 ? Math.round((doneCities / totalCities) * 100) : 0;

      coverageSummary = {
        district: job.selected_district?.district || 'District',
        state: job.selected_district?.state || 'State',
        total_cities: totalCities,
        completed_cities: completedCities,
        partially_covered_cities: partiallyCovered,
        pending_cities: pendingCities,
        failed_cities: failedCities,
        gaps_reported_cities: activeCities.filter(c => c.coverage_gap_reported).length,
        coverage_percentage: coveragePct,
        coverage_status: pendingCities === 0 && inProgressCities === 0 ? 'completed' : 'in_progress',
      };
    }

    const diagnosticSummary =
      stats.discoveredCount > 0
        ? `Harvested ${stats.discoveredCount} businesses (${stats.qualifiedCount} qualified, ${stats.unverifiedCount} unverified) across ${completedTasks} tasks.`
        : failedTasks > 0
        ? `Encountered provider errors or rate limits on ${failedTasks} tasks. Retrying with backoff.`
        : `Verified search completed. 0 food or hospitality businesses mapped in source for scanned locations.`;

    store.updateJob(jobId, {
      diagnostic_summary: diagnosticSummary,
      coverage_summary: coverageSummary,
      progress_counters: {
        total_tasks: activeTasks.length || (cityQueue.length ? cityQueue.length : 1),
        completed_tasks: activeTasks.length ? completedTasks : (coverageSummary?.completed_cities || 0),
        failed_tasks: activeTasks.length ? failedTasks : (coverageSummary?.failed_cities || 0),
        fetched_count: stats.totalFetched,
        discovered_count: stats.discoveredCount,
        qualified_count: stats.qualifiedCount,
        unverified_count: stats.unverifiedCount,
        rejected_count: stats.rejectedCount,
        rejection_breakdown: stats.rejectionBreakdown,
        duplicate_count: stats.duplicateCount,
        persisted_count: stats.persistedCount || 0,
        persistence_failed_count: stats.persistenceFailedCount || 0,
        associated_count: stats.associatedCount || 0,
      },
      usage_counters: {
        api_requests: stats.apiRequests,
        estimated_cost_inr: stats.providerId === 'google_places' ? stats.apiRequests * 2.5 : 0,
      },
      updated_at: new Date().toISOString(),
    });

    persistenceService.persistJobSnapshot(store.getJobById(jobId)!);
  }

  static pauseJob(jobId: string) {
    store.updateJob(jobId, { status: 'paused' });
    const j = store.getJobById(jobId);
    if (j) persistenceService.persistJobSnapshot(j);
  }

  static resumeJob(jobId: string) {
    const job = store.getJobById(jobId);
    if (job && (job.status === 'paused' || job.status === 'queued')) {
      store.updateJob(jobId, { status: 'running' });
      const updated = store.getJobById(jobId);
      if (updated) persistenceService.persistJobSnapshot(updated);
      // Asynchronously resume pending tasks
      this.runJob(jobId);
    }
  }

  static cancelJob(jobId: string) {
    store.updateJob(jobId, { status: 'cancelled', completed_at: new Date().toISOString() });
    const j = store.getJobById(jobId);
    if (j) persistenceService.persistJobSnapshot(j);
    const tasks = store.getTasksForJob(jobId).filter(t => t.status === 'queued' || t.status === 'running');
    for (const t of tasks) {
      store.updateTask(t.id, { status: 'cancelled' });
      persistenceService.persistTaskSnapshot(store.getTaskById(t.id)!);
    }
  }

  /**
   * Scans for any jobs stuck in 'queued' status and processes them.
   * Ensures resilience against serverless restarts or worker lifecycle interruptions.
   */
  static processQueuedJobs(): void {
    const allJobs = store.getAllJobs();
    for (const job of allJobs) {
      if (job.status === 'queued' && !this.activeJobLocks.has(job.id)) {
        this.runJob(job.id);
      }
    }
  }
}
