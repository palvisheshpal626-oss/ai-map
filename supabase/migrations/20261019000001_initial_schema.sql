-- ==============================================================================
-- RESTAURANT LEAD FINDER: PRODUCTION POSTGRESQL SCHEMA (SUPABASE)
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferences JSONB DEFAULT '{"theme": "dark", "default_district": "Lucknow"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Data Providers
CREATE TABLE IF NOT EXISTS data_providers (
  id TEXT PRIMARY KEY, -- e.g. 'google_places', 'osm_overpass'
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- 'commercial_api', 'open_data', 'curated'
  configuration_status TEXT NOT NULL DEFAULT 'unconfigured', -- 'configured', 'unconfigured', 'invalid_credentials'
  supported_capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Geographic Locations (Hierarchy: India -> State -> District -> City/Town -> Locality)
CREATE TABLE IF NOT EXISTS geographic_locations (
  id TEXT PRIMARY KEY, -- e.g. 'in-up-lucknow-hazratganj'
  parent_id TEXT REFERENCES geographic_locations(id) ON DELETE SET NULL,
  country_code TEXT NOT NULL DEFAULT 'IN',
  state TEXT NOT NULL DEFAULT 'Uttar Pradesh',
  district TEXT NOT NULL,
  city TEXT,
  locality TEXT,
  geographic_type TEXT NOT NULL, -- 'state', 'district', 'city', 'locality'
  source_identifier TEXT,
  supported_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'unsupported', 'pending_data'
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_geo_state_district ON geographic_locations(state, district);
CREATE INDEX IF NOT EXISTS idx_geo_parent ON geographic_locations(parent_id);

-- 4. Search Configurations
CREATE TABLE IF NOT EXISTS search_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selected_locations JSONB NOT NULL, -- array of location IDs or objects
  categories JSONB NOT NULL, -- array of categories
  rating_filters JSONB NOT NULL DEFAULT '{"min": 1.0, "max": 5.0, "include_unrated": true}'::jsonb,
  review_filters JSONB NOT NULL DEFAULT '{"min": 0, "max": null, "include_zero": true}'::jsonb,
  contact_filters JSONB NOT NULL DEFAULT '{"phone": "any", "website_filter": "any"}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{"max_records_per_location": 60, "max_total_records": 500}'::jsonb,
  provider_id TEXT REFERENCES data_providers(id) DEFAULT 'google_places',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Scan Jobs
CREATE TABLE IF NOT EXISTS scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  configuration_snapshot JSONB NOT NULL,
  provider_id TEXT REFERENCES data_providers(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'queued', 'running', 'paused', 'completed', 'completed_with_warnings', 'failed', 'cancelled'
  progress_counters JSONB NOT NULL DEFAULT '{"total_tasks": 0, "completed_tasks": 0, "failed_tasks": 0, "discovered_count": 0, "qualified_count": 0, "duplicate_count": 0}'::jsonb,
  usage_counters JSONB NOT NULL DEFAULT '{"api_requests": 0, "estimated_cost_inr": 0.0}'::jsonb,
  error_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_owner ON scan_jobs(owner_id);

-- 6. Scan Tasks (Per location & category unit of work)
CREATE TABLE IF NOT EXISTS scan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES scan_jobs(id) ON DELETE CASCADE NOT NULL,
  location_id TEXT REFERENCES geographic_locations(id) NOT NULL,
  category TEXT NOT NULL,
  task_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'cancelled'
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  pagination_state JSONB DEFAULT '{}'::jsonb,
  records_discovered INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  attempted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scan_tasks_job_status ON scan_tasks(job_id, status);

-- 7. Canonical Restaurants Table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT NOT NULL,
  street_address TEXT,
  formatted_address TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Uttar Pradesh',
  district TEXT NOT NULL,
  city TEXT,
  locality TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone_number TEXT,
  normalized_phone TEXT,
  website_url TEXT,
  website_status TEXT NOT NULL DEFAULT 'WEBSITE_NOT_LISTED', 
  -- Allowed statuses:
  -- 'WEBSITE_LISTED', 'WEBSITE_REACHABLE', 'WEBSITE_UNREACHABLE',
  -- 'WEBSITE_NOT_LISTED', 'VERIFIED_NO_OFFICIAL_WEBSITE',
  -- 'VERIFICATION_PENDING', 'VERIFICATION_FAILED', 'VERIFICATION_NOT_PERMITTED'
  rating NUMERIC(2,1),
  review_count INTEGER DEFAULT 0,
  business_status TEXT DEFAULT 'OPERATIONAL',
  maps_url TEXT,
  data_completeness_score INTEGER DEFAULT 0, -- 0 to 100
  lead_score INTEGER DEFAULT 0, -- 0 to 100 explainable score
  lead_score_breakdown JSONB DEFAULT '{}'::jsonb,
  first_discovered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_checked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_restaurants_district ON restaurants(district);
CREATE INDEX IF NOT EXISTS idx_restaurants_website_status ON restaurants(website_status);
CREATE INDEX IF NOT EXISTS idx_restaurants_lead_score ON restaurants(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_phone ON restaurants(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_restaurants_norm_name ON restaurants(normalized_name);

-- 8. Restaurant Provenance & Sources
CREATE TABLE IF NOT EXISTS restaurant_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  provider_id TEXT REFERENCES data_providers(id) NOT NULL,
  external_business_identifier TEXT NOT NULL, -- e.g. Google Place ID
  raw_metadata JSONB DEFAULT '{}'::jsonb,
  discovered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_res_source UNIQUE (provider_id, external_business_identifier)
);

CREATE INDEX IF NOT EXISTS idx_res_sources_rest_id ON restaurant_sources(restaurant_id);

-- 9. Website Verification Checks
CREATE TABLE IF NOT EXISTS website_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  verification_method TEXT NOT NULL, -- 'http_probe', 'domain_search', 'manual_verification'
  target_url TEXT,
  status TEXT NOT NULL, -- e.g. 'reachable', 'domain_absent', 'dns_nxdomain', 'ssrf_blocked'
  http_status_code INTEGER,
  evidence_metadata JSONB DEFAULT '{}'::jsonb,
  confidence TEXT NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
  checked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_website_checks_res_id ON website_checks(restaurant_id);

-- 10. Saved Lead Lists
CREATE TABLE IF NOT EXISTS lead_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Lead List Items
CREATE TABLE IF NOT EXISTS lead_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES lead_lists(id) ON DELETE CASCADE NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  added_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_list_restaurant UNIQUE (list_id, restaurant_id)
);

-- 12. Lead Notes and Status Tracking
CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  lead_status TEXT NOT NULL DEFAULT 'new',
  -- 'new', 'unreviewed', 'verification_required', 'qualified', 'contacted',
  -- 'interested', 'follow_up_required', 'not_interested', 'disqualified', 'converted'
  note TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_res ON lead_notes(restaurant_id);

-- 13. Exports
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT NOT NULL, -- 'csv', 'xlsx'
  row_count INTEGER NOT NULL DEFAULT 0,
  applied_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '7 days')
);

-- 14. Usage Events & Cost Accounting
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT REFERENCES data_providers(id) NOT NULL,
  job_id UUID REFERENCES scan_jobs(id) ON DELETE SET NULL,
  operation TEXT NOT NULL, -- 'places_text_search', 'place_details', 'http_probe'
  request_count INTEGER NOT NULL DEFAULT 1,
  estimated_cost_inr NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  currency TEXT NOT NULL DEFAULT 'INR',
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_events_provider ON usage_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_timestamp ON usage_events(timestamp);

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  safe_metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Default open policies for authenticated or local development access
CREATE POLICY "Public read data_providers" ON data_providers FOR SELECT USING (true);
CREATE POLICY "Public read geographic_locations" ON geographic_locations FOR SELECT USING (true);
CREATE POLICY "Public read restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Public read restaurant_sources" ON restaurant_sources FOR SELECT USING (true);
CREATE POLICY "Public read website_checks" ON website_checks FOR SELECT USING (true);
