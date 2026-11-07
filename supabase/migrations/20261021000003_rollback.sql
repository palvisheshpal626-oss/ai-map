-- ==============================================================================
-- RESTAURANT LEAD FINDER: ROLLBACK SCRIPT FOR LEAST-PRIVILEGE RLS POLICIES
-- Migration: 20261021000003_rollback.sql
-- ==============================================================================
-- Purpose:
-- Emergency rollback to re-establish anon write access in the event that
-- privileged credentials fail or are invalidated.
-- ==============================================================================

-- 1. Re-enable Catalog Writes for Anon / Public
CREATE POLICY "Public insert restaurants" ON restaurants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update restaurants" ON restaurants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete restaurants" ON restaurants FOR DELETE USING (true);

CREATE POLICY "Public insert restaurant_sources" ON restaurant_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update restaurant_sources" ON restaurant_sources FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete restaurant_sources" ON restaurant_sources FOR DELETE USING (true);

CREATE POLICY "Public insert scan_jobs" ON scan_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update scan_jobs" ON scan_jobs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete scan_jobs" ON scan_jobs FOR DELETE USING (true);

CREATE POLICY "Public insert scan_tasks" ON scan_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update scan_tasks" ON scan_tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete scan_tasks" ON scan_tasks FOR DELETE USING (true);

CREATE POLICY "Public insert scan_job_restaurants" ON scan_job_restaurants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update scan_job_restaurants" ON scan_job_restaurants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete scan_job_restaurants" ON scan_job_restaurants FOR DELETE USING (true);
