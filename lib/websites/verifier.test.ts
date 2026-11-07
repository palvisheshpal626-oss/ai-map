import { describe, it, expect } from 'vitest';
import { isSafePublicUrl } from './verifier';

describe('Website Verifier SSRF Protection', () => {
  it('blocks localhost and loopback interfaces', () => {
    expect(isSafePublicUrl('http://localhost:3000').safe).toBe(false);
    expect(isSafePublicUrl('http://127.0.0.1:8080').safe).toBe(false);
    expect(isSafePublicUrl('http://[::1]/admin').safe).toBe(false);
  });

  it('blocks AWS/GCP cloud metadata IP (169.254.169.254)', () => {
    expect(isSafePublicUrl('http://169.254.169.254/latest/meta-data').safe).toBe(false);
  });

  it('blocks private RFC 1918 networks (10.x and 192.168.x)', () => {
    expect(isSafePublicUrl('http://192.168.1.1/router').safe).toBe(false);
    expect(isSafePublicUrl('http://10.0.0.5/secrets').safe).toBe(false);
  });

  it('permits valid public restaurant domains', () => {
    expect(isSafePublicUrl('https://dastarkhwan.in').safe).toBe(true);
    expect(isSafePublicUrl('http://www.royalcafe-lucknow.com/menu').safe).toBe(true);
  });
});
