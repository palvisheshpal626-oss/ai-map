// lib/types/index.ts
// Core domain interfaces and schemas for Restaurant Lead Finder

export type GeographicType = 'state' | 'district' | 'city' | 'locality';

export interface GeographicLocation {
  id: string;
  parent_id?: string | null;
  country_code: string;
  state: string;
  district: string;
  city?: string | null;
  locality?: string | null;
  geographic_type: GeographicType;
  source_identifier?: string | null;
  supported_status: 'active' | 'unsupported' | 'pending_data';
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export type WebsiteStatus =
  | 'WEBSITE_LISTED'
  | 'WEBSITE_REACHABLE'
  | 'WEBSITE_UNREACHABLE'
  | 'WEBSITE_NOT_LISTED'
  | 'VERIFIED_NO_OFFICIAL_WEBSITE'
  | 'VERIFICATION_PENDING'
  | 'VERIFICATION_FAILED'
  | 'VERIFICATION_NOT_PERMITTED';

export type WhatsAppAvailabilityStatus =
  | 'invalid_number'
  | 'valid_number'
  | 'whatsapp_unknown'
  | 'whatsapp_available'
  | 'whatsapp_unavailable'
  | 'unknown'
  | 'available_verified'
  | 'unavailable_verified';

export type WhatsAppVerificationMethod =
  | 'whatsapp_business_api'
  | 'manual_user_check'
  | 'manual_verification';

export type WhatsAppFilterOption =
  | 'all'
  | 'whatsapp_available'
  | 'whatsapp_unverified'
  | 'whatsapp_unavailable'
  | 'invalid_number';

export interface Restaurant {
  id: string;
  business_name: string;
  normalized_name: string;
  category: string;
  description?: string | null;
  street_address?: string | null;
  formatted_address: string;
  country?: string;
  state: string;
  district: string;
  city?: string | null;
  locality?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone_number?: string | null;
  normalized_phone?: string | null;
  international_phone?: string | null;
  whatsapp_status?: WhatsAppAvailabilityStatus;
  whatsapp_verified_at?: string | null;
  whatsapp_verification_method?: WhatsAppVerificationMethod | string | null;
  whatsapp_verified_phone?: string | null;
  whatsapp_verified_by?: string | null;
  whatsapp_verification_notes?: string | null;
  email?: string | null;
  website_url?: string | null;
  website_status: WebsiteStatus;
  contact_page_url?: string | null;
  booking_url?: string | null;
  rating?: number | null;
  review_count: number | null;
  business_status?: string | null;
  maps_url?: string | null;
  source_provider?: string;
  source_record_id?: string | null;
  contact_verification_status?: string;
  provenance?: Record<string, unknown>;
  data_completeness_score: number; // 0 - 100
  lead_score: number; // 0 - 100
  lead_score_breakdown?: Record<string, number>;
  hospitality_tier?: 'luxury' | 'premium' | 'established' | 'standard' | 'small_outlet';
  brand_name?: string | null;
  is_established_chain?: boolean;
  relevance_score?: number;
  search_id?: string | null;
  qualification_status?: 'qualified' | 'disqualified' | 'unverified';
  qualification_reasons?: string[];
  disqualification_reason?: string | null;
  audit_trail?: CandidateAuditCheck[];
  audit_decision?: 'qualified' | 'rejected' | 'unverified';
  city_id?: string;
  first_discovered_at: string;
  last_checked_at: string;
  opportunity?: OpportunityAnalysis;
  crm_status?: 'lead' | 'contacted' | 'audit_sent' | 'proposal_shared' | 'demo_booked' | 'won' | 'lost';
  crm_notes?: Array<{ id: string; timestamp: string; text: string; author?: string }>;
  crm_stage_updated_at?: string;
}

export type OpportunityCategoryCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

export type OpportunityCategory =
  | 'A_NO_WEBSITE'
  | 'B_NO_MENU'
  | 'C_PDF_IMAGE_MENU'
  | 'D_POOR_MOBILE'
  | 'E_BROKEN_WEBSITE'
  | 'F_SOCIAL_ONLY'
  | 'G_AGGREGATOR_ONLY'
  | 'H_MODERN_WEBSITE'
  | 'I_QR_MENU_OPPORTUNITY';

export interface OpportunityAnalysis {
  category: OpportunityCategory;
  categoryCode: OpportunityCategoryCode;
  categoryLabel: string;
  badgeColor: string; // e.g. '#EF4444', '#F59E0B', '#10B981', etc.
  pitchAngle: string;
  recommendedService: string;
  opportunityScore: number; // 0 - 100
  evidence: string[];
  technicalDetails: {
    isSocialOnly: boolean;
    isAggregatorOnly: boolean;
    hasPdfMenu: boolean;
    hasImageMenu: boolean;
    hasHtmlMenu: boolean;
    hasOnlineOrdering: boolean;
    viewportMetaPresent: boolean;
    sslValid: boolean;
    httpStatus?: number;
    menuUrlsFound: string[];
  };
}

export type PhoneFilterOption = 'all' | 'with_phone' | 'without_phone';

export interface CandidateAuditCheck {
  check_name: string;
  status: 'passed' | 'failed' | 'unverified';
  evidence: string;
  source_used: string;
  timestamp: string;
}

export interface CandidateAuditRecord {
  id: string; // e.g. cand-jobId-sourceId
  job_id: string;
  city_id?: string;
  city_name: string;
  district_name: string;
  source_record_id?: string;
  business_name?: string;
  candidate_name?: string;
  category?: string;
  phone_number?: string | null;
  website_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  decision: 'qualified' | 'rejected' | 'unverified';
  rejection_reason?: string | null;
  primary_reason?: string | null;
  checks: CandidateAuditCheck[];
  restaurant_data?: Partial<Restaurant>;
  processed_at?: string;
  evaluated_at?: string;
}

export type CityCoverageStatus =
  | 'pending'
  | 'running'
  | 'in_progress'
  | 'completed'
  | 'partially_covered'
  | 'failed'
  | 'gap_reported';

export interface CityQueueItem {
  id: string;
  city_name: string;
  district_name: string;
  state_name: string;
  status: CityCoverageStatus;
  search_cells: (string | { name: string; lat?: number; lng?: number })[];
  current_cell_index: number;
  total_cells: number;
  candidates_fetched: number;
  candidates_qualified: number;
  candidates_rejected: number;
  candidates_unverified: number;
  candidates_persisted?: number;
  tasks_created?: number;
  tasks_completed?: number;
  tasks_failed?: number;
  provider_succeeded?: boolean;
  coverage_notes?: string;
  coverage_gap_reported?: boolean;
  provider_limitation?: string;
  error?: string;
  last_error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface DistrictCoverageSummary {
  district: string;
  state: string;
  total_cities: number;
  completed_cities: number;
  partially_covered_cities: number;
  pending_cities: number;
  failed_cities: number;
  gaps_reported_cities: number;
  coverage_percentage: number;
  coverage_status: 'complete' | 'completed' | 'in_progress' | 'partial' | 'gaps_reported';
}

export interface SearchConfig {
  id: string;
  name: string;
  selected_country?: string; // Country code e.g. 'IN', 'US', 'GB', 'CA', 'AU', etc.
  selected_locations: string[]; // Location IDs
  categories: string[];
  selected_district?: {
    state: string;
    district: string;
  };
  rating_filters: {
    min: number;
    max?: number | null;
    include_unrated: boolean;
  };
  review_filters: {
    min: number;
    max?: number | null;
    include_zero: boolean;
  };
  contact_filters: {
    phone: 'required' | 'optional' | 'unavailable';
    phone_filter?: PhoneFilterOption;
    email?: 'all' | 'required' | 'optional';
    website_filter: 'all' | 'no_website_only' | 'verified_absent' | 'listed_only';
    include_without_phone?: boolean;
    include_without_email?: boolean;
  };
  limits: {
    max_records_per_location: number;
    max_total_records: number;
  };
  provider_id: string;
}

export type ScanJobStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'
  | 'cancelled';

export interface ScanJob {
  id: string;
  owner_id?: string;
  name: string;
  configuration_snapshot: Partial<SearchConfig> & {
    selected_locations: string[];
    categories: string[];
    selected_district?: {
      state: string;
      district: string;
    };
  };
  provider_id: string;
  status: ScanJobStatus;
  current_city?: { id: string; name: string } | string | null;
  current_candidate?: { id: string; name: string } | string | null;
  city_queue?: CityQueueItem[];
  selected_country?: string;
  selected_district?: {
    state: string;
    district: string;
  };
  coverage_summary?: DistrictCoverageSummary;
  progress_counters: {
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    discovered_count: number;
    qualified_count: number;
    unverified_count?: number;
    duplicate_count: number;
    fetched_count?: number;
    rejected_count?: number;
    persisted_count?: number;
    persistence_failed_count?: number;
    associated_count?: number;
    empty_tasks?: number;
    rejection_breakdown?: Record<string, number>;
  };
  usage_counters: {
    api_requests: number;
    estimated_cost_inr: number;
  };
  error_summary?: string | null;
  diagnostic_summary?: string | null;
  last_error?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
}

export interface ScanTask {
  id: string;
  job_id: string;
  location_id: string;
  category: string;
  task_parameters: Record<string, unknown>;
  pagination_state?: Record<string, unknown>;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  retry_count: number;
  max_retries: number;
  records_discovered: number;
  last_error?: string | null;
  created_at: string;
  attempted_at?: string | null;
  completed_at?: string | null;
}

export interface LeadList {
  id: string;
  owner_id?: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export type LeadStatus =
  | 'new'
  | 'unreviewed'
  | 'verification_required'
  | 'qualified'
  | 'contacted'
  | 'interested'
  | 'follow_up_required'
  | 'not_interested'
  | 'disqualified'
  | 'converted';

export interface LeadNote {
  id: string;
  restaurant_id: string;
  lead_status: LeadStatus;
  note?: string;
  follow_up_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExportRecord {
  id: string;
  name: string;
  format: 'csv' | 'xlsx';
  row_count: number;
  applied_filters: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  error_message?: string;
  created_at: string;
  expires_at: string;
}

export interface SearchRun {
  runId: string;
  query: string;
  category?: string;
  state?: string;
  district?: string;
  city?: string;
  locality?: string;
  providerId: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'empty';
  startedAt: string;
  completedAt?: string;
  totalFetched: number;
  totalFilteredOut: number;
  totalResults: number;
  minRatingApplied?: number | null;
  minReviewsApplied?: number | null;
  error?: string | null;
  results: Restaurant[];
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface OfflineArea {
  id: string;
  city_name: string;
  district_name: string;
  state_name: string;
  bounding_box: BoundingBox;
  status: 'pending' | 'downloading' | 'ready' | 'failed' | 'refreshing';
  bytes_downloaded: number;
  records_count: number;
  checksum: string;
  attribution: string;
  last_downloaded_at: string;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RawImportedRecord {
  id: string;
  area_id: string;
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number | string;
  business_name: string;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  website?: string | null;
  tags: Record<string, unknown>;
  raw_payload: Record<string, unknown>;
  quarantine_status: 'active' | 'quarantined';
  imported_at: string;
}

export interface OfflineCleanupPreview {
  policy: 'safe' | 'strict';
  total_raw_records: number;
  records_to_delete: number;
  qualified_leads_preserved: number;
  active_campaign_records_preserved: number;
  historical_records_preserved: number;
  estimated_bytes_freed: number;
  deletable_record_ids: string[];
  summary_notes: string;
}

export interface OfflineCleanupResult {
  success: boolean;
  policy: 'safe' | 'strict';
  records_deleted: number;
  bytes_freed: number;
  timestamp: string;
  message: string;
}

export interface OfflineStorageMetrics {
  downloaded_areas_count: number;
  raw_imported_records_count: number;
  normalized_businesses_count: number;
  qualified_leads_count: number;
  unverified_records_count: number;
  rejected_records_count: number;
  duplicate_records_count: number;
  estimated_storage_bytes: number;
}

