// lib/locations/countries/ae.ts
// Administrative Geography & City Registry for the United Arab Emirates (AE / ARE)
// Structured as Country -> Emirate -> District / Sector -> Community / City -> Commercial Precinct
// Source: Federal Competitiveness and Statistics Centre (FCSC UAE) & Dubai Municipality GIS
// Licensing: Open Data UAE / ODbL

export interface AEDistrict {
  name: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  cities: string[];
  popularLocalities: string[];
  centroid: { lat: number; lng: number };
}

export interface AEEmirate {
  code: string; // 'DXB', 'AUH', 'SHJ', 'AJM', 'RAK', 'FUJ', 'UAQ'
  name: string;
  capital: string;
  districts: AEDistrict[];
}

export const AE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // Dubai
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'downtown dubai': { lat: 25.1972, lng: 55.2744 },
  'business bay': { lat: 25.1837, lng: 55.2666 },
  'dubai marina': { lat: 25.0805, lng: 55.1403 },
  'palm jumeirah': { lat: 25.1124, lng: 55.1390 },
  'jumeirah': { lat: 25.2014, lng: 55.2443 },
  'deira': { lat: 25.2697, lng: 55.3095 },
  'bur dubai': { lat: 25.2532, lng: 55.2972 },
  'al barsha': { lat: 25.1118, lng: 55.2048 },
  'jlt': { lat: 25.0740, lng: 55.1480 },

  // Abu Dhabi
  'abu dhabi': { lat: 24.4539, lng: 54.3773 },
  'al maryah island': { lat: 24.5008, lng: 54.3900 },
  'yas island': { lat: 24.4988, lng: 54.6064 },
  'saadiyat island': { lat: 24.5369, lng: 54.4347 },
  'al ain': { lat: 24.2075, lng: 55.7447 },

  // Sharjah
  'sharjah': { lat: 25.3463, lng: 55.4209 },
  'al majaz': { lat: 25.3250, lng: 55.3850 },
  'muwailih': { lat: 25.3012, lng: 55.4520 },

  // Northern Emirates
  'ajman': { lat: 25.4052, lng: 55.5136 },
  'ras al khaimah': { lat: 25.7895, lng: 55.9432 },
  'fujairah': { lat: 25.1288, lng: 56.3265 },
  'umm al quwain': { lat: 25.5647, lng: 55.5552 },
};

export const AE_EMIRATES: AEEmirate[] = [
  {
    code: 'DXB',
    name: 'Dubai',
    capital: 'Dubai City',
    districts: [
      {
        name: 'Downtown & Business Bay',
        tier: 'tier_1',
        cities: ['Downtown Dubai', 'Business Bay', 'DIFC (Dubai Financial Centre)'],
        popularLocalities: ['DIFC Gate Village (Fine Dining)', 'Sheikh Mohammed bin Rashid Blvd', 'Burj Khalifa Promenade', 'Dubai Mall Fashion Avenue Dining'],
        centroid: { lat: 25.1972, lng: 55.2744 },
      },
      {
        name: 'Dubai Marina & JBR',
        tier: 'tier_1',
        cities: ['Dubai Marina', 'Jumeirah Beach Residence (JBR)', 'Jumeirah Lake Towers (JLT)', 'Bluewaters Island'],
        popularLocalities: ['The Walk JBR', 'Marina Walk Promenade', 'Bluewaters Dining Belt', 'JLT Cluster Dining'],
        centroid: { lat: 25.0805, lng: 55.1403 },
      },
      {
        name: 'Jumeirah & Palm Jumeirah',
        tier: 'tier_1',
        cities: ['Jumeirah 1', 'Jumeirah 2', 'Jumeirah 3', 'Palm Jumeirah', 'Umm Suqeim'],
        popularLocalities: ['The Pointe Palm Jumeirah', 'Jumeirah Beach Road Dining Strip', 'Club Vista Mare Palm', 'City Walk Dubai'],
        centroid: { lat: 25.1124, lng: 55.1390 },
      },
      {
        name: 'Old Dubai & Deira / Bur Dubai',
        tier: 'tier_1',
        cities: ['Deira', 'Bur Dubai', 'Al Karama', 'Al Fahidi'],
        popularLocalities: ['Al Karama Street Food Corridor', 'Al Rigga Road Deira', 'Al Seef Waterfront Heritage', 'Meena Bazaar'],
        centroid: { lat: 25.2697, lng: 55.3095 },
      },
      {
        name: 'Al Barsha & Dubai South',
        tier: 'tier_2',
        cities: ['Al Barsha', 'Dubai Hills', 'Motor City', 'Dubai South'],
        popularLocalities: ['Mall of the Emirates Dining Belt', 'Dubai Hills Boulevard', 'Al Barsha 1 Food Strip'],
        centroid: { lat: 25.1118, lng: 55.2048 },
      },
    ],
  },
  {
    code: 'AUH',
    name: 'Abu Dhabi',
    capital: 'Abu Dhabi City',
    districts: [
      {
        name: 'Abu Dhabi Island Central',
        tier: 'tier_1',
        cities: ['Abu Dhabi Central', 'Al Danah', 'Al Khalidiya', 'Corniche'],
        popularLocalities: ['Abu Dhabi Corniche Waterfront', 'Al Maryah Island Promenade (The Galleria)', 'Al Zahiyah (Tourist Club Area)'],
        centroid: { lat: 24.4539, lng: 54.3773 },
      },
      {
        name: 'Yas & Saadiyat Leisure Islands',
        tier: 'tier_1',
        cities: ['Yas Island', 'Saadiyat Island', 'Al Raha Beach'],
        popularLocalities: ['Yas Marina Dining Strip', 'Yas Bay Waterfront', 'Mamsha Al Saadiyat Beach Promenade'],
        centroid: { lat: 24.4988, lng: 54.6064 },
      },
      {
        name: 'Al Ain Region (Eastern Region)',
        tier: 'tier_2',
        cities: ['Al Ain', 'Al Hili', 'Al Jimi'],
        popularLocalities: ['Al Ain Oasis Promenade', 'Jebel Hafeet Base Food Strip', 'Al Ain Town Centre'],
        centroid: { lat: 24.2075, lng: 55.7447 },
      },
    ],
  },
  {
    code: 'SHJ',
    name: 'Sharjah',
    capital: 'Sharjah City',
    districts: [
      {
        name: 'Sharjah City Centre & Waterfront',
        tier: 'tier_1',
        cities: ['Sharjah Central', 'Al Majaz', 'Al Nahda Sharjah', 'Muwailih'],
        popularLocalities: ['Al Majaz Waterfront Dining (Khalid Lagoon)', 'Muwailih Commercial Cafe Belt', 'Al Qasba Canal Strip', 'Sharjah Heritage Area'],
        centroid: { lat: 25.3463, lng: 55.4209 },
      },
    ],
  },
  {
    code: 'AJM',
    name: 'Ajman',
    capital: 'Ajman City',
    districts: [
      {
        name: 'Ajman City & Corniche',
        tier: 'tier_2',
        cities: ['Ajman', 'Al Nuaimiya', 'Al Rashidiya'],
        popularLocalities: ['Ajman Corniche Waterfront', 'Al Nuaimiya Commercial Strip'],
        centroid: { lat: 25.4052, lng: 55.5136 },
      },
    ],
  },
  {
    code: 'RAK',
    name: 'Ras Al Khaimah',
    capital: 'RAK City',
    districts: [
      {
        name: 'Ras Al Khaimah & Al Marjan',
        tier: 'tier_2',
        cities: ['Ras Al Khaimah', 'Al Nakheel', 'Al Hamra Village', 'Al Marjan Island'],
        popularLocalities: ['Al Marjan Island Promenade', 'Al Hamra Marina Dining', 'RAK Corniche'],
        centroid: { lat: 25.7895, lng: 55.9432 },
      },
    ],
  },
  {
    code: 'FUJ',
    name: 'Fujairah',
    capital: 'Fujairah City',
    districts: [
      {
        name: 'Fujairah & Dibba',
        tier: 'tier_2',
        cities: ['Fujairah', 'Dibba Al-Fujairah', 'Khor Fakkan'],
        popularLocalities: ['Fujairah Corniche', 'Al Faseel Dining Area', 'Khor Fakkan Oceanic Promenade'],
        centroid: { lat: 25.1288, lng: 56.3265 },
      },
    ],
  },
  {
    code: 'UAQ',
    name: 'Umm Al Quwain',
    capital: 'UAQ City',
    districts: [
      {
        name: 'Umm Al Quwain City',
        tier: 'tier_3',
        cities: ['Umm Al Quwain', 'Al Salamah'],
        popularLocalities: ['UAQ Old Town / Waterfront', 'King Faisal Road Corridor'],
        centroid: { lat: 25.5647, lng: 55.5552 },
      },
    ],
  },
];
