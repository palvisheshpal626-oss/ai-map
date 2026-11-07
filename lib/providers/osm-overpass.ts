// lib/providers/osm-overpass.ts
// OpenStreetMap Provider Adapter with Dual-Engine: Nominatim Geocoding + Overpass Mirrors
// Retrieves real, verified OpenStreetMap restaurant and food-service records across all Indian states and UTs.
// Complies with ODbL license, handles User-Agent requirements, and provides resilient multi-mirror fallback.

import { BusinessDataProvider, ProviderCapability, ProviderSearchParams, ProviderSearchResult } from './types';
import { Restaurant, WebsiteStatus } from '../types';
import { DISTRICT_CENTROIDS } from '../locations/india';
import { GLOBAL_CENTROIDS, GLOBAL_COUNTRIES, getCountryByCode } from '../locations/global-registry';

function extractSpecificKeyword(query: string, category?: string): string | null {
  const inIndex = query.search(/\s+in\s+/i);
  if (inIndex === -1) {
    // Without an explicit "in" separator, do not mistake city/place names for business name filters
    return null;
  }
  let termBeforeIn = query.slice(0, inIndex).trim();

  let cleaned = termBeforeIn.toLowerCase();

  // Strip generic category names
  const genericTerms = [
    'cafes & coffee shops',
    'cafes and coffee shops',
    'coffee shops',
    'fine dining',
    'casual dining',
    'family restaurant',
    'family restaurants',
    'fast food & quick service',
    'fast food',
    'bakeries & sweet shops',
    'sweet shop',
    'sweet shops',
    'ice cream',
    'pubs, bars & lounges',
    'pubs and bars',
    'guest house',
    'guest houses',
    'restaurant',
    'restaurants',
    'cafe',
    'cafes',
    'hotel',
    'hotels',
    'resort',
    'resorts',
    'bakery',
    'bakeries',
    'pub',
    'pubs',
    'bar',
    'bars',
    'food',
    'dining',
  ];

  if (category) {
    cleaned = cleaned.replace(new RegExp(`\\b${category.toLowerCase()}\\b`, 'gi'), ' ');
  }

  for (const term of genericTerms) {
    cleaned = cleaned.replace(new RegExp(`\\b${term}\\b`, 'gi'), ' ');
  }

  cleaned = cleaned.replace(/[,;:.()]/g, ' ').trim().replace(/\s+/g, ' ');
  return cleaned.length >= 3 ? cleaned : null;
}

export class OpenStreetMapOverpassProvider implements BusinessDataProvider {
  readonly id = 'osm_overpass';
  readonly name = 'OpenStreetMap (Nominatim & Overpass)';

  readonly capabilities: ProviderCapability = {
    supportsRatings: false, // Transparent: OpenStreetMap does not store public consumer ratings
    supportsReviewCounts: false, // Transparent: OpenStreetMap does not store review counts
    supportsPhoneNumbers: true, // phone, contact:phone, contact:mobile tags
    supportsWebsites: true, // website, contact:website, url tags
    supportsPagination: false,
    supportsRealTimeStatus: true,
    requiresCommercialKey: false,
    maxResultsPerQuery: 50,
    termsNotes: 'Open Data Commons Open Database License (ODbL). No API key required.',
  };

  private static USER_AGENT = 'RestaurantLeadFinder/2.0 (admin@restaurantleadfinder.org)';
  private static queryCache = new Map<string, { timestamp: number; restaurants: Partial<Restaurant>[] }>();

  isConfigured(): boolean {
    return true; // Public open data source, no paid API key required
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = 'https://nominatim.openstreetmap.org/search?q=restaurant+india&format=json&limit=1';
        const res = await fetch(url, {
          headers: { 'User-Agent': OpenStreetMapOverpassProvider.USER_AGENT },
          signal: AbortSignal.timeout(15000),
        });
        const latencyMs = Date.now() - start;

        if (res.ok) {
          return {
            success: true,
            message: 'Connection successful. OpenStreetMap Nominatim/Overpass service is online and responding.',
            latencyMs,
          };
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      } catch (err: unknown) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        return {
          success: false,
          message: `Network error connecting to OpenStreetMap: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
    return { success: false, message: 'OpenStreetMap service did not respond within expected timeout.' };
  }

  async searchBusinesses(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const rawQuery = params.query?.trim() || 'restaurant India';
    const lowerQuery = rawQuery.toLowerCase();
    const encodedQuery = encodeURIComponent(rawQuery);

    // Identify target country from params, query, or geographic coordinates
    let activeCountry = params.countryCode ? getCountryByCode(params.countryCode) : undefined;

    // 2. Full country name or alternative names in query (e.g. "Singapore", "United States", "India")
    if (!activeCountry) {
      activeCountry = GLOBAL_COUNTRIES.find(c => {
        const cName = c.name.toLowerCase();
        if (lowerQuery.includes(cName)) return true;
        if (c.alternativeNames?.some(alt => lowerQuery.includes(alt.toLowerCase()))) return true;
        return false;
      });
    }

    // 3. Coordinate bounds check against known country bounding boxes
    if (!activeCountry && params.latitude !== undefined && params.longitude !== undefined) {
      activeCountry = GLOBAL_COUNTRIES.find(c =>
        params.latitude! >= c.bounds.minLat &&
        params.latitude! <= c.bounds.maxLat &&
        params.longitude! >= c.bounds.minLng &&
        params.longitude! <= c.bounds.maxLng
      );
    }

    // 4. Word boundary check for ISO codes, strictly avoiding false positives with English words like "in"
    if (!activeCountry) {
      activeCountry = GLOBAL_COUNTRIES.find(c => {
        if (c.code.toUpperCase() === 'IN') {
          // Prevent matching the common English preposition "in" (e.g., "Restaurant in Lucknow")
          return /\bIndia\b/i.test(rawQuery) || /,\s*IN\b/.test(rawQuery);
        }
        const codeRegex = new RegExp(`\\b${c.code}\\b`, 'i');
        return codeRegex.test(rawQuery);
      });
    }

    // 5. Default fallback to India if completely unspecified
    if (!activeCountry) {
      activeCountry = GLOBAL_COUNTRIES[0];
    }
    const countryCode = activeCountry.code.toLowerCase();

    // 1. Resolve authentic coordinates for target location early for geo-caching
    let lat = params.latitude;
    let lng = params.longitude;

    if (lat === undefined || lng === undefined) {
      // Check DISTRICT_CENTROIDS (India) first
      for (const [key, centroid] of Object.entries(DISTRICT_CENTROIDS)) {
        if (lowerQuery.includes(key)) {
          lat = centroid.lat;
          lng = centroid.lng;
          break;
        }
      }
    }

    if (lat === undefined || lng === undefined) {
      // Check GLOBAL_CENTROIDS
      for (const [key, centroid] of Object.entries(GLOBAL_CENTROIDS)) {
        if (lowerQuery.includes(key)) {
          lat = centroid.lat;
          lng = centroid.lng;
          break;
        }
      }
    }

    // In-memory query cache check (prevents 429 rate limit across concurrent queries for identical cities)
    const normalizedQ = lowerQuery
      .replace(/[,;:.()\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const cacheKey = `${countryCode}:${normalizedQ}:${(params.category || '').toLowerCase()}`;
    let cached = OpenStreetMapOverpassProvider.queryCache.get(cacheKey);

    // Check generic geoKey only for generic location queries without specific distinct business keywords
    const isGenericQuery = !params.query || /^(restaurant|hotel|cafe|bar|pub|dhaba|baker|sweet|food|resort|eatery)?\s*(in\s+)?([a-z\s,]+)$/i.test(params.query.trim());
    if (!cached && lat !== undefined && lng !== undefined && isGenericQuery) {
      const geoKey = `${countryCode}:${lat.toFixed(2)},${lng.toFixed(2)}:${(params.category || '').toLowerCase()}`;
      cached = OpenStreetMapOverpassProvider.queryCache.get(geoKey);
    }

    if (cached && Date.now() - cached.timestamp < 600000 && cached.restaurants.length > 0) {
      return {
        restaurants: cached.restaurants,
        totalEstimatedResults: cached.restaurants.length,
        usageCount: 0,
        status: 'success',
        sourceEngine: 'nominatim',
      };
    }

    let sawRateLimit = false;
    let sawNetworkError = false;

    // --- TIER 1: Nominatim POI Search (High richness for cities, instant POI resolution) ---
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&countrycodes=${countryCode}&format=json&addressdetails=1&extratags=1&limit=50`;

      let res = await fetch(nominatimUrl, {
        headers: { 'User-Agent': OpenStreetMapOverpassProvider.USER_AGENT, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(12000),
      });

      if (res.status === 429) {
        // Backoff 1.2s to respect Nominatim 1 req/sec policy and retry once
        await new Promise(r => setTimeout(r, 1200));
        res = await fetch(nominatimUrl, {
          headers: { 'User-Agent': OpenStreetMapOverpassProvider.USER_AGENT, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(12000),
        });
      }

      if (res.status === 429) {
        sawRateLimit = true;
      } else if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const restaurants: Partial<Restaurant>[] = [];

          for (const item of items) {
            const extra = item.extratags || {};
            const addr = item.address || {};

            // Strict boundary check
            if (addr.country_code && addr.country_code.toLowerCase() !== countryCode) continue;

            const itemLat = item.lat ? parseFloat(item.lat) : null;
            const itemLon = item.lon ? parseFloat(item.lon) : null;
            if (itemLat !== null && itemLon !== null) {
              if (
                itemLat < activeCountry.bounds.minLat ||
                itemLat > activeCountry.bounds.maxLat ||
                itemLon < activeCountry.bounds.minLng ||
                itemLon > activeCountry.bounds.maxLng
              ) {
                continue;
              }
            }

            const name = item.name || addr.amenity || addr.tourism || addr.shop || 'Food Service Business';
            const phone =
              extra.phone ||
              extra['contact:phone'] ||
              extra['contact:mobile'] ||
              extra['phone:mobile'] ||
              null;
            const email =
              extra.email ||
              extra['contact:email'] ||
              extra['business:email'] ||
              null;
            const website =
              extra.website ||
              extra['contact:website'] ||
              extra.url ||
              null;
            const websiteStatus: WebsiteStatus = website ? 'WEBSITE_LISTED' : 'WEBSITE_NOT_LISTED';

            const district = addr.state_district || addr.county || addr.city_district || addr.borough || addr.city || addr.town || '';
            const city = addr.city || addr.town || addr.municipality || addr.suburb || addr.neighbourhood || district;
            const state = addr.state || addr.province || addr.region || addr.borough || activeCountry.name;
            const locality = addr.suburb || addr.neighbourhood || addr.road || null;
            const osmType = item.osm_type || 'node';
            const osmId = item.osm_id;
            const sourceId = `osm-${osmType}-${osmId}`;
            const mapUrl = `https://www.openstreetmap.org/${osmType}/${osmId}`;
            const hasContact = Boolean(phone || email);

            restaurants.push({
              id: sourceId,
              business_name: name,
              category: params.category || addr.amenity || addr.shop || 'Restaurant',
              description: extra.description || extra.cuisine ? `Cuisine: ${extra.cuisine}` : null,
              formatted_address: item.display_name || `${name}, ${district}, ${state}, ${activeCountry.name}`,
              street_address: addr.road || null,
              country: activeCountry.name,
              state,
              district,
              city,
              locality,
              postal_code: addr.postcode || null,
              phone_number: phone,
              email,
              website_url: website,
              website_status: websiteStatus,
              latitude: itemLat,
              longitude: itemLon,
              maps_url: mapUrl,
              source_provider: 'osm_overpass',
              source_record_id: sourceId,
              contact_verification_status: hasContact ? 'UNVERIFIED_SOURCE_LISTED' : 'UNAVAILABLE',
              provenance: {
                provider: 'osm_overpass',
                engine: 'nominatim',
                osm_type: osmType,
                osm_id: osmId,
                raw_tags: extra,
              },
              rating: null,
              review_count: null,
            });
          }

          const specificKeyword = extractSpecificKeyword(rawQuery, params.category);
          console.log('[DEBUG OSM] specificKeyword:', specificKeyword, 'raw restaurants:', restaurants.length);
          let finalRestaurants = restaurants;
          if (specificKeyword && restaurants.length > 0) {
            finalRestaurants = restaurants.filter(r =>
              (r.business_name || '').toLowerCase().includes(specificKeyword)
            );
          }

          if (finalRestaurants.length > 0) {
            OpenStreetMapOverpassProvider.queryCache.set(cacheKey, { timestamp: Date.now(), restaurants: finalRestaurants });
            if (lat !== undefined && lng !== undefined) {
              const geoKey = `${countryCode}:${lat.toFixed(2)},${lng.toFixed(2)}:${(params.category || '').toLowerCase()}`;
              OpenStreetMapOverpassProvider.queryCache.set(geoKey, { timestamp: Date.now(), restaurants: finalRestaurants });
            }
            return {
              restaurants: finalRestaurants,
              totalEstimatedResults: finalRestaurants.length,
              usageCount: 1,
              status: 'success',
              sourceEngine: 'nominatim',
            };
          }
        }
      }
    } catch {
      // Proceed to Tier 2 on Nominatim timeout or network failure
    }

    // --- TIER 2: OSM Direct 0.6 Map REST API (High availability, perfect for towns & coordinates) ---
    if (lat !== undefined && lng !== undefined) {
      const delta = 0.035;
      const minLon = (lng - delta).toFixed(4);
      const minLat = (lat - delta).toFixed(4);
      const maxLon = (lng + delta).toFixed(4);
      const maxLat = (lat + delta).toFixed(4);
      const bboxStr = `${minLat},${minLon},${maxLat},${maxLon}`;

      try {
        const osmMapUrl = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${minLon},${minLat},${maxLon},${maxLat}`;
        const osmRes = await fetch(osmMapUrl, {
          headers: { 'User-Agent': OpenStreetMapOverpassProvider.USER_AGENT },
          signal: AbortSignal.timeout(5000),
        });

        if (osmRes.ok) {
          const osmData = await osmRes.json();
          const rawElements = osmData.elements || [];

          const foodOrHospitality = rawElements.filter((elem: any) => {
            const t = elem.tags || {};
            const isFood = /restaurant|cafe|fast_food|food_court|ice_cream|pub|bar|dhaba|tea|canteen/i.test(t.amenity || '');
            const isHotel = /hotel|guest_house|motel|resort|hostel/i.test(t.tourism || '');
            const isBakery = /bakery|confectionery|pastry|sweets/i.test(t.shop || '');
            return isFood || isHotel || isBakery;
          });

          if (foodOrHospitality.length > 0) {
            const restaurants: Partial<Restaurant>[] = [];

            for (const elem of foodOrHospitality) {
              const tags = elem.tags || {};
              const elemLat = elem.lat || elem.center?.lat || null;
              const elemLon = elem.lon || elem.center?.lon || null;

              if (elemLat !== null && elemLon !== null) {
                if (
                  elemLat < activeCountry.bounds.minLat ||
                  elemLat > activeCountry.bounds.maxLat ||
                  elemLon < activeCountry.bounds.minLng ||
                  elemLon > activeCountry.bounds.maxLng
                ) {
                  continue;
                }
              }

              const name = tags.name || tags['name:en'] || (tags.tourism ? `${tags.tourism} Hotel` : (tags.amenity ? `${tags.amenity} Eatery` : 'Restaurant'));
              const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null;
              const email = tags.email || tags['contact:email'] || null;
              const website = tags.website || tags['contact:website'] || tags.url || null;
              const websiteStatus: WebsiteStatus = website ? 'WEBSITE_LISTED' : 'WEBSITE_NOT_LISTED';

              const osmType = elem.type || 'node';
              const sourceId = `osm-${osmType}-${elem.id}`;
              const mapUrl = `https://www.openstreetmap.org/${osmType}/${elem.id}`;

              const cuisine = tags.cuisine || '';
              const category = params.category || (tags.amenity ? `${tags.amenity}` : (tags.tourism ? `${tags.tourism}` : 'Restaurant'));
              const hasContact = Boolean(phone || email);

              restaurants.push({
                id: sourceId,
                business_name: name,
                category: cuisine ? `${category} (${cuisine})` : category,
                description: tags.description || (cuisine ? `Cuisine: ${cuisine}` : null),
                formatted_address: tags['addr:full'] || `${name}, ${activeCountry.name}`,
                street_address: tags['addr:street'] || tags['addr:housenumber'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street'] || ''}`.trim() : null,
                country: activeCountry.name,
                state: tags['addr:state'] || '',
                district: tags['addr:district'] || '',
                city: tags['addr:city'] || '',
                postal_code: tags['addr:postcode'] || null,
                phone_number: phone,
                email,
                website_url: website,
                website_status: websiteStatus,
                latitude: elemLat,
                longitude: elemLon,
                maps_url: mapUrl,
                source_provider: 'osm_overpass',
                source_record_id: sourceId,
                contact_verification_status: hasContact ? 'UNVERIFIED_SOURCE_LISTED' : 'UNAVAILABLE',
                provenance: {
                  provider: 'osm_overpass',
                  engine: 'osm_direct',
                  osm_type: osmType,
                  osm_id: elem.id,
                  raw_tags: tags,
                },
                rating: null,
                review_count: null,
              });
            }

            const specificKeyword = extractSpecificKeyword(rawQuery, params.category);
            let finalRestaurants = restaurants;
            if (specificKeyword && restaurants.length > 0) {
              finalRestaurants = restaurants.filter(r =>
                (r.business_name || '').toLowerCase().includes(specificKeyword)
              );
            }

            if (finalRestaurants.length > 0) {
              OpenStreetMapOverpassProvider.queryCache.set(cacheKey, { timestamp: Date.now(), restaurants: finalRestaurants });
              return {
                restaurants: finalRestaurants,
                totalEstimatedResults: finalRestaurants.length,
                usageCount: 1,
                status: 'success',
                sourceEngine: 'osm_direct',
                boundingBoxUsed: bboxStr,
              };
            }
          } else {
            // Verified complete data returned 0 food/hospitality POIs
            return {
              restaurants: [],
              totalEstimatedResults: 0,
              usageCount: 1,
              status: 'empty',
              errorMessage: 'Verified 0 food or hospitality businesses mapped in OpenStreetMap for this search area.',
              sourceEngine: 'osm_direct',
              boundingBoxUsed: bboxStr,
            };
          }
        }
      } catch {
        // Fall back to Tier 3 Overpass mirrors if OSM direct encountered 400 or network error
      }
    }

    // --- TIER 3: Overpass Mirror Failover (Bounded Bounding Box Query) ---
    if (lat !== undefined && lng !== undefined) {
      const delta = 0.05;
      const bbox = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`;
      const overpassQuery = `[out:json][timeout:10];(
        node["amenity"~"restaurant|cafe|fast_food|food_court|ice_cream|pub|bar|dhaba|tea"](${bbox});
        way["amenity"~"restaurant|cafe|fast_food|food_court|ice_cream|pub|bar|dhaba|tea"](${bbox});
        node["tourism"~"hotel|guest_house|motel|resort"](${bbox});
        way["tourism"~"hotel|guest_house|motel|resort"](${bbox});
        node["shop"~"bakery|confectionery|pastry|sweets"](${bbox});
        way["shop"~"bakery|confectionery|pastry|sweets"](${bbox});
      );out center 50;`;

      const mirrors = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
      ];

      for (const mirror of mirrors) {
        try {
          const res = await fetch(`${mirror}?data=${encodeURIComponent(overpassQuery)}`, {
            headers: {
              'User-Agent': OpenStreetMapOverpassProvider.USER_AGENT,
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(4000),
          });

          if (res.status === 429) {
            sawRateLimit = true;
            continue;
          }

          if (res.ok) {
            const data = await res.json();
            const elements = data.elements || [];

            if (elements.length > 0) {
              const restaurants: Partial<Restaurant>[] = [];

              for (const elem of elements) {
                const tags = elem.tags || {};
                const elemLat = elem.lat || elem.center?.lat || null;
                const elemLon = elem.lon || elem.center?.lon || null;

                if (elemLat !== null && elemLon !== null) {
                  if (
                    elemLat < activeCountry.bounds.minLat ||
                    elemLat > activeCountry.bounds.maxLat ||
                    elemLon < activeCountry.bounds.minLng ||
                    elemLon > activeCountry.bounds.maxLng
                  ) {
                    continue;
                  }
                }

                const name = tags.name || tags['name:en'] || (tags.tourism ? `${tags.tourism} Hotel` : (tags.amenity ? `${tags.amenity} Eatery` : 'Restaurant'));
                const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null;
                const email = tags.email || tags['contact:email'] || null;
                const website = tags.website || tags['contact:website'] || tags.url || null;
                const websiteStatus: WebsiteStatus = website ? 'WEBSITE_LISTED' : 'WEBSITE_NOT_LISTED';

                const osmType = elem.type || 'node';
                const sourceId = `osm-${osmType}-${elem.id}`;
                const mapUrl = `https://www.openstreetmap.org/${osmType}/${elem.id}`;

                const cuisine = tags.cuisine || '';
                const category = params.category || (tags.amenity ? `${tags.amenity}` : (tags.tourism ? `${tags.tourism}` : 'Restaurant'));
                const hasContact = Boolean(phone || email);

                restaurants.push({
                  id: sourceId,
                  business_name: name,
                  category: cuisine ? `${category} (${cuisine})` : category,
                  description: tags.description || (cuisine ? `Cuisine: ${cuisine}` : null),
                  formatted_address: tags['addr:full'] || `${name}, ${activeCountry.name}`,
                  street_address: tags['addr:street'] || tags['addr:housenumber'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street'] || ''}`.trim() : null,
                  country: activeCountry.name,
                  state: tags['addr:state'] || '',
                  district: tags['addr:district'] || '',
                  city: tags['addr:city'] || '',
                  postal_code: tags['addr:postcode'] || null,
                  phone_number: phone,
                  email,
                  website_url: website,
                  website_status: websiteStatus,
                  latitude: elemLat,
                  longitude: elemLon,
                  maps_url: mapUrl,
                  source_provider: 'osm_overpass',
                  source_record_id: sourceId,
                  contact_verification_status: hasContact ? 'UNVERIFIED_SOURCE_LISTED' : 'UNAVAILABLE',
                  provenance: {
                    provider: 'osm_overpass',
                    engine: 'overpass',
                    osm_type: osmType,
                    osm_id: elem.id,
                    raw_tags: tags,
                  },
                  rating: null,
                  review_count: null,
                });
              }

              const specificKeyword = extractSpecificKeyword(rawQuery, params.category);
              let finalRestaurants = restaurants;
              if (specificKeyword && restaurants.length > 0) {
                finalRestaurants = restaurants.filter(r =>
                  (r.business_name || '').toLowerCase().includes(specificKeyword)
                );
              }

              return {
                restaurants: finalRestaurants,
                totalEstimatedResults: finalRestaurants.length,
                usageCount: 1,
                status: finalRestaurants.length > 0 ? 'success' : 'empty',
                sourceEngine: 'overpass',
                boundingBoxUsed: bbox,
              };
            }
          }
        } catch {
          sawNetworkError = true;
          continue;
        }
      }
    }

    if (sawRateLimit) {
      return {
        restaurants: [],
        totalEstimatedResults: 0,
        usageCount: 1,
        status: 'rate_limited',
        errorMessage: 'OpenStreetMap service rate-limited (HTTP 429). Retrying with backoff.',
      };
    }

    if (sawNetworkError) {
      return {
        restaurants: [],
        totalEstimatedResults: 0,
        usageCount: 1,
        status: 'error',
        errorMessage: 'OpenStreetMap servers temporarily unreachable or timed out.',
      };
    }

    return {
      restaurants: [],
      totalEstimatedResults: 0,
      usageCount: 1,
      status: 'empty',
      errorMessage: 'Verified 0 food or hospitality businesses mapped in OpenStreetMap for this search area.',
    };
  }
}
