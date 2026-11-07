-- ==============================================================================
-- RESTAURANT LEAD FINDER: DURABLE PERSISTENCE & CAMPAIGN ASSOCIATION SCHEMA
-- Migration: 20261021000002_durable_persistence.sql
-- ==============================================================================

-- 1. Campaign-to-Restaurant Association Table
CREATE TABLE IF NOT EXISTS scan_job_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES scan_jobs(id) ON DELETE CASCADE NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  qualification_status TEXT NOT NULL DEFAULT 'qualified',
  discovered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_scan_job_restaurant UNIQUE (job_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_scan_job_restaurants_job ON scan_job_restaurants(job_id);
CREATE INDEX IF NOT EXISTS idx_scan_job_restaurants_rest ON scan_job_restaurants(restaurant_id);

-- 2. Unique Constraint on Canonical Restaurants for Provider Records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_restaurants_provider_record'
  ) THEN
    ALTER TABLE restaurants ADD CONSTRAINT uq_restaurants_provider_record UNIQUE (source_provider, source_record_id);
  END IF;
END $$;

-- 3. Enable RLS on scan_job_restaurants
ALTER TABLE scan_job_restaurants ENABLE ROW LEVEL SECURITY;

-- 4. Add Missing RLS Policies for Anon / Authenticated / Service execution
-- Restaurants
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Public insert restaurants') THEN
    CREATE POLICY "Public insert restaurants" ON restaurants FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Public update restaurants') THEN
    CREATE POLICY "Public update restaurants" ON restaurants FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Restaurant Sources
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_sources' AND policyname = 'Public insert restaurant_sources') THEN
    CREATE POLICY "Public insert restaurant_sources" ON restaurant_sources FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_sources' AND policyname = 'Public update restaurant_sources') THEN
    CREATE POLICY "Public update restaurant_sources" ON restaurant_sources FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Scan Jobs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_jobs' AND policyname = 'Public read scan_jobs') THEN
    CREATE POLICY "Public read scan_jobs" ON scan_jobs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_jobs' AND policyname = 'Public insert scan_jobs') THEN
    CREATE POLICY "Public insert scan_jobs" ON scan_jobs FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_jobs' AND policyname = 'Public update scan_jobs') THEN
    CREATE POLICY "Public update scan_jobs" ON scan_jobs FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Scan Tasks
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_tasks' AND policyname = 'Public read scan_tasks') THEN
    CREATE POLICY "Public read scan_tasks" ON scan_tasks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_tasks' AND policyname = 'Public insert scan_tasks') THEN
    CREATE POLICY "Public insert scan_tasks" ON scan_tasks FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_tasks' AND policyname = 'Public update scan_tasks') THEN
    CREATE POLICY "Public update scan_tasks" ON scan_tasks FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Scan Job Restaurants
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_job_restaurants' AND policyname = 'Public read scan_job_restaurants') THEN
    CREATE POLICY "Public read scan_job_restaurants" ON scan_job_restaurants FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_job_restaurants' AND policyname = 'Public insert scan_job_restaurants') THEN
    CREATE POLICY "Public insert scan_job_restaurants" ON scan_job_restaurants FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_job_restaurants' AND policyname = 'Public update scan_job_restaurants') THEN
    CREATE POLICY "Public update scan_job_restaurants" ON scan_job_restaurants FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Lead Lists & Items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_lists' AND policyname = 'Public read lead_lists') THEN
    CREATE POLICY "Public read lead_lists" ON lead_lists FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_lists' AND policyname = 'Public insert lead_lists') THEN
    CREATE POLICY "Public insert lead_lists" ON lead_lists FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_lists' AND policyname = 'Public update lead_lists') THEN
    CREATE POLICY "Public update lead_lists" ON lead_lists FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_list_items' AND policyname = 'Public read lead_list_items') THEN
    CREATE POLICY "Public read lead_list_items" ON lead_list_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_list_items' AND policyname = 'Public insert lead_list_items') THEN
    CREATE POLICY "Public insert lead_list_items" ON lead_list_items FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_list_items' AND policyname = 'Public update lead_list_items') THEN
    CREATE POLICY "Public update lead_list_items" ON lead_list_items FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Delete Policies for Test Isolation and Record Management
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Public delete restaurants') THEN
    CREATE POLICY "Public delete restaurants" ON restaurants FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_sources' AND policyname = 'Public delete restaurant_sources') THEN
    CREATE POLICY "Public delete restaurant_sources" ON restaurant_sources FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_jobs' AND policyname = 'Public delete scan_jobs') THEN
    CREATE POLICY "Public delete scan_jobs" ON scan_jobs FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_tasks' AND policyname = 'Public delete scan_tasks') THEN
    CREATE POLICY "Public delete scan_tasks" ON scan_tasks FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scan_job_restaurants' AND policyname = 'Public delete scan_job_restaurants') THEN
    CREATE POLICY "Public delete scan_job_restaurants" ON scan_job_restaurants FOR DELETE USING (true);
  END IF;
END $$;
