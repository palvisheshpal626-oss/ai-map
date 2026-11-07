-- ==============================================================================
-- RESTAURANT LEAD FINDER: MINIMAL CORRECTIVE LEAST-PRIVILEGE RLS POLICIES
-- Migration: 20261021000003_secure_least_privilege_rls.sql
-- ==============================================================================
-- SAFETY PREREQUISITE:
-- DO NOT EXECUTE THIS MIGRATION UNTIL A GENUINE PRIVILEGED CREDENTIAL
-- (Supabase service_role JWT or sb_secret_... key) IS CONFIGURED IN
-- SUPABASE_SERVICE_ROLE_KEY OR SUPABASE_SECRET_KEY ON THE APPLICATION SERVER.
--
-- Why:
-- Supabase enforces Row Level Security based on the role in the request JWT.
-- If the server connects with an 'anon' key and write policies are revoked,
-- server-side background workers and persistence services will receive 403 Forbidden.
-- Once the true service_role key is configured, Supabase server operations
-- bypass RLS automatically, allowing safe revocation of anon writes.
-- ==============================================================================

-- 1. Remove over-privileged anon DELETE policies (both naming variants)
DROP POLICY IF EXISTS "Allow anon delete from restaurants" ON restaurants;
DROP POLICY IF EXISTS "Public delete restaurants" ON restaurants;

DROP POLICY IF EXISTS "Allow anon delete from restaurant_sources" ON restaurant_sources;
DROP POLICY IF EXISTS "Public delete restaurant_sources" ON restaurant_sources;

DROP POLICY IF EXISTS "Allow anon delete from scan_jobs" ON scan_jobs;
DROP POLICY IF EXISTS "Public delete scan_jobs" ON scan_jobs;

DROP POLICY IF EXISTS "Allow anon delete from scan_tasks" ON scan_tasks;
DROP POLICY IF EXISTS "Public delete scan_tasks" ON scan_tasks;

DROP POLICY IF EXISTS "Allow anon delete from scan_job_restaurants" ON scan_job_restaurants;
DROP POLICY IF EXISTS "Public delete scan_job_restaurants" ON scan_job_restaurants;

-- 2. Remove over-privileged anon/public INSERT and UPDATE policies from catalog tables
DROP POLICY IF EXISTS "Public insert restaurants" ON restaurants;
DROP POLICY IF EXISTS "Public update restaurants" ON restaurants;

DROP POLICY IF EXISTS "Public insert restaurant_sources" ON restaurant_sources;
DROP POLICY IF EXISTS "Public update restaurant_sources" ON restaurant_sources;

DROP POLICY IF EXISTS "Public insert scan_jobs" ON scan_jobs;
DROP POLICY IF EXISTS "Public update scan_jobs" ON scan_jobs;

DROP POLICY IF EXISTS "Public insert scan_tasks" ON scan_tasks;
DROP POLICY IF EXISTS "Public update scan_tasks" ON scan_tasks;

DROP POLICY IF EXISTS "Public insert scan_job_restaurants" ON scan_job_restaurants;
DROP POLICY IF EXISTS "Public update scan_job_restaurants" ON scan_job_restaurants;

-- 3. Secure data_providers: disable mock_dynamic provider for production safety
UPDATE data_providers 
SET enabled = false, configuration_status = 'test_only' 
WHERE id = 'mock_dynamic';

UPDATE data_providers 
SET enabled = true, configuration_status = 'configured' 
WHERE id IN ('osm_overpass', 'offline_local');

UPDATE data_providers 
SET enabled = false, configuration_status = 'unconfigured' 
WHERE id = 'google_places';
