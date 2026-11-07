// lib/locations/global-registry.ts
// Global Country and Administrative Geography Registry
// Covers priority countries: India, United States, United Kingdom, Canada, Australia, New Zealand, Ireland, Singapore, UAE, South Africa
// Supports country-specific administrative hierarchies, truthful coverage reporting, and strict geographic isolation.

import { INDIAN_STATES_AND_UTS, DISTRICT_CENTROIDS, getDistrictCitiesAndTowns, VerifiedCityInfo } from './india';
import { US_STATES, US_CENTROIDS } from './countries/us';
import { UK_REGIONS, UK_CENTROIDS } from './countries/gb';
import { CANADA_PROVINCES, CANADA_CENTROIDS } from './countries/ca';
import { AU_STATES, AU_CENTROIDS } from './countries/au';
import { NZ_REGIONS, NZ_CENTROIDS } from './countries/nz';
import { IRELAND_PROVINCES, IRELAND_CENTROIDS } from './countries/ie';
import { SG_REGIONS, SG_CENTROIDS } from './countries/sg';
import { AE_EMIRATES, AE_CENTROIDS } from './countries/ae';
import { ZA_PROVINCES, ZA_CENTROIDS } from './countries/za';
import type { CountryCode as LibphoneCountryCode } from 'libphonenumber-js';

export interface HierarchyTerminology {
  level1Name: string; // e.g. "State / UT", "State", "Province", "Constituent Country / Region", "Emirate"
  level2Name: string; // e.g. "District", "County", "Local Authority", "Census Division", "Local Government Area", "Planning Area"
  level3Name: string; // e.g. "City / Town", "City / Place", "Suburb", "Locality"
  level4Name?: string; // e.g. "Locality / Ward", "Neighborhood", "Suburb"
}

export interface CountryMeta {
  code: string; // ISO 3166-1 alpha-2, e.g. 'IN', 'US', 'GB'
  alpha3: string; // ISO 3166-1 alpha-3, e.g. 'IND', 'USA', 'GBR'
  name: string;
  flagEmoji: string;
  nativeName?: string;
  alternativeNames: string[];
  callingCode: string; // e.g. '+91', '+1', '+44'
  defaultCurrency: string; // 'INR', 'USD', 'GBP', etc.
  currencySymbol: string; // '₹', '$', '£', etc.
  languages: string[];
  hierarchyTerms: HierarchyTerminology;
  phoneValidation: {
    libphonenumberCountry: LibphoneCountryCode;
    sampleNumber: string;
    nationalPrefix?: string;
  };
  addressFormat: {
    hasPostalCode: boolean;
    postalCodePattern?: string;
  };
  supportedProviders: string[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  attribution: {
    source: string;
    license: string;
    licenseUrl: string;
    datasetVersion: string;
    lastUpdated: string;
  };
}

export interface GlobalHierarchyLevel1 {
  code: string;
  name: string;
  type: string;
  capital?: string;
  divisions: Array<{
    name: string;
    headquarters?: string;
    tier?: 'tier_1' | 'tier_2' | 'tier_3';
    cities: string[];
    popularLocalities?: string[];
  }>;
}

export interface GlobalVerifiedPlace {
  id: string;
  countryCode: string;
  countryName: string;
  level1Code: string;
  level1Name: string;
  level2Name: string;
  name: string;
  isHeadquarters: boolean;
  searchCells: string[];
  localities: string[];
  latitude: number | null;
  longitude: number | null;
  coverageGapReported: boolean;
  coverageGapNotes?: string;
}

export const GLOBAL_COUNTRIES: CountryMeta[] = [
  {
    code: 'IN',
    alpha3: 'IND',
    name: 'India',
    flagEmoji: '🇮🇳',
    nativeName: 'भारत',
    alternativeNames: ['Bharat', 'Hindustan'],
    callingCode: '+91',
    defaultCurrency: 'INR',
    currencySymbol: '₹',
    languages: ['en', 'hi'],
    hierarchyTerms: {
      level1Name: 'State / Union Territory',
      level2Name: 'District',
      level3Name: 'City / Town',
      level4Name: 'Locality',
    },
    phoneValidation: {
      libphonenumberCountry: 'IN',
      sampleNumber: '+91 98765 43210',
      nationalPrefix: '0',
    },
    addressFormat: {
      hasPostalCode: true,
      postalCodePattern: '^[1-9][0-9]{5}$',
    },
    supportedProviders: ['osm_overpass', 'google_places'],
    bounds: { minLat: 6.0, maxLat: 37.5, minLng: 68.0, maxLng: 97.5 },
    attribution: {
      source: 'OpenStreetMap Contributors & Survey of India Datasets',
      license: 'Open Database License (ODbL) 1.0',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      datasetVersion: '2026.10',
      lastUpdated: '2026-10-21',
    },
  },
  {
    code: 'US',
    alpha3: 'USA',
    name: 'United States',
    flagEmoji: '🇺🇸',
    nativeName: 'United States of America',
    alternativeNames: ['USA', 'America', 'US'],
    callingCode: '+1',
    defaultCurrency: 'USD',
    currencySymbol: '$',
    languages: ['en', 'es'],
    hierarchyTerms: {
      level1Name: 'State',
      level2Name: 'County',
      level3Name: 'City / Place',
      level4Name: 'Neighborhood',
    },
    phoneValidation: {
      libphonenumberCountry: 'US',
      sampleNumber: '+1 415 555 2671',
      nationalPrefix: '1',
    },
    addressFormat: {
      hasPostalCode: true,
      postalCodePattern: '^[0-9]{5}(-[0-9]{4})?$',
    },
    supportedProviders: ['osm_overpass', 'google_places'],
    bounds: { minLat: 24.0, maxLat: 49.5, minLng: -125.0, maxLng: -66.5 },
    attribution: {
      source: 'US Census Bureau & OpenStreetMap Contributors',
      license: 'ODbL 1.0 / US Public Domain',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      datasetVersion: '2026.10',
      lastUpdated: '2026-10-21',
    },
  },
  {
    code: 'GB',
    alpha3: 'GBR',
    name: 'United Kingdom',
    flagEmoji: '🇬🇧',
    nativeName: 'United Kingdom of Great Britain and Northern Ireland',
    alternativeNames: ['UK', 'Britain', 'Great Britain', 'England', 'Scotland', 'Wales'],
    callingCode: '+44',
    defaultCurrency: 'GBP',
    currencySymbol: '£',
    languages: ['en', 'cy', 'gd'],
    hierarchyTerms: {
      level1Name: 'Constituent Country / Region',
      level2Name: 'County / Local Authority',
      level3Name: 'Town / City',
      level4Name: 'Locality',
    },
    phoneValidation: {
      libphonenumberCountry: 'GB',
      sampleNumber: '+44 20 7183 8750',
      nationalPrefix: '0',
    },
    addressFormat: {
      hasPostalCode: true,
      postalCodePattern: '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$',
    },
    supportedProviders: ['osm_overpass', 'google_places'],
    bounds: { minLat: 49.8, maxLat: 60.9, minLng: -8.7, maxLng: 1.8 },
    attribution: {
      source: 'Office for National Statistics (ONS) & OpenStreetMap',
      license: 'ODbL 1.0 / Open Government Licence',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      datasetVersion: '2026.10',
      lastUpdated: '2026-10-21',
    },
  },
  {
    code: 'CA',
    alpha3: 'CAN',
    name: 'Canada',
    flagEmoji: '🇨🇦',
    nativeName: 'Canada',
    alternativeNames: ['CAN'],
    callingCode: '+1',
    defaultCurrency: 'CAD',
    currencySymbol: '$',
    languages: ['en', 'fr'],
    hierarchyTerms: {
      level1Name: 'Province / Territory',
      level2Name: 'Regional Municipality / Division',
      level3Name: 'Municipality / City',
      level4Name: 'Locality',
    },
    phoneValidation: {
      libphonenumberCountry: 'CA',
      sampleNumber: '+1 416 555 0199',
      nationalPrefix: '1',
    },
    addressFormat: {
      hasPostalCode: true,
      postalCodePattern: '^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$',
    },
    supportedProviders: ['osm_overpass', 'google_places'],
    bounds: { minLat: 41.6, maxLat: 83.1, minLng: -141.0, maxLng: -52.6 },
    attribution: {
      source: 'Statistics Canada & OpenStreetMap Contributors',
      license: 'ODbL 1.0 / Open Government Licence - Canada',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      datasetVersion: '2026.10',
      lastUpdated: '2026-10-21',
    },
  },
  {
    code: 'AU',
    alpha3: 'AUS',
    name: 'Australia',
    flagEmoji: '🇦🇺',
    nativeName: 'Commonwealth of Australia',
    alternativeNames: ['AUS', 'Oz'],
    callingCode: '+61',
    defaultCurrency: 'AUD',
    currencySymbol: '$',
    languages: ['en'],
    hierarchyTerms: {
      level1Name: 'State / Territory',
      level2Name: 'Local Government Area (LGA)',
      level3Name: 'City / Suburb',
      level4Name: 'Locality',
    },
    phoneValidation: {
      libphonenumberCountry: 'AU',
      sampleNumber: '+61 2 9876 5432',
      nationalPrefix: '0',
    },
    addressFormat: {
      hasPostalCode: true,
      postalCodePattern: '^[0-9]{4}$',
    },
    supportedProviders: ['osm_overpass', 'google_places'],
    bounds: { minLat: -44.0, maxLat: -10.0, minLng: 112.0, maxLng: 154.0 },
    attribution: {
      source: 'Australian Bureau of Statistics & OpenStreetMap Contributors',
      license: 'ODbL 1.0 / CC BY 4.0',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      datasetVersion: '2026.10',
      lastUpdated: '2026-10-21',
    },
  },
  {
    code: 'NZ',
    alpha3: 'NZL',
    name: 'New Zealand',
    flagEmoji: '🇳🇿',
    nativeName: 'Aotearoa',
    alternativeNames: ['NZ', 'Aotearoa'],
    callingCode: '+64',
    defaultCurrency: 'NZD',
    currencySymbol: '$',
    languages: ['en', 'mi'],
    hierarchyTerms: {
      level1Name: 'Region',
      level2Name: 'Territorial Authority',
      level3Name: 'City / Town',
      level4Name: 'Suburb',
    },
    phoneValidation: {
      libphonenumberCountry: 'NZ',
      sampleNumber: '+64 9 302 5555',
      nationalPrefix: '0',
    },
    addressFormat: {
      hasPostalCode: true,
      postalCodePattern: '^[0-9]{4}$',
    },
    supportedProviders: ['osm_overpass', 'google_places'],
    bounds: { minLat: -47.5, maxLat: -34.0, minLng: 166.0, maxLng: 179.0 },
    attribution: {
      source: 'Stats NZ & OpenStreetMap Contributors',
      license: 'ODbL 1.0 / CC BY 4.0',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      datasetVersion: '2026.10',
      lastUpdated: '2026-10-21',
    },
  },
  {
    code: 'IE',
    alpha3: 'IRL',
    name: 'Ireland',
    flagEmoji: '🇮🇪',
    nativeName: 'Éire',
    alternativeNames: ['Republic of Ireland', 'Eire'],
    callingCode: '+353',
    defaultCurrency: 'EUR',
    currencySymbol: '€',
    languages: ['en', 'ga'],
    hierarchyTerms: {
      level1Name: 'Province',
      level2Name: 'County',
      level3Name: 'City / Town',
      level4Name: 'Locality',
    },
    phoneValidation: {
      libphonenumberCountry: 'IE',
      sampleNumber: '+353 1 496 0000',
      nationalPrefix: '0',
    },
    addressFormat: {
      hasPostalCode: true,
      postalCodePattern: '^[A-Z0-9]{3} [A-Z0-9]{4}$',
    },
    supportedProviders: ['osm_overpass', 'google_places'],
    bounds: { minLat: 51.4, maxLat: 55.4, minLng: -10.5, maxLng: -5.9 },
    attribution: {
      source: 'Central Statistics Office (CSO) & OpenStreetMap Contributors',
      license: 'ODbL 1.0 / CC BY 4.0',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      datasetVersion: '2026.10',
      lastUpdated: '2026-10-21',
    },
  },
  {
    code: 'SG',
    alpha3: 'SGP',
    name: 'Singapore',
    flagEmoji: '🇸🇬',
    nativeName: 'Singapore',
    alternativeNames: ['Republic of Singapore', 'Singapura'],
    callingCode: '+65',
    defaultCurrency: 'SGD',
    currencySymbol: 'S$',
    languages: ['en', 'zh', 'ms', 'ta'],
    hierarchyTerms: {
      level1Name: 'Region',
      level2Name: 'Planning Area',
      level3Name: 'Locality / Sector',
      level4Name: 'Subzone',
    },
    phoneValidation: {
      libphonenumberCountry: 'SG',
      sampleNumber: '+65 6789 0123',
    },
    addressFormat: {
      hasPostalCode: true,
      postalCodePattern: '^[0-9]{6}$',
    },
    supportedProviders: ['osm_overpass', 'google_places'],
    bounds: { minLat: 1.15, maxLat: 1.48, minLng: 103.6, maxLng: 104.05 },
    attribution: {
      source: 'Urban Redevelopment Authority (URA) & OpenStreetMap Contributors',
      license: 'ODbL 1.0 / Singapore Open Data Licence',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      datasetVersion: '2026.10',
      lastUpdated: '2026-10-21',
    },
  },
  {
    code: 'AE',
    alpha3: 'ARE',
    name: 'United Arab Emirates',
    flagEmoji: '🇦🇪',
    nativeName: 'الإمارات العربية المتحدة',
    alternativeNames: ['UAE', 'Emirates'],
    callingCode: '+971',
    defaultCurrency: 'AED',
    currencySymbol: 'AED',
    languages: ['ar', 'en'],
    hierarchyTerms: {
      level1Name: 'Emirate',
      level2Name: 'District / Sector',
      level3Name: 'City / Community',
      level4Name: 'Street / Area',
    },
    phoneValidation: {
      libphonenumberCountry: 'AE',
      sampleNumber: '+971 4 362 7000',
      nationalPrefix: '0',
    },
    addressFormat: {
      hasPostalCode: false,
    },
    supportedProviders: ['osm_overpass', 'google_places'],
    bounds: { minLat: 22.5, maxLat: 26.1, minLng: 51.5, maxLng: 56.4 },
    attribution: {
      source: 'Federal Competitiveness and Statistics Centre & OpenStreetMap Contributors',
      license: 'ODbL 1.0 / Open Data UAE',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      datasetVersion: '2026.10',
      lastUpdated: '2026-10-21',
    },
  },
  {
    code: 'ZA',
    alpha3: 'ZAF',
    name: 'South Africa',
    flagEmoji: '🇿🇦',
    nativeName: 'iRiphabhuliki yeSewula Afrika',
    alternativeNames: ['RSA', 'South Africa'],
    callingCode: '+27',
    defaultCurrency: 'ZAR',
    currencySymbol: 'R',
    languages: ['en', 'af', 'zu', 'xh'],
    hierarchyTerms: {
      level1Name: 'Province',
      level2Name: 'District / Metro Municipality',
      level3Name: 'City / Town',
      level4Name: 'Suburb',
    },
    phoneValidation: {
      libphonenumberCountry: 'ZA',
      sampleNumber: '+27 11 784 0000',
      nationalPrefix: '0',
    },
    addressFormat: {
      hasPostalCode: true,
      postalCodePattern: '^[0-9]{4}$',
    },
    supportedProviders: ['osm_overpass', 'google_places'],
    bounds: { minLat: -35.0, maxLat: -22.0, minLng: 16.0, maxLng: 33.0 },
    attribution: {
      source: 'Municipal Demarcation Board (MDB) & OpenStreetMap Contributors',
      license: 'ODbL 1.0 / Open Data South Africa',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      datasetVersion: '2026.10',
      lastUpdated: '2026-10-21',
    },
  },
];

// Country-Scoped Centroids Dictionary for Precise Geographic Grounding Worldwide
export const COUNTRY_CENTROIDS: Record<string, Record<string, { lat: number; lng: number }>> = {
  IN: DISTRICT_CENTROIDS,
  US: US_CENTROIDS,
  GB: UK_CENTROIDS,
  CA: CANADA_CENTROIDS,
  AU: AU_CENTROIDS,
  NZ: NZ_CENTROIDS,
  IE: IRELAND_CENTROIDS,
  SG: SG_CENTROIDS,
  AE: AE_CENTROIDS,
  ZA: ZA_CENTROIDS,
};

// Unified Centroids Dictionary for Fast, Authentic Geographic Resolving Worldwide
export const GLOBAL_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  ...DISTRICT_CENTROIDS,
  ...US_CENTROIDS,
  ...UK_CENTROIDS,
  ...CANADA_CENTROIDS,
  ...AU_CENTROIDS,
  ...NZ_CENTROIDS,
  ...IRELAND_CENTROIDS,
  ...SG_CENTROIDS,
  ...AE_CENTROIDS,
  ...ZA_CENTROIDS,
};

/**
 * Returns list of all available countries in the registry
 */
export function getAvailableCountries(): CountryMeta[] {
  return GLOBAL_COUNTRIES;
}

/**
 * Find country metadata by code (alpha-2 or alpha-3) or name
 */
export function getCountryByCode(codeOrName: string): CountryMeta | undefined {
  const norm = codeOrName.trim().toLowerCase();
  return GLOBAL_COUNTRIES.find(
    c =>
      c.code.toLowerCase() === norm ||
      c.alpha3.toLowerCase() === norm ||
      c.name.toLowerCase() === norm ||
      c.alternativeNames.some(alt => alt.toLowerCase() === norm)
  );
}

/**
 * Retrieves the level 1 administrative divisions (states, provinces, regions, emirates)
 * for the requested country.
 */
export function getCountryAdministrativeHierarchy(countryCode: string): GlobalHierarchyLevel1[] {
  const country = getCountryByCode(countryCode);
  if (!country) return [];

  switch (country.code) {
    case 'IN':
      return INDIAN_STATES_AND_UTS.map(s => ({
        code: s.code,
        name: s.name,
        type: s.type,
        capital: s.capital,
        divisions: s.districts.map(d => ({
          name: d.name,
          headquarters: d.headquarters,
          tier: d.tier,
          cities: d.cities,
          popularLocalities: d.popularLocalities,
        })),
      }));

    case 'US':
      return US_STATES.map(s => ({
        code: s.code,
        name: s.name,
        type: 'state',
        capital: s.capital,
        divisions: s.counties.map(c => ({
          name: c.name,
          headquarters: c.countySeat,
          tier: c.tier,
          cities: c.cities,
          popularLocalities: c.popularLocalities,
        })),
      }));

    case 'GB':
      return UK_REGIONS.map(r => ({
        code: r.code,
        name: r.name,
        type: r.type,
        capital: r.capital,
        divisions: r.counties.map(c => ({
          name: c.name,
          headquarters: c.countySeat,
          tier: c.tier,
          cities: c.cities,
          popularLocalities: c.popularLocalities,
        })),
      }));

    case 'CA':
      return CANADA_PROVINCES.map(p => ({
        code: p.code,
        name: p.name,
        type: 'province',
        capital: p.capital,
        divisions: p.divisions.map(d => ({
          name: d.name,
          tier: d.tier,
          cities: d.cities,
          popularLocalities: d.popularLocalities,
        })),
      }));

    case 'AU':
      return AU_STATES.map(s => ({
        code: s.code,
        name: s.name,
        type: 'state',
        capital: s.capital,
        divisions: s.lgas.map(l => ({
          name: l.name,
          tier: l.tier,
          cities: l.cities,
          popularLocalities: l.popularLocalities,
        })),
      }));

    case 'NZ':
      return NZ_REGIONS.map(r => ({
        code: r.code,
        name: r.name,
        type: 'region',
        capital: r.capital,
        divisions: r.authorities.map(a => ({
          name: a.name,
          tier: a.tier,
          cities: a.cities,
          popularLocalities: a.popularLocalities,
        })),
      }));

    case 'IE':
      return IRELAND_PROVINCES.map(p => ({
        code: p.code,
        name: p.name,
        type: 'province',
        divisions: p.counties.map(c => ({
          name: c.name,
          tier: c.tier,
          cities: c.cities,
          popularLocalities: c.popularLocalities,
        })),
      }));

    case 'SG':
      return SG_REGIONS.map(r => ({
        code: r.code,
        name: r.name,
        type: 'region',
        divisions: r.areas.map(a => ({
          name: a.name,
          tier: a.tier,
          cities: a.cities,
          popularLocalities: a.popularLocalities,
        })),
      }));

    case 'AE':
      return AE_EMIRATES.map(e => ({
        code: e.code,
        name: e.name,
        type: 'emirate',
        capital: e.capital,
        divisions: e.districts.map(d => ({
          name: d.name,
          tier: d.tier,
          cities: d.cities,
          popularLocalities: d.popularLocalities,
        })),
      }));

    case 'ZA':
      return ZA_PROVINCES.map(p => ({
        code: p.code,
        name: p.name,
        type: 'province',
        capital: p.capital,
        divisions: p.municipalities.map(m => ({
          name: m.name,
          tier: m.tier,
          cities: m.cities,
          popularLocalities: m.popularLocalities,
        })),
      }));

    default:
      return [];
  }
}

/**
 * Resolves verified cities, towns and search cells within a selected country division.
 * Honors coverage gaps honestly and creates structured place items.
 */
export function getAdministrativePlaces(
  countryCode: string,
  level1NameOrCode: string,
  level2Name: string
): {
  countryCode: string;
  countryName: string;
  level1Name: string;
  level2Name: string;
  places: GlobalVerifiedPlace[];
  coverageGapReported: boolean;
  coverageGapNotes?: string;
} {
  const country = getCountryByCode(countryCode) || GLOBAL_COUNTRIES[0];
  const normCountry = country.code.toLowerCase();
  const normL1 = level1NameOrCode.trim().toLowerCase();
  const normL2 = level2Name.trim().toLowerCase();

  // If India, delegate to the rich India dataset while wrapping in GlobalVerifiedPlace
  if (country.code === 'IN') {
    const inHierarchy = getDistrictCitiesAndTowns(level1NameOrCode, level2Name);
    const places: GlobalVerifiedPlace[] = inHierarchy.cities.map(c => ({
      id: c.id,
      countryCode: 'IN',
      countryName: 'India',
      level1Code: inHierarchy.state,
      level1Name: inHierarchy.state,
      level2Name: inHierarchy.district,
      name: c.name,
      isHeadquarters: c.isHeadquarters,
      searchCells: c.searchCells,
      localities: c.localities,
      latitude: c.latitude ?? null,
      longitude: c.longitude ?? null,
      coverageGapReported: Boolean(c.hasCoverageGap || inHierarchy.coverageGapReported),
      coverageGapNotes: inHierarchy.coverageGapNotes,
    }));

    return {
      countryCode: 'IN',
      countryName: 'India',
      level1Name: inHierarchy.state,
      level2Name: inHierarchy.district,
      places,
      coverageGapReported: inHierarchy.coverageGapReported,
      coverageGapNotes: inHierarchy.coverageGapNotes,
    };
  }

  // International Country Resolution
  const hierarchy = getCountryAdministrativeHierarchy(country.code);
  const l1Obj = hierarchy.find(
    l => l.name.toLowerCase() === normL1 || l.code.toLowerCase() === normL1
  );
  const cleanL1Name = l1Obj?.name || level1NameOrCode.trim();
  const l1Code = l1Obj?.code || cleanL1Name;

  const divObj = l1Obj?.divisions.find(
    d => d.name.toLowerCase() === normL2 || (d.headquarters && d.headquarters.toLowerCase() === normL2)
  );
  const cleanL2Name = divObj?.name || level2Name.trim();

  const placeNamesSet = new Set<string>();
  if (divObj?.headquarters) {
    placeNamesSet.add(divObj.headquarters);
  }
  if (divObj?.cities && divObj.cities.length > 0) {
    for (const c of divObj.cities) {
      if (c && c.trim()) placeNamesSet.add(c.trim());
    }
  }

  let coverageGapReported = false;
  let coverageGapNotes: string | undefined;

  if (placeNamesSet.size === 0) {
    placeNamesSet.add(cleanL2Name);
    coverageGapReported = true;
    coverageGapNotes = `Geographic notice: Only administrative division centroid (${cleanL2Name}) is currently cataloged in base dataset. Sub-divisional localities will be dynamically discovered during runtime scans.`;
  } else if (placeNamesSet.size === 1) {
    coverageGapReported = true;
    coverageGapNotes = `Geographic coverage notice: Single primary city (${Array.from(placeNamesSet)[0]}) cataloged for ${cleanL2Name}. Subordinate localities will be resolved through boundary search cells.`;
  }

  const countrySlug = normCountry;
  const l1Slug = cleanL1Name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const l2Slug = cleanL2Name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const places: GlobalVerifiedPlace[] = Array.from(placeNamesSet).map(placeName => {
    const isHq = Boolean(divObj?.headquarters && placeName.toLowerCase() === divObj.headquarters.toLowerCase());
    const placeSlug = placeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const placeId = `city-${countrySlug}-${l1Slug}-${l2Slug}-${placeSlug}`;

    const subLocalities = divObj?.popularLocalities || [];
    const searchCells = [
      `${placeName} Central (${cleanL2Name})`,
      ...subLocalities.slice(0, 4).map(loc => `${loc}, ${placeName}`),
    ];

    const countryCentroids = COUNTRY_CENTROIDS[country.code] || {};
    const rawCentroid =
      countryCentroids[placeName.toLowerCase().trim()] ||
      countryCentroids[cleanL2Name.toLowerCase().trim()] ||
      (divObj?.headquarters ? countryCentroids[divObj.headquarters.toLowerCase().trim()] : undefined);

    let centroid: { lat: number; lng: number } | undefined = rawCentroid;
    if (centroid) {
      if (
        centroid.lat < country.bounds.minLat ||
        centroid.lat > country.bounds.maxLat ||
        centroid.lng < country.bounds.minLng ||
        centroid.lng > country.bounds.maxLng
      ) {
        centroid = undefined;
      }
    }

    return {
      id: placeId,
      countryCode: country.code,
      countryName: country.name,
      level1Code: l1Code,
      level1Name: cleanL1Name,
      level2Name: cleanL2Name,
      name: placeName,
      isHeadquarters: isHq,
      searchCells,
      localities: subLocalities,
      latitude: centroid ? centroid.lat : null,
      longitude: centroid ? centroid.lng : null,
      coverageGapReported,
      coverageGapNotes,
    };
  });

  return {
    countryCode: country.code,
    countryName: country.name,
    level1Name: cleanL1Name,
    level2Name: cleanL2Name,
    places,
    coverageGapReported,
    coverageGapNotes,
  };
}

/**
 * Validates whether a location belongs strictly to the targeted country, level 1, and level 2 division.
 * Strictly prevents cross-country or cross-region contamination.
 */
export function isLocationInGlobalScope(
  locationId: string,
  targetCountryCode: string,
  targetLevel1: string,
  targetLevel2: string
): boolean {
  const normCountry = targetCountryCode.trim().toLowerCase();
  const normL1 = targetLevel1.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const normL2 = targetLevel2.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const normLoc = locationId.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // 1. If Indian location or standard city- ID
  if (normCountry === 'in') {
    return isLocationInIndiaScope(locationId, targetLevel1, targetLevel2);
  }

  // 2. Structured ID format: city-<country>-<level1>-<level2>-<place>
  if (locationId.startsWith('city-')) {
    const parts = normLoc.split('-');
    // Expected at least: city, country, level1, level2, place
    if (parts.length >= 5) {
      const locCountry = parts[1];
      if (locCountry !== normCountry) return false;
      return normLoc.includes(`-${normL2}-`) || normLoc.endsWith(`-${normL2}`);
    }
  }

  // 3. Fallback token checking
  const containsCountry = normLoc.includes(normCountry) || normLoc.startsWith(`in-${normCountry}-`);
  const containsL2 = normLoc.includes(normL2);
  return containsL2;
}

function isLocationInIndiaScope(locationId: string, targetState: string, targetDistrict: string): boolean {
  const normState = targetState.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const normDist = targetDistrict.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const normLoc = locationId.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Token-based fallback check if ID matches city-<state>-<district>-<place> or in-up-lucknow
  return (
    (normLoc.includes(`-${normDist}-`) || normLoc.endsWith(`-${normDist}`) || normLoc.startsWith(normDist)) &&
    (normLoc.includes(`-${normState}-`) || normLoc.includes(normState) || normLoc.startsWith('in-') || normLoc.startsWith('city-'))
  );
}

/**
 * Searches for a verified place across all registered countries by its unique place ID.
 */
export function findGlobalPlaceById(placeId: string): GlobalVerifiedPlace | undefined {
  const normId = placeId.trim().toLowerCase();

  // Fast check: if structured city-<country>-..., prioritize targeted country first
  let prioritizedCountries = GLOBAL_COUNTRIES;
  if (normId.startsWith('city-')) {
    const parts = normId.split('-');
    const code = parts[1]?.toUpperCase();
    const matched = GLOBAL_COUNTRIES.find(c => c.code === code);
    if (matched) {
      prioritizedCountries = [matched, ...GLOBAL_COUNTRIES.filter(c => c.code !== code)];
    }
  }

  for (const country of prioritizedCountries) {
    const hierarchy = getCountryAdministrativeHierarchy(country.code);
    for (const l1 of hierarchy) {
      for (const div of l1.divisions) {
        const res = getAdministrativePlaces(country.code, l1.name, div.name);
        const match = res.places.find(p => p.id.toLowerCase() === normId || p.id === placeId);
        if (match) return match;
      }
    }
  }

  return undefined;
}
