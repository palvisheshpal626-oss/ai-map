import { describe, it, expect } from 'vitest';
import { GooglePlacesProvider } from './google-places';

describe('Google Places API (New) Adapter Verification', () => {
  it('reports unconfigured status when GOOGLE_PLACES_API_KEY is missing or empty', () => {
    const provider = new GooglePlacesProvider('');
    expect(provider.isConfigured()).toBe(false);
  });

  it('declares genuine supported capabilities matching Places API (New) official docs', () => {
    const provider = new GooglePlacesProvider('dummy-key-for-test');
    expect(provider.capabilities.supportsRatings).toBe(true);
    expect(provider.capabilities.supportsReviewCounts).toBe(true);
    expect(provider.capabilities.supportsPhoneNumbers).toBe(true);
    expect(provider.capabilities.supportsWebsites).toBe(true);
    expect(provider.capabilities.supportsPagination).toBe(true);
    expect(provider.capabilities.requiresCommercialKey).toBe(true);
    expect(provider.capabilities.maxResultsPerQuery).toBe(20);
  });

  it('returns honest error when testing connection without an API key', async () => {
    const provider = new GooglePlacesProvider('');
    const res = await provider.testConnection();
    expect(res.success).toBe(false);
    expect(res.message).toContain('Google Places API key is missing or not configured');
  });

  it('throws an informative error if searchBusinesses is called without credentials', async () => {
    const provider = new GooglePlacesProvider('');
    await expect(
      provider.searchBusinesses({
        query: 'restaurants Lucknow',
      })
    ).rejects.toThrow('Google Places API key is not configured');
  });
});
