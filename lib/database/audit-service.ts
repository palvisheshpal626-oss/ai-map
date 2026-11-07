// lib/database/audit-service.ts
// Production Database Content Audit & Provenance Verification Engine
// Categorizes database records into verified real-source, unknown provenance,
// test fixtures, mock data, and invalid data. Enforces non-destructive safeguards.

import { store } from '../store/memory-store';
import { getSupabaseAdmin } from '../supabase/client';
import { Restaurant } from '../types';
import { isValidPhoneNumber } from '../deduplication/deduplicator';

export type RecordProvenanceClassification =
  | 'verified_real_source'
  | 'unknown_provenance'
  | 'test_fixture'
  | 'mock_data'
  | 'invalid_data';

export interface RecordAuditEntry {
  id: string;
  business_name: string;
  source_provider: string;
  source_record_id: string | null;
  state: string;
  district: string;
  city: string | null;
  phone_number: string | null;
  first_discovered_at: string;
  classification: RecordProvenanceClassification;
  origin_evidence: string;
  is_safe_to_preserve: boolean;
}

export interface DatabaseAuditReport {
  timestamp: string;
  total_records: number;
  breakdown: {
    verified_real_source: number;
    unknown_provenance: number;
    test_fixture: number;
    mock_data: number;
    invalid_data: number;
  };
  preserved_records_count: number;
  actionable_records_count: number;
  records: RecordAuditEntry[];
  summary: string;
}

export interface DatabaseCleanupPreview {
  target_classification: 'test_fixture' | 'mock_data' | 'invalid_data';
  records_to_delete_count: number;
  protected_records_count: number;
  sample_deletable: Array<{ id: string; business_name: string; classification: string }>;
  requires_confirmation_token: string;
  safeguard_message: string;
}

export class DatabaseAuditService {
  private static instance: DatabaseAuditService;

  static getInstance(): DatabaseAuditService {
    if (!this.instance) {
      this.instance = new DatabaseAuditService();
    }
    return this.instance;
  }

  /**
   * Classifies a single restaurant record based on source metadata, naming patterns, and integrity.
   */
  classifyRecord(r: Restaurant): { classification: RecordProvenanceClassification; evidence: string } {
    const name = (r.business_name || '').trim();
    const sourceId = r.source_record_id || r.id || '';
    const provider = (r.source_provider || '').toLowerCase();

    // 1. Invalid Data check
    if (name.length < 2) {
      return {
        classification: 'invalid_data',
        evidence: `Missing or malformed business name: '${name}'`,
      };
    }

    // 2. Mock Data check
    if (
      provider.includes('mock') ||
      r.id.startsWith('mock-') ||
      (r.provenance as Record<string, unknown>)?.is_mock === true
    ) {
      return {
        classification: 'mock_data',
        evidence: `Provider '${r.source_provider}' or ID '${r.id}' carries mock marker`,
      };
    }

    // 3. Test Fixture check
    const isTestName =
      /^(sequence restaurant|historical cafe|test restaurant|sample diner|mock bistro|dummy eatery)/i.test(name);
    const isTestId =
      /^test-|^fixture-|^sample-|^demo-/i.test(r.id) ||
      (r.source_record_id && /^test-|^fixture-/i.test(r.source_record_id));

    if (isTestName || isTestId) {
      return {
        classification: 'test_fixture',
        evidence: `Identified by test fixture name or identifier pattern ('${name}')`,
      };
    }

    // 4. Verified Real Source
    const hasOsmId =
      sourceId.startsWith('osm-node-') ||
      sourceId.startsWith('osm-way-') ||
      sourceId.startsWith('osm-relation-') ||
      sourceId.startsWith('raw-osm-');
    const hasAuthenticCoords =
      typeof r.latitude === 'number' &&
      typeof r.longitude === 'number' &&
      !(r.latitude === 0 && r.longitude === 0);
    const isOsmProvider =
      (provider === 'osm_overpass' || provider === 'offline_local') &&
      (hasOsmId || (hasAuthenticCoords && Boolean(r.maps_url)));
    const isGoogleProvider = provider === 'google_places' && Boolean(r.source_record_id);

    if (hasOsmId || isOsmProvider || isGoogleProvider || (hasAuthenticCoords && Boolean(r.maps_url))) {
      return {
        classification: 'verified_real_source',
        evidence: `Authentic source ID '${sourceId}' via '${r.source_provider || 'OpenStreetMap/Google'}' with coordinates (${r.latitude}, ${r.longitude})`,
      };
    }

    // 5. Unknown Provenance (e.g. legitimate historical records from earlier discovery runs)
    // Strictly preserve: Do NOT assume fake simply because provider metadata is incomplete!
    return {
      classification: 'unknown_provenance',
      evidence: `Valid business listing located in ${r.city || r.district}, ${r.state}. Retained as legitimate historical discovery.`,
    };
  }

  /**
   * Performs an audit across all business records in the application.
   */
  async auditDatabase(): Promise<DatabaseAuditReport> {
    // 1. Sync latest from Supabase if not in test runner
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      await store.syncFromSupabase();
    }
    const allRestaurants = store.getAllRestaurants();

    const breakdown = {
      verified_real_source: 0,
      unknown_provenance: 0,
      test_fixture: 0,
      mock_data: 0,
      invalid_data: 0,
    };

    const auditedRecords: RecordAuditEntry[] = [];

    for (const r of allRestaurants) {
      const { classification, evidence } = this.classifyRecord(r);
      breakdown[classification]++;

      const isSafeToPreserve =
        classification === 'verified_real_source' || classification === 'unknown_provenance';

      auditedRecords.push({
        id: r.id,
        business_name: r.business_name,
        source_provider: r.source_provider || 'unspecified',
        source_record_id: r.source_record_id || null,
        state: r.state,
        district: r.district,
        city: r.city || null,
        phone_number: r.phone_number || null,
        first_discovered_at: r.first_discovered_at || new Date().toISOString(),
        classification,
        origin_evidence: evidence,
        is_safe_to_preserve: isSafeToPreserve,
      });
    }

    const preservedCount = breakdown.verified_real_source + breakdown.unknown_provenance;
    const actionableCount = breakdown.test_fixture + breakdown.mock_data + breakdown.invalid_data;

    const summary = `Database Content Audit: ${allRestaurants.length} total records evaluated. ${breakdown.verified_real_source} verified real-source records and ${breakdown.unknown_provenance} legitimate historical records strictly preserved. ${actionableCount} test fixtures or mock records identified.`;

    return {
      timestamp: new Date().toISOString(),
      total_records: allRestaurants.length,
      breakdown,
      preserved_records_count: preservedCount,
      actionable_records_count: actionableCount,
      records: auditedRecords,
      summary,
    };
  }

  /**
   * Previews cleanup for a specific actionable classification.
   */
  async previewCleanup(
    targetCategory: 'test_fixture' | 'mock_data' | 'invalid_data'
  ): Promise<DatabaseCleanupPreview> {
    const audit = await this.auditDatabase();
    const targetRecords = audit.records.filter(r => r.classification === targetCategory);

    return {
      target_classification: targetCategory,
      records_to_delete_count: targetRecords.length,
      protected_records_count: audit.preserved_records_count,
      sample_deletable: targetRecords.slice(0, 10).map(r => ({
        id: r.id,
        business_name: r.business_name,
        classification: r.classification,
      })),
      requires_confirmation_token: `CONFIRM_DELETE_${targetCategory.toUpperCase()}`,
      safeguard_message: `Strict safeguard active: All ${audit.preserved_records_count} verified and historical records are completely protected and will never be deleted.`,
    };
  }

  /**
   * Executes deletion of verified test fixtures or mock data with explicit confirmation.
   */
  async executeCleanup(
    targetCategory: 'test_fixture' | 'mock_data' | 'invalid_data',
    confirmationToken: string
  ): Promise<{ success: boolean; deleted_count: number; message: string }> {
    const expectedToken = `CONFIRM_DELETE_${targetCategory.toUpperCase()}`;
    if (confirmationToken !== expectedToken) {
      throw new Error(`Invalid confirmation token. Expected '${expectedToken}' to execute cleanup.`);
    }

    const audit = await this.auditDatabase();
    const deletable = audit.records.filter(r => r.classification === targetCategory);

    if (deletable.length === 0) {
      return {
        success: true,
        deleted_count: 0,
        message: `No records of type '${targetCategory}' found to clean up.`,
      };
    }

    const idsToDelete = deletable.map(r => r.id);

    // Delete from memory store
    for (const id of idsToDelete) {
      store.deleteRestaurant(id);
    }

    // Delete from Supabase if not in test environment
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('restaurants').delete().in('id', idsToDelete);
      } catch (err) {
        console.error('Failed to sync deletion to Supabase:', err);
      }
    }

    return {
      success: true,
      deleted_count: idsToDelete.length,
      message: `Successfully cleaned up ${idsToDelete.length} records classified as '${targetCategory}'. All legitimate business records remain protected.`,
    };
  }
}

export const databaseAuditService = DatabaseAuditService.getInstance();
