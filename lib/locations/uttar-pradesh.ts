// lib/locations/uttar-pradesh.ts
// Normalized geographic hierarchy for Uttar Pradesh, India
// Incorporates all 75 districts of Uttar Pradesh and major commercial hubs/localities

import { GeographicLocation } from '../types';

export interface DistrictCoverage {
  district: string;
  division: string;
  headquarters: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  popularLocalities: string[];
}

export const UP_DISTRICTS: DistrictCoverage[] = [
  {
    district: 'Lucknow',
    division: 'Lucknow',
    headquarters: 'Lucknow',
    tier: 'tier_1',
    popularLocalities: ['Hazratganj', 'Gomti Nagar', 'Aliganj', 'Indira Nagar', 'Mahanagar', 'Aminabad', 'Alambagh', 'Chowk']
  },
  {
    district: 'Gautam Buddha Nagar',
    division: 'Meerut',
    headquarters: 'Noida',
    tier: 'tier_1',
    popularLocalities: ['Sector 18', 'Sector 62', 'Sector 15', 'Greater Noida West', 'Knowledge Park', 'Sector 50', 'Sector 137']
  },
  {
    district: 'Varanasi',
    division: 'Varanasi',
    headquarters: 'Varanasi',
    tier: 'tier_2',
    popularLocalities: ['Godowlia', 'Assi Ghat', 'Lanka', 'Sigra', 'Bhelupur', 'Cantt', 'Sarnath']
  },
  {
    district: 'Kanpur Nagar',
    division: 'Kanpur',
    headquarters: 'Kanpur',
    tier: 'tier_1',
    popularLocalities: ['Civil Lines', 'Swaroop Nagar', 'Kakadeo', 'Govind Nagar', 'Kidwai Nagar', 'Gumti No. 5']
  },
  {
    district: 'Agra',
    division: 'Agra',
    headquarters: 'Agra',
    tier: 'tier_2',
    popularLocalities: ['Tajganj', 'Sanjay Place', 'Civil Lines', 'Fatehabad Road', 'Kamla Nagar', 'Shahganj']
  },
  {
    district: 'Prayagraj',
    division: 'Prayagraj',
    headquarters: 'Prayagraj',
    tier: 'tier_2',
    popularLocalities: ['Civil Lines', 'Katra', 'George Town', 'Tagore Town', 'Kareli', 'Naini']
  },
  {
    district: 'Ghaziabad',
    division: 'Meerut',
    headquarters: 'Ghaziabad',
    tier: 'tier_1',
    popularLocalities: ['Indirapuram', 'Vaishali', 'Vasundhara', 'Raj Nagar', 'Crossings Republik', 'Kaushambi']
  },
  {
    district: 'Meerut',
    division: 'Meerut',
    headquarters: 'Meerut',
    tier: 'tier_2',
    popularLocalities: ['Shastri Nagar', 'Abu Lane', 'Modipuram', 'Ganga Nagar', 'Civil Lines']
  },
  {
    district: 'Bareilly',
    division: 'Bareilly',
    headquarters: 'Bareilly',
    tier: 'tier_2',
    popularLocalities: ['Civil Lines', 'Rajendra Nagar', 'DD Puram', 'Pilibhit Bypass', 'Model Town']
  },
  {
    district: 'Aligarh',
    division: 'Aligarh',
    headquarters: 'Aligarh',
    tier: 'tier_2',
    popularLocalities: ['Centre Point', 'Civil Lines', 'Marris Road', 'Ramghat Road', 'Dodhpur']
  },
  {
    district: 'Moradabad',
    division: 'Moradabad',
    headquarters: 'Moradabad',
    tier: 'tier_2',
    popularLocalities: ['Civil Lines', 'Mandi Chowk', 'Delhi Road', 'Buddhi Vihar', 'Kanth Road']
  },
  {
    district: 'Saharanpur',
    division: 'Saharanpur',
    headquarters: 'Saharanpur',
    tier: 'tier_2',
    popularLocalities: ['Court Road', 'Mission Compound', 'Delhi Road', 'Hasanpur']
  },
  {
    district: 'Gorakhpur',
    division: 'Gorakhpur',
    headquarters: 'Gorakhpur',
    tier: 'tier_2',
    popularLocalities: ['Golghar', 'Civil Lines', 'Betiahata', 'Taramandal', 'Shahpur', 'Medical College Road']
  },
  {
    district: 'Jhansi',
    division: 'Jhansi',
    headquarters: 'Jhansi',
    tier: 'tier_2',
    popularLocalities: ['Sadar Bazar', 'Civil Lines', 'Sipri Bazar', 'Nandanpura']
  },
  {
    district: 'Ayodhya',
    division: 'Ayodhya',
    headquarters: 'Ayodhya',
    tier: 'tier_2',
    popularLocalities: ['Civil Lines', 'Ramkot', 'Naya Ghat', 'Rekabganj', 'Faizabad Cantt']
  },
  {
    district: 'Mathura',
    division: 'Agra',
    headquarters: 'Mathura',
    tier: 'tier_2',
    popularLocalities: ['Dampier Nagar', 'Krishna Nagar', 'Vrindavan', 'Govardhan Road']
  },
  {
    district: 'Muzaffarnagar',
    division: 'Saharanpur',
    headquarters: 'Muzaffarnagar',
    tier: 'tier_3',
    popularLocalities: ['New Mandi', 'Civil Lines', 'Roorkee Road', 'Bharthana']
  },
  {
    district: 'Firozabad',
    division: 'Agra',
    headquarters: 'Firozabad',
    tier: 'tier_3',
    popularLocalities: ['Raja Ka Taal', 'Station Road', 'Suhaag Nagar']
  },
  {
    district: 'Mirzapur',
    division: 'Mirzapur',
    headquarters: 'Mirzapur',
    tier: 'tier_3',
    popularLocalities: ['Civil Lines', 'Vindhyachal', 'Katra Bajirao']
  },
  {
    district: 'Shahjahanpur',
    division: 'Bareilly',
    headquarters: 'Shahjahanpur',
    tier: 'tier_3',
    popularLocalities: ['Town Hall', 'Civil Lines', 'Rosa']
  }
];

// Remaining UP administrative districts for complete 75-district coverage registry
export const ALL_UP_DISTRICT_NAMES: string[] = [
  'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya',
  'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki',
  'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli',
  'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad',
  'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur',
  'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj',
  'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar', 'Lakhimpur Kheri',
  'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau',
  'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh',
  'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar',
  'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra',
  'Sultanpur', 'Unnao', 'Varanasi'
];

/**
 * Returns a normalized list of GeographicLocation objects for the state registry
 */
export function getNormalizedUPLocations(): GeographicLocation[] {
  const locations: GeographicLocation[] = [];

  // State Root
  const stateId = 'in-up';
  locations.push({
    id: stateId,
    parent_id: null,
    country_code: 'IN',
    state: 'Uttar Pradesh',
    district: 'Uttar Pradesh',
    geographic_type: 'state',
    supported_status: 'active'
  });

  // Comprehensive districts
  const detailedMap = new Map(UP_DISTRICTS.map(d => [d.district.toLowerCase(), d]));

  for (const name of ALL_UP_DISTRICT_NAMES) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const districtId = `in-up-${slug}`;
    const detailed = detailedMap.get(name.toLowerCase());

    locations.push({
      id: districtId,
      parent_id: stateId,
      country_code: 'IN',
      state: 'Uttar Pradesh',
      district: name,
      city: detailed ? detailed.headquarters : name,
      geographic_type: 'district',
      supported_status: 'active',
      metadata: detailed ? { division: detailed.division, tier: detailed.tier } : undefined
    });

    if (detailed && detailed.popularLocalities.length > 0) {
      for (const loc of detailed.popularLocalities) {
        const locSlug = loc.toLowerCase().replace(/[^a-z0-9]/g, '-');
        locations.push({
          id: `${districtId}-${locSlug}`,
          parent_id: districtId,
          country_code: 'IN',
          state: 'Uttar Pradesh',
          district: name,
          city: detailed.headquarters,
          locality: loc,
          geographic_type: 'locality',
          supported_status: 'active'
        });
      }
    }
  }

  return locations;
}
