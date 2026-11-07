-- ==============================================================================
-- RESTAURANT LEAD FINDER: INTERNATIONAL GEOGRAPHIC COVERAGE & QUEUE INDEXES
-- Migration: 20261022000001_international_geographic_coverage.sql
-- ==============================================================================

-- 1. Index geographic locations by country code and administrative hierarchy for fast lookup
CREATE INDEX IF NOT EXISTS idx_geo_country_code ON geographic_locations(country_code);
CREATE INDEX IF NOT EXISTS idx_geo_country_state_district ON geographic_locations(country_code, state, district);
CREATE INDEX IF NOT EXISTS idx_geo_country_city ON geographic_locations(country_code, city);

-- 2. Index scan tasks for efficient batch claiming, queue progress, and resumption
CREATE INDEX IF NOT EXISTS idx_scan_tasks_job_status ON scan_tasks(job_id, status);
CREATE INDEX IF NOT EXISTS idx_scan_tasks_location_id ON scan_tasks(location_id);

-- 3. Index canonical restaurants for multi-country discovery and deduplication
CREATE INDEX IF NOT EXISTS idx_restaurants_country_state_city ON restaurants(country, state, city);
CREATE INDEX IF NOT EXISTS idx_restaurants_country_code ON restaurants(country);

-- 4. Enable RLS and public policies for geographic_locations
ALTER TABLE geographic_locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'geographic_locations' AND policyname = 'Public read geographic_locations') THEN
    CREATE POLICY "Public read geographic_locations" ON geographic_locations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'geographic_locations' AND policyname = 'Public insert geographic_locations') THEN
    CREATE POLICY "Public insert geographic_locations" ON geographic_locations FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'geographic_locations' AND policyname = 'Public update geographic_locations') THEN
    CREATE POLICY "Public update geographic_locations" ON geographic_locations FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
