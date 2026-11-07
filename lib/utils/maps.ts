// lib/utils/maps.ts
// Robust Google Maps navigation URL generators with coordinate validation and address fallback.

export interface LocationNavProps {
  business_name?: string | null;
  formatted_address?: string | null;
  street_address?: string | null;
  locality?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Validates that latitude and longitude are genuine, within geographic ranges,
 * and not missing, null, NaN, or 0,0 placeholder values.
 */
export function isValidCoordinate(lat?: number | null, lon?: number | null): boolean {
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return false;
  }
  const numLat = Number(lat);
  const numLon = Number(lon);

  if (isNaN(numLat) || isNaN(numLon)) {
    return false;
  }

  // Reject (0, 0) placeholder or Null Island coordinates
  if (numLat === 0 && numLon === 0) {
    return false;
  }

  // Latitude must be between -90 and 90
  if (numLat < -90 || numLat > 90) {
    return false;
  }

  // Longitude must be between -180 and 180
  if (numLon < -180 || numLon > 180) {
    return false;
  }

  return true;
}

/**
 * Constructs the most complete, unambiguous address string available,
 * ensuring city, district, state, and country are appended when available.
 */
export function constructFullAddress(props: LocationNavProps): string {
  // If formatted_address already includes city or state, check its completeness
  const rawFormatted = props.formatted_address?.trim() || '';
  const city = props.city?.trim() || props.district?.trim() || '';
  const state = props.state?.trim() || '';
  const country = props.country?.trim() || 'India';

  if (rawFormatted) {
    // If formatted address is already detailed and includes state or country, use it directly
    if (
      (state && rawFormatted.toLowerCase().includes(state.toLowerCase())) ||
      rawFormatted.toLowerCase().includes('india')
    ) {
      return rawFormatted;
    }
    // Append missing city/state/country to formatted address
    const parts = [rawFormatted];
    if (city && !rawFormatted.toLowerCase().includes(city.toLowerCase())) parts.push(city);
    if (state && !rawFormatted.toLowerCase().includes(state.toLowerCase())) parts.push(state);
    if (!rawFormatted.toLowerCase().includes('india')) parts.push(country);
    return parts.join(', ');
  }

  // Assemble from components
  const segments: string[] = [];
  if (props.business_name?.trim()) segments.push(props.business_name.trim());
  if (props.street_address?.trim()) segments.push(props.street_address.trim());
  if (props.locality?.trim()) segments.push(props.locality.trim());
  if (city) segments.push(city);
  if (state) segments.push(state);
  if (props.postal_code?.trim()) segments.push(props.postal_code.trim());
  segments.push(country);

  return segments.join(', ');
}

/**
 * Returns Google Maps URL targeting exact coordinates if valid:
 * https://www.google.com/maps/search/?api=1&query=LATITUDE%2CLONGITUDE
 *
 * If coordinates are invalid or missing, falls back to the full address:
 * https://www.google.com/maps/search/?api=1&query=ENCODED_FULL_ADDRESS
 *
 * Returns null if neither valid coordinates nor an address exists.
 */
export function getGoogleMapsUrl(props: LocationNavProps): string | null {
  if (isValidCoordinate(props.latitude, props.longitude)) {
    const lat = Number(props.latitude);
    const lon = Number(props.longitude);
    return `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lon}`;
  }

  const fullAddress = constructFullAddress(props);
  // Ensure we don't produce a query with just "India" if nothing else was given
  const cleaned = fullAddress.replace(/^[,\s]+|[,\s]+$/g, '');
  if (!cleaned || cleaned.toLowerCase() === 'india') {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleaned)}`;
}

/**
 * Generates Google Maps navigation link specifically for coordinate elements.
 * If coordinates are invalid, falls back to full address if provided.
 */
export function getCoordinateMapsUrl(
  lat?: number | null,
  lon?: number | null,
  fallbackProps?: LocationNavProps
): string | null {
  if (isValidCoordinate(lat, lon)) {
    const numLat = Number(lat);
    const numLon = Number(lon);
    return `https://www.google.com/maps/search/?api=1&query=${numLat}%2C${numLon}`;
  }

  if (fallbackProps) {
    const fullAddress = constructFullAddress(fallbackProps);
    const cleaned = fullAddress.replace(/^[,\s]+|[,\s]+$/g, '');
    if (cleaned && cleaned.toLowerCase() !== 'india') {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleaned)}`;
    }
  }

  return null;
}
