// lib/locations/countries/za.ts
// Administrative Geography & City Registry for South Africa (ZA / ZAF)
// Structured as Country -> Province -> District / Metropolitan Municipality -> City / Suburb -> Precinct
// Source: Statistics South Africa (Stats SA) & Municipal Demarcation Board (MDB)
// Licensing: Open Data / ODbL

export interface ZAMunicipality {
  name: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  cities: string[];
  popularLocalities: string[];
  centroid: { lat: number; lng: number };
}

export interface ZAProvince {
  code: string; // 'GP', 'WC', 'KZN', 'EC', 'FS', 'LP', 'MP', 'NW', 'NC'
  name: string;
  capital: string;
  municipalities: ZAMunicipality[];
}

export const ZA_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // Gauteng
  'johannesburg': { lat: -26.2041, lng: 28.0473 },
  'sandton': { lat: -26.1076, lng: 28.0567 },
  'rosebank': { lat: -26.1467, lng: 28.0436 },
  'pretoria': { lat: -25.7479, lng: 28.2293 },
  'centurion': { lat: -25.8603, lng: 28.1894 },
  'soweto': { lat: -26.2708, lng: 27.8585 },

  // Western Cape
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'camps bay': { lat: -33.9508, lng: 18.3780 },
  'stellenbosch': { lat: -33.9321, lng: 18.8602 },
  'franschhoek': { lat: -33.9100, lng: 19.1240 },
  'paarl': { lat: -33.7342, lng: 18.9622 },
  'george': { lat: -33.9630, lng: 22.4617 },
  'knysna': { lat: -34.0351, lng: 23.0488 },

  // KwaZulu-Natal
  'durban': { lat: -29.8587, lng: 31.0218 },
  'umhlanga': { lat: -29.7289, lng: 31.0858 },
  'pietermaritzburg': { lat: -29.6006, lng: 30.3794 },
  'ballito': { lat: -29.5390, lng: 31.2144 },

  // Eastern Cape
  'gqeberha': { lat: -33.9608, lng: 25.6022 },
  'east london': { lat: -33.0153, lng: 27.8999 },
  'makhanda': { lat: -33.3106, lng: 26.5256 },

  // Free State
  'bloemfontein': { lat: -29.0852, lng: 26.1596 },

  // Limpopo & Mpumalanga
  'polokwane': { lat: -23.9045, lng: 29.4688 },
  'mbombela': { lat: -25.4753, lng: 30.9694 },

  // North West & Northern Cape
  'rustenburg': { lat: -25.6676, lng: 27.2421 },
  'kimberley': { lat: -28.7282, lng: 24.7499 },
};

export const ZA_PROVINCES: ZAProvince[] = [
  {
    code: 'GP',
    name: 'Gauteng',
    capital: 'Johannesburg',
    municipalities: [
      {
        name: 'City of Johannesburg (Metropolitan Core)',
        tier: 'tier_1',
        cities: ['Johannesburg', 'Sandton', 'Rosebank', 'Randburg', 'Soweto', 'Parkhurst'],
        popularLocalities: ['Sandton City / Nelson Mandela Square', 'Rosebank Art & Dining Mile', '4th Avenue Parkhurst (Al Fresco Strip)', 'Vilakazi Street Soweto', 'Maboneng Precinct'],
        centroid: { lat: -26.2041, lng: 28.0473 },
      },
      {
        name: 'City of Tshwane (Greater Pretoria)',
        tier: 'tier_1',
        cities: ['Pretoria', 'Centurion', 'Hatfield', 'Menlyn'],
        popularLocalities: ['Menlyn Maine Dining Central', 'Hatfield Student Strip', 'Pretoria Central (Church Square)', 'Hazelwood Food Quarter'],
        centroid: { lat: -25.7479, lng: 28.2293 },
      },
      {
        name: 'City of Ekurhuleni (East Rand)',
        tier: 'tier_2',
        cities: ['Kempton Park', 'Benoni', 'Boksburg', 'Germiston'],
        popularLocalities: ['Emperors Palace Dining Belt', 'Boksburg Lake Strip'],
        centroid: { lat: -26.2200, lng: 28.2800 },
      },
    ],
  },
  {
    code: 'WC',
    name: 'Western Cape',
    capital: 'Cape Town',
    municipalities: [
      {
        name: 'City of Cape Town (Metropolitan Area)',
        tier: 'tier_1',
        cities: ['Cape Town CBD', 'Camps Bay', 'Sea Point', 'Green Point', 'Kloof Street', 'Bree Street', 'Waterfront'],
        popularLocalities: ['V&A Waterfront', 'Bree Street Culinary Strip', 'Kloof Street Dining', 'Camps Bay Sunset Strip (Victoria Rd)', 'Regent Road Sea Point'],
        centroid: { lat: -33.9249, lng: 18.4241 },
      },
      {
        name: 'Cape Winelands (Stellenbosch & Franschhoek)',
        tier: 'tier_1',
        cities: ['Stellenbosch', 'Franschhoek', 'Paarl'],
        popularLocalities: ['Dorp Street Stellenbosch', 'Franschhoek Main Road (Gourmet Capital)', 'Church Street Stellenbosch'],
        centroid: { lat: -33.9321, lng: 18.8602 },
      },
      {
        name: 'Garden Route & Overberg',
        tier: 'tier_2',
        cities: ['George', 'Knysna', 'Mossel Bay', 'Hermanus'],
        popularLocalities: ['Knysna Waterfront', 'Hermanus Old Harbour Promenade', 'George York Street'],
        centroid: { lat: -34.0351, lng: 23.0488 },
      },
    ],
  },
  {
    code: 'KZN',
    name: 'KwaZulu-Natal',
    capital: 'Pietermaritzburg',
    municipalities: [
      {
        name: 'eThekwini Metropolitan (Greater Durban)',
        tier: 'tier_1',
        cities: ['Durban', 'Umhlanga', 'Morningside', 'Westville', 'Ballito'],
        popularLocalities: ['Florida Road Morningside', 'Umhlanga Rocks Promenade / Chartwell Dr', 'Durban Golden Mile', 'Ballito Lifestyle Corridor'],
        centroid: { lat: -29.8587, lng: 31.0218 },
      },
      {
        name: 'Msunduzi (Pietermaritzburg & Midlands)',
        tier: 'tier_2',
        cities: ['Pietermaritzburg', 'Howick', 'Hilton'],
        popularLocalities: ['Midlands Meander Food Route', 'Church Street Pietermaritzburg'],
        centroid: { lat: -29.6006, lng: 30.3794 },
      },
    ],
  },
  {
    code: 'EC',
    name: 'Eastern Cape',
    capital: 'Bhisho',
    municipalities: [
      {
        name: 'Nelson Mandela Bay & Buffalo City',
        tier: 'tier_1',
        cities: ['Gqeberha', 'East London', 'Makhanda'],
        popularLocalities: ['Richmond Hill Gqeberha (Stanley St)', 'East London Beachfront', 'High Street Makhanda'],
        centroid: { lat: -33.9608, lng: 25.6022 },
      },
    ],
  },
  {
    code: 'FS',
    name: 'Free State',
    capital: 'Bloemfontein',
    municipalities: [
      {
        name: 'Mangaung Metropolitan',
        tier: 'tier_2',
        cities: ['Bloemfontein', 'Welkom', 'Bethlehem'],
        popularLocalities: ['Westdene Bloemfontein Dining Strip', 'Waterfront Bloemfontein'],
        centroid: { lat: -29.0852, lng: 26.1596 },
      },
    ],
  },
  {
    code: 'LP',
    name: 'Limpopo',
    capital: 'Polokwane',
    municipalities: [
      {
        name: 'Capricorn & Vhembe',
        tier: 'tier_2',
        cities: ['Polokwane', 'Tzaneen', 'Bela-Bela'],
        popularLocalities: ['Mall of the North Strip', 'Polokwane Central Landdros Mare St'],
        centroid: { lat: -23.9045, lng: 29.4688 },
      },
    ],
  },
  {
    code: 'MP',
    name: 'Mpumalanga',
    capital: 'Mbombela',
    municipalities: [
      {
        name: 'Ehlanzeni (Nelspruit)',
        tier: 'tier_2',
        cities: ['Mbombela', 'eMalahleni', 'White River'],
        popularLocalities: ['Riverside Mall Mbombela', 'White River Casterbridge Hollow Food Quarter'],
        centroid: { lat: -25.4753, lng: 30.9694 },
      },
    ],
  },
  {
    code: 'NW',
    name: 'North West',
    capital: 'Mahikeng',
    municipalities: [
      {
        name: 'Bojanala Platinum & Dr Kenneth Kaunda',
        tier: 'tier_2',
        cities: ['Rustenburg', 'Potchefstroom', 'Klerksdorp', 'Sun City'],
        popularLocalities: ['Potchefstroom Bult Area', 'Sun City Entertainment Resort Strip'],
        centroid: { lat: -25.6676, lng: 27.2421 },
      },
    ],
  },
  {
    code: 'NC',
    name: 'Northern Cape',
    capital: 'Kimberley',
    municipalities: [
      {
        name: 'Frances Baard',
        tier: 'tier_3',
        cities: ['Kimberley', 'Upington'],
        popularLocalities: ['Kimberley Big Hole Historic Quarter', 'Upington Orange River Strip'],
        centroid: { lat: -28.7282, lng: 24.7499 },
      },
    ],
  },
];
