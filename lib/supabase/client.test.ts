// lib/supabase/client.test.ts
// Unit & Integration Tests for Supabase Client Separation and Security Safeguards

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSupabase,
  getSupabaseAdmin,
  isSupabasePrivilegedConfigured,
} from './client';

describe('Supabase Client Separation & Credential Security', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('correctly identifies modern sb_secret_ format as privileged', () => {
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_mock_secret_key_12345';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = isSupabasePrivilegedConfigured();
    expect(result.isConfigured).toBe(true);
    expect(result.keyType).toBe('modern_secret');
  });

  it('correctly identifies legacy service_role JWT as privileged', () => {
    delete process.env.SUPABASE_SECRET_KEY;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({ role: 'service_role', exp: 2100000000 })
    ).toString('base64');
    process.env.SUPABASE_SERVICE_ROLE_KEY = `${header}.${payload}.mockSignature`;

    const result = isSupabasePrivilegedConfigured();
    expect(result.isConfigured).toBe(true);
    expect(result.keyType).toBe('legacy_jwt');
  });

  it('rejects keys where payload role is anon without assuming privileged by variable name', () => {
    delete process.env.SUPABASE_SECRET_KEY;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({ role: 'anon', exp: 2100000000 })
    ).toString('base64');
    process.env.SUPABASE_SERVICE_ROLE_KEY = `${header}.${payload}.mockSignature`;

    const result = isSupabasePrivilegedConfigured();
    expect(result.isConfigured).toBe(false);
    expect(result.reason).toContain('anon');
  });

  it('throws security error if getSupabaseAdmin() is called from a simulated browser environment', () => {
    (global as any).window = {};
    expect(() => getSupabaseAdmin()).toThrowError(/Security Violation/);
    delete (global as any).window;
  });

  it('initializes browser client with publishable key without throwing', () => {
    const client = getSupabase();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('initializes server-only privileged admin client in node environment', () => {
    const admin = getSupabaseAdmin();
    expect(admin).toBeDefined();
    expect(typeof admin.from).toBe('function');
  });
});
