// lib/locations/countries/nz.ts
// Administrative Geography & City Registry for New Zealand (NZ / NZL)
// Structured as Country -> Region -> Territorial Authority -> City / Town -> Suburb
// Source: Stats NZ Geographic Data Service & Land Information New Zealand (LINZ)
// Licensing: Creative Commons Attribution 4.0 International (CC BY 4.0)

export interface NZAuthority {
  name: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  cities: string[];
  popularLocalities: string[];
  centroid: { lat: number; lng: number };
}

export interface NZRegion {
  code: string;
  name: string;
  capital: string;
  authorities: NZAuthority[];
}

export const NZ_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // Auckland
  'auckland': { lat: -36.8485, lng: 174.7633 },
  'takapuna': { lat: -36.7880, lng: 174.7725 },
  'manukau': { lat: -36.9930, lng: 174.8770 },
  'albany': { lat: -36.7289, lng: 174.7006 },

  // Wellington
  'wellington': { lat: -41.2865, lng: 174.7762 },
  'lower hutt': { lat: -41.2092, lng: 174.9081 },
  'porirua': { lat: -41.1340, lng: 174.8400 },

  // Canterbury
  'christchurch': { lat: -43.5321, lng: 172.6362 },
  'timaru': { lat: -44.3970, lng: 171.2550 },

  // Otago
  'dunedin': { lat: -45.8788, lng: 170.5028 },
  'queenstown': { lat: -45.0312, lng: 168.6626 },
  'wanaka': { lat: -44.6943, lng: 169.1417 },

  // Waikato
  'hamilton': { lat: -37.7870, lng: 175.2793 },
  'hamilton nz': { lat: -37.7870, lng: 175.2793 },
  'cambridge': { lat: -37.8929, lng: 175.4697 },
  'taupo': { lat: -38.6857, lng: 176.0702 },

  // Bay of Plenty
  'tauranga': { lat: -37.6878, lng: 176.1651 },
  'rotorua': { lat: -38.1368, lng: 176.2497 },

  // Hawke's Bay
  'napier': { lat: -39.4928, lng: 176.9120 },
  'hastings': { lat: -39.6395, lng: 176.8406 },

  // Nelson & Marlborough
  'nelson': { lat: -41.2706, lng: 173.2840 },
  'blenheim': { lat: -41.5134, lng: 173.9528 },

  // Southland & Taranaki
  'invercargill': { lat: -46.4132, lng: 168.3538 },
  'new plymouth': { lat: -39.0556, lng: 174.0752 },
};

export const NZ_REGIONS: NZRegion[] = [
  {
    code: 'AUK',
    name: 'Auckland Region',
    capital: 'Auckland',
    authorities: [
      {
        name: 'Auckland Central & City Centre',
        tier: 'tier_1',
        cities: ['Auckland CBD', 'Ponsonby', 'Parnell', 'Newmarket', 'Britomart', 'Viaduct Harbour'],
        popularLocalities: ['Ponsonby Road Dining Strip', 'Viaduct Harbour Promenade', 'Wynyard Quarter', 'Britomart Precinct', 'Karangahape Road (K Road)'],
        centroid: { lat: -36.8485, lng: 174.7633 },
      },
      {
        name: 'North Shore & West Auckland',
        tier: 'tier_1',
        cities: ['Takapuna', 'Devonport', 'Albany', 'Henderson'],
        popularLocalities: ['Hurstmere Road Takapuna', 'Devonport Waterfront Village', 'Albany Westfield Corridor'],
        centroid: { lat: -36.7880, lng: 174.7725 },
      },
    ],
  },
  {
    code: 'WGN',
    name: 'Wellington Region',
    capital: 'Wellington',
    authorities: [
      {
        name: 'Wellington City',
        tier: 'tier_1',
        cities: ['Wellington CBD', 'Te Aro', 'Thorndon', 'Newtown', 'Oriental Bay'],
        popularLocalities: ['Cuba Street (Bohemian Dining)', 'Courtenay Place Entertainment Strip', 'Hannahs Laneway', 'Lambton Quay Core', 'Queens Wharf'],
        centroid: { lat: -41.2865, lng: 174.7762 },
      },
      {
        name: 'Hutt Valley & Porirua',
        tier: 'tier_2',
        cities: ['Lower Hutt', 'Upper Hutt', 'Porirua', 'Petone'],
        popularLocalities: ['Jackson Street Petone (Heritage Food Strip)', 'High Street Lower Hutt'],
        centroid: { lat: -41.2092, lng: 174.9081 },
      },
    ],
  },
  {
    code: 'CAN',
    name: 'Canterbury',
    capital: 'Christchurch',
    authorities: [
      {
        name: 'Christchurch City',
        tier: 'tier_1',
        cities: ['Christchurch Central', 'Riccarton', 'Merivale', 'Lyttelton', 'Sumner'],
        popularLocalities: ['The Terrace (Riverside Market / Strip)', 'Victoria Street Dining Precinct', 'New Regent Street', 'Riccarton Road'],
        centroid: { lat: -43.5321, lng: 172.6362 },
      },
      {
        name: 'South Canterbury (Timaru)',
        tier: 'tier_2',
        cities: ['Timaru', 'Ashburton', 'Geraldine'],
        popularLocalities: ['Stafford Street Timaru', 'Caroline Bay Precinct'],
        centroid: { lat: -44.3970, lng: 171.2550 },
      },
    ],
  },
  {
    code: 'OTA',
    name: 'Otago',
    capital: 'Dunedin',
    authorities: [
      {
        name: 'Queenstown-Lakes District',
        tier: 'tier_1',
        cities: ['Queenstown', 'Wanaka', 'Arrowtown'],
        popularLocalities: ['Queenstown Mall & Steamer Wharf', 'The Mall Wanaka (Lakefront)', 'Historic Buckingham Street Arrowtown'],
        centroid: { lat: -45.0312, lng: 168.6626 },
      },
      {
        name: 'Dunedin City',
        tier: 'tier_1',
        cities: ['Dunedin Central', 'North Dunedin', 'Port Chalmers'],
        popularLocalities: ['The Octagon Dunedin (Dining Hub)', 'George Street Shopping Corridor', 'St Clair Beach Esplanade'],
        centroid: { lat: -45.8788, lng: 170.5028 },
      },
    ],
  },
  {
    code: 'WKO',
    name: 'Waikato',
    capital: 'Hamilton',
    authorities: [
      {
        name: 'Hamilton City & Taupo',
        tier: 'tier_1',
        cities: ['Hamilton', 'Taupo', 'Cambridge', 'Raglan'],
        popularLocalities: ['Victoria Street Hamilton Dining Precinct', 'Taupo Lake Terrace Strip', 'Raglan Bow Street'],
        centroid: { lat: -37.7870, lng: 175.2793 },
      },
    ],
  },
  {
    code: 'BOP',
    name: 'Bay of Plenty',
    capital: 'Tauranga',
    authorities: [
      {
        name: 'Tauranga & Rotorua',
        tier: 'tier_1',
        cities: ['Tauranga', 'Mount Maunganui', 'Rotorua'],
        popularLocalities: ['Mount Maunganui (Marine Parade / Maunganui Rd)', 'The Strand Tauranga', 'Eat Streat Rotorua'],
        centroid: { lat: -37.6878, lng: 176.1651 },
      },
    ],
  },
  {
    code: 'HKB',
    name: 'Hawke\'s Bay',
    capital: 'Napier',
    authorities: [
      {
        name: 'Napier & Hastings',
        tier: 'tier_2',
        cities: ['Napier', 'Hastings', 'Havelock North'],
        popularLocalities: ['Art Deco Quarter Napier', 'Havelock North Village', 'Ahuriri Quay'],
        centroid: { lat: -39.4928, lng: 176.9120 },
      },
    ],
  },
  {
    code: 'TAS',
    name: 'Nelson & Marlborough',
    capital: 'Nelson',
    authorities: [
      {
        name: 'Nelson City & Blenheim',
        tier: 'tier_2',
        cities: ['Nelson', 'Richmond', 'Blenheim', 'Picton'],
        popularLocalities: ['Trafalgar Street Nelson (Upper Dining)', 'Blenheim Market Square', 'Marlborough Wine Belt'],
        centroid: { lat: -41.2706, lng: 173.2840 },
      },
    ],
  },
];
