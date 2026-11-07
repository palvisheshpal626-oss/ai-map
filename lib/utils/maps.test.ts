import { describe, it, expect } from 'vitest';
import {
  isValidCoordinate,
  constructFullAddress,
  getGoogleMapsUrl,
  getCoordinateMapsUrl,
} from './maps';

describe('Google Maps Links & Coordinate Validation Engine', () => {
  it('validates coordinates strictly within -90..90 and -180..180 and rejects 0,0 placeholder', () => {
    // Valid coordinates
    expect(isValidCoordinate(26.8467, 80.9462)).toBe(true); // Lucknow
    expect(isValidCoordinate(12.9716, 77.5946)).toBe(true); // Bengaluru
    expect(isValidCoordinate(-33.8688, 151.2093)).toBe(true); // Sydney
    expect(isValidCoordinate(90, 180)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);

    // Invalid coordinates
    expect(isValidCoordinate(null, null)).toBe(false);
    expect(isValidCoordinate(undefined, 80.9462)).toBe(false);
    expect(isValidCoordinate(26.8467, undefined)).toBe(false);
    expect(isValidCoordinate(NaN, 80.9462)).toBe(false);
    expect(isValidCoordinate(26.8467, NaN)).toBe(false);
    expect(isValidCoordinate(0, 0)).toBe(false); // Null Island / zero placeholder
    expect(isValidCoordinate(91, 50)).toBe(false); // Out of latitude bounds
    expect(isValidCoordinate(-91, 50)).toBe(false);
    expect(isValidCoordinate(50, 181)).toBe(false); // Out of longitude bounds
    expect(isValidCoordinate(50, -181)).toBe(false);
  });

  it('constructs complete addresses ensuring city, state, country are preserved', () => {
    const addr = constructFullAddress({
      business_name: 'Dastarkhwan',
      street_address: 'Tulsi Theatre Building',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      country: 'India',
    });
    expect(addr).toContain('Dastarkhwan');
    expect(addr).toContain('Lucknow');
    expect(addr).toContain('Uttar Pradesh');
    expect(addr).toContain('India');
  });

  it('uses exact coordinates for Google Maps search when valid', () => {
    const url = getGoogleMapsUrl({
      business_name: 'Udipi Restaurant',
      formatted_address: 'Shaheed Path, Lucknow, Uttar Pradesh, India',
      latitude: 26.795,
      longitude: 80.992,
    });
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=26.795%2C80.992');
  });

  it('falls back to URL-encoded full address when coordinates are missing or invalid', () => {
    const url = getGoogleMapsUrl({
      business_name: 'Elaichi Sweets & Restaurant',
      formatted_address: 'Mohan Rd, Pink City, Kakori, Lucknow, Uttar Pradesh, 226009, India',
      latitude: null,
      longitude: null,
    });
    expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(url).toContain(encodeURIComponent('Mohan Rd, Pink City, Kakori, Lucknow, Uttar Pradesh, 226009, India'));
  });

  it('returns null when neither valid coordinates nor an address exists', () => {
    expect(getGoogleMapsUrl({ latitude: null, longitude: null, formatted_address: '' })).toBeNull();
    expect(getGoogleMapsUrl({ latitude: 0, longitude: 0, formatted_address: null })).toBeNull();
  });

  it('generates coordinate maps URL with address fallback', () => {
    // Valid coords
    const coordUrl = getCoordinateMapsUrl(28.6139, 77.209);
    expect(coordUrl).toBe('https://www.google.com/maps/search/?api=1&query=28.6139%2C77.209');

    // Invalid coords with fallback address
    const fallbackUrl = getCoordinateMapsUrl(null, null, {
      formatted_address: 'Connaught Place, New Delhi, Delhi, India',
    });
    expect(fallbackUrl).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(fallbackUrl).toContain(encodeURIComponent('Connaught Place, New Delhi, Delhi, India'));

    // Neither
    expect(getCoordinateMapsUrl(null, null)).toBeNull();
  });

  it('generates distinct URLs for different rows', () => {
    const row1Url = getGoogleMapsUrl({ latitude: 26.8467, longitude: 80.9462 });
    const row2Url = getGoogleMapsUrl({ latitude: 12.9716, longitude: 77.5946 });
    expect(row1Url).not.toEqual(row2Url);
  });
});
