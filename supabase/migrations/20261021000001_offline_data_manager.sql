-- ==============================================================================
-- RESTAURANT LEAD FINDER: OFFLINE DATA MANAGER SCHEMA (SUPABASE)
-- Migration: 20261021000001_offline_data_manager.sql
-- ==============================================================================

-- 1. Offline Areas Table
-- Tracks bounded geographical extracts acquired from OpenStreetMap for offline search
CREATE TABLE IF NOT EXISTS offline_areas (
  id TEXT PRIMARY KEY, -- e.g. 'area-up-lucknow-central'
  city_name TEXT NOT NULL,
  district_name TEXT NOT NULL,
  state_name TEXT NOT NULL DEFAULT 'Uttar Pradesh',
  bounding_box JSONB NOT NULL DEFAULT '{"south": 0, "west": 0, "north": 0, "east": 0}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ready', -- 'pending', 'downloading', 'ready', 'failed', 'refreshing'
  bytes_downloaded BIGINT NOT NULL DEFAULT 0,
  records_count INTEGER NOT NULL DEFAULT 0,
  checksum TEXT, -- SHA-256 hash of raw payload
  attribution TEXT NOT NULL DEFAULT '© OpenStreetMap contributors, ODbL 1.0',
  last_downloaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_offline_areas_city ON offline_areas(city_name, district_name);
CREATE INDEX IF NOT EXISTS idx_offline_areas_status ON offline_areas(status);

-- 2. Raw Imported Source Records Table
-- Strictly separates unverified raw imported POIs from qualified leads and normalized businesses
CREATE TABLE IF NOT EXISTS raw_imported_records (
  id TEXT PRIMARY KEY, -- e.g. 'raw-osm-node-12345678'
  area_id TEXT REFERENCES offline_areas(id) ON DELETE CASCADE,
  osm_type TEXT NOT NULL, -- 'node', 'way', 'relation'
  osm_id BIGINT NOT NULL,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  website TEXT,
  tags JSONB DEFAULT '{}'::jsonb,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  quarantine_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'quarantined'
  imported_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_imported_area_id ON raw_imported_records(area_id);
CREATE INDEX IF NOT EXISTS idx_raw_imported_coords ON raw_imported_records(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_raw_imported_name ON raw_imported_records(business_name);
CREATE INDEX IF NOT EXISTS idx_raw_imported_category ON raw_imported_records(category);
CREATE INDEX IF NOT EXISTS idx_raw_imported_quarantine ON raw_imported_records(quarantine_status);

-- Register 'offline_local' data provider in data_providers table if exists
INSERT INTO data_providers (id, name, provider_type, configuration_status, supported_capabilities, enabled, metadata)
VALUES (
  'offline_local',
  'Offline Local Database (OpenStreetMap Extracts)',
  'open_data',
  'configured',
  '{"supportsRatings": false, "supportsReviewCounts": false, "supportsPhoneNumbers": true, "supportsWebsites": true, "supportsPagination": false, "supportsRealTimeStatus": true, "requiresCommercialKey": false, "maxResultsPerQuery": 500, "termsNotes": "Local indexed storage. Open Database License (ODbL 1.0). Zero API calls, instant execution."}'::jsonb,
  true,
  '{"offline": true, "local_cache": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  configuration_status = EXCLUDED.configuration_status,
  supported_capabilities = EXCLUDED.supported_capabilities;
