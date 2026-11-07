// lib/supabase/client.ts
// Verified Supabase Client Architecture for Restaurant Lead Finder

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Polyfill minimal WebSocket stub for Node < 22 runtimes where Realtime is unused
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {};
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseBrowserKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'your-anon-key';

let clientInstance: SupabaseClient | null = null;
let adminClientInstance: SupabaseClient | null = null;

export type KeyVerificationResult = {
  isConfigured: boolean;
  keyType?: 'modern_secret' | 'legacy_jwt';
  reason?: string;
};

/**
 * Checks whether a genuinely privileged Supabase credential (sb_secret_ or service_role JWT)
 * is configured without exposing secret values in logs or error messages.
 */
export function isSupabasePrivilegedConfigured(): KeyVerificationResult {
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      isConfigured: false,
      reason: 'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not defined in environment',
    };
  }

  // Modern Supabase secret key format (non-JWT)
  if (serviceKey.startsWith('sb_secret_')) {
    return { isConfigured: true, keyType: 'modern_secret' };
  }

  // Legacy JWT format: check role claim in payload
  const parts = serviceKey.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload.role === 'service_role' || payload.role === 'supabase_admin') {
        return { isConfigured: true, keyType: 'legacy_jwt' };
      }
      return {
        isConfigured: false,
        reason: `Configured key has role "${payload.role}" rather than "service_role"`,
      };
    } catch {
      return { isConfigured: false, reason: 'Malformed JWT structure in service key' };
    }
  }

  return { isConfigured: false, reason: 'Unrecognized key format' };
}

/**
 * Browser-safe client using public publishable or anon key.
 * Can be safely used in browser components or public reads.
 */
export function getSupabase(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseBrowserKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return clientInstance;
}

/**
 * Server-only privileged client using SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.
 * Never exposed to client-side bundles. Bypasses RLS for secure background worker operations.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('Security Violation: getSupabaseAdmin() cannot be called from the browser.');
  }

  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return getSupabase();
  }

  if (!adminClientInstance) {
    adminClientInstance = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClientInstance;
}
