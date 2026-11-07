// lib/locations/countries/au.ts
// Administrative Geography & City Registry for Australia (AU / AUS)
// Structured as Country -> State/Territory -> Local Government Area (LGA) / Region -> City / Suburb -> Precinct
// Source: Australian Bureau of Statistics (ABS) Australian Statistical Geography Standard (ASGS)
// Licensing: Creative Commons Attribution 4.0 International (CC BY 4.0)

export interface AULGA {
  name: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  cities: string[];
  popularLocalities: string[];
  centroid: { lat: number; lng: number };
}

export interface AUState {
  code: string; // 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'
  name: string;
  capital: string;
  lgas: AULGA[];
}

export const AU_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // New South Wales
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'parramatta': { lat: -33.8150, lng: 151.0011 },
  'newcastle': { lat: -32.9283, lng: 151.7817 },
  'wollongong': { lat: -34.4278, lng: 150.8931 },
  'central coast': { lat: -33.4267, lng: 151.3417 },
  'byron bay': { lat: -28.6474, lng: 153.6120 },

  // Victoria
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'geelong': { lat: -38.1499, lng: 144.3617 },
  'ballarat': { lat: -37.5622, lng: 143.8503 },
  'bendigo': { lat: -36.7570, lng: 144.2794 },

  // Queensland
  'brisbane': { lat: -27.4698, lng: 153.0251 },
  'gold coast': { lat: -28.0167, lng: 153.4000 },
  'sunshine coast': { lat: -26.6500, lng: 153.0667 },
  'cairns': { lat: -16.9186, lng: 145.7781 },
  'townsville': { lat: -19.2590, lng: 146.8169 },
  'toowoomba': { lat: -27.5598, lng: 151.9507 },

  // Western Australia
  'perth': { lat: -31.9505, lng: 115.8605 },
  'fremantle': { lat: -32.0556, lng: 115.7489 },
  'mandurah': { lat: -32.5269, lng: 115.7226 },
  'bunbury': { lat: -33.3267, lng: 115.6397 },

  // South Australia
  'adelaide': { lat: -34.9285, lng: 138.6007 },
  'glenelg': { lat: -34.9817, lng: 138.5147 },
  'mount gambier': { lat: -37.8294, lng: 140.7828 },

  // Tasmania
  'hobart': { lat: -42.8821, lng: 147.3272 },
  'launceston': { lat: -41.4332, lng: 147.1441 },

  // Australian Capital Territory
  'canberra': { lat: -35.2809, lng: 149.1300 },

  // Northern Territory
  'darwin': { lat: -12.4634, lng: 130.8456 },
  'alice springs': { lat: -23.6980, lng: 133.8807 },
};

export const AU_STATES: AUState[] = [
  {
    code: 'NSW',
    name: 'New South Wales',
    capital: 'Sydney',
    lgas: [
      {
        name: 'City of Sydney (Metropolitan Core)',
        tier: 'tier_1',
        cities: ['Sydney CBD', 'Surry Hills', 'Darlinghurst', 'Newtown', 'Paddington', 'Haymarket'],
        popularLocalities: ['Circular Quay & The Rocks', 'Surry Hills (Crown Street)', 'Chinatown Sydney (Dixon St)', 'Darling Harbour', 'Barangaroo Dining Strip', 'King Street Newtown'],
        centroid: { lat: -33.8688, lng: 151.2093 },
      },
      {
        name: 'City of Parramatta (Western Sydney)',
        tier: 'tier_1',
        cities: ['Parramatta', 'Harris Park', 'Epping', 'Westmead'],
        popularLocalities: ['Church Street (Eat Street)', 'Harris Park (Little India)', 'Parramatta Square'],
        centroid: { lat: -33.8150, lng: 151.0011 },
      },
      {
        name: 'Newcastle & Hunter Region',
        tier: 'tier_2',
        cities: ['Newcastle', 'Maitland', 'Cessnock', 'Nelson Bay'],
        popularLocalities: ['Darby Street Newcastle', 'Honeysuckle Waterfront', 'Hunter Valley Wine & Dine Corridor'],
        centroid: { lat: -32.9283, lng: 151.7817 },
      },
      {
        name: 'Wollongong & Illawarra',
        tier: 'tier_2',
        cities: ['Wollongong', 'Shellharbour', 'Kiama'],
        popularLocalities: ['Crown Street Mall', 'Wollongong Blue Mile', 'Kiama Harbour Strip'],
        centroid: { lat: -34.4278, lng: 150.8931 },
      },
    ],
  },
  {
    code: 'VIC',
    name: 'Victoria',
    capital: 'Melbourne',
    lgas: [
      {
        name: 'City of Melbourne (CBD & Inner North)',
        tier: 'tier_1',
        cities: ['Melbourne CBD', 'Carlton', 'Fitzroy', 'Docklands', 'Southbank'],
        popularLocalities: ['Flinders Lane (Degraves St)', 'Lygon Street (Little Italy Carlton)', 'Brunswick Street Fitzroy', 'Southbank Promenade', 'Chinatown Melbourne (Little Bourke)'],
        centroid: { lat: -37.8136, lng: 144.9631 },
      },
      {
        name: 'City of Yarra & Port Phillip',
        tier: 'tier_1',
        cities: ['Richmond', 'Collingwood', 'St Kilda', 'South Melbourne', 'Prahran'],
        popularLocalities: ['Victoria Street Richmond (Little Saigon)', 'Smith Street Collingwood', 'Acland Street St Kilda', 'Chapel Street Prahran', 'South Melbourne Market'],
        centroid: { lat: -37.8200, lng: 144.9900 },
      },
      {
        name: 'City of Greater Geelong',
        tier: 'tier_2',
        cities: ['Geelong', 'Ocean Grove', 'Torquay', 'Queenscliff'],
        popularLocalities: ['Geelong Waterfront', 'Little Malop Street Dining Precinct', 'Pakington Street Geelong West'],
        centroid: { lat: -38.1499, lng: 144.3617 },
      },
    ],
  },
  {
    code: 'QLD',
    name: 'Queensland',
    capital: 'Brisbane',
    lgas: [
      {
        name: 'City of Brisbane (Inner Core)',
        tier: 'tier_1',
        cities: ['Brisbane CBD', 'Fortitude Valley', 'South Brisbane', 'West End', 'New Farm'],
        popularLocalities: ['Howard Smith Wharves', 'James Street New Farm', 'South Bank Parklands Precinct', 'West End Boundary Street', 'Chinatown Mall (The Valley)'],
        centroid: { lat: -27.4698, lng: 153.0251 },
      },
      {
        name: 'City of Gold Coast',
        tier: 'tier_1',
        cities: ['Surfers Paradise', 'Broadbeach', 'Burleigh Heads', 'Coolangatta', 'Robina'],
        popularLocalities: ['Cavill Avenue', 'Broadbeach Dining Strip (Surf Parade)', 'Burleigh Heads James Street', 'The Star Gold Coast Precinct'],
        centroid: { lat: -28.0167, lng: 153.4000 },
      },
      {
        name: 'Sunshine Coast & Cairns',
        tier: 'tier_2',
        cities: ['Noosa Heads', 'Maroochydore', 'Caloundra', 'Cairns'],
        popularLocalities: ['Hastings Street Noosa', 'Ocean Street Maroochydore', 'Cairns Esplanade Boardwalk'],
        centroid: { lat: -26.6500, lng: 153.0667 },
      },
    ],
  },
  {
    code: 'WA',
    name: 'Western Australia',
    capital: 'Perth',
    lgas: [
      {
        name: 'City of Perth & Inner Suburbs',
        tier: 'tier_1',
        cities: ['Perth CBD', 'Northbridge', 'Subiaco', 'Mount Lawley', 'Leederville'],
        popularLocalities: ['Northbridge Dining & Nightlife', 'Elizabeth Quay Waterfront', 'Beaufort Street Mount Lawley', 'Oxford Street Leederville', 'Hay Street Mall'],
        centroid: { lat: -31.9505, lng: 115.8605 },
      },
      {
        name: 'City of Fremantle & South West',
        tier: 'tier_2',
        cities: ['Fremantle', 'Mandurah', 'Bunbury', 'Margaret River'],
        popularLocalities: ['Cappuccino Strip Fremantle (South Tce)', 'Fremantle Fishing Boat Harbour', 'Margaret River Gourmet Corridor'],
        centroid: { lat: -32.0556, lng: 115.7489 },
      },
    ],
  },
  {
    code: 'SA',
    name: 'South Australia',
    capital: 'Adelaide',
    lgas: [
      {
        name: 'City of Adelaide & Metropolitan Area',
        tier: 'tier_1',
        cities: ['Adelaide CBD', 'North Adelaide', 'Norwood', 'Glenelg'],
        popularLocalities: ['Gouger Street (Chinatown / Central Market)', 'Rundle Street (East End)', 'O\'Connell Street North Adelaide', 'Jetty Road Glenelg'],
        centroid: { lat: -34.9285, lng: 138.6007 },
      },
    ],
  },
  {
    code: 'TAS',
    name: 'Tasmania',
    capital: 'Hobart',
    lgas: [
      {
        name: 'Greater Hobart & Launceston',
        tier: 'tier_2',
        cities: ['Hobart', 'Salamanca', 'North Hobart', 'Launceston'],
        popularLocalities: ['Salamanca Place & Waterfront', 'Elizabeth Street North Hobart', 'Launceston Seaport'],
        centroid: { lat: -42.8821, lng: 147.3272 },
      },
    ],
  },
  {
    code: 'ACT',
    name: 'Australian Capital Territory',
    capital: 'Canberra',
    lgas: [
      {
        name: 'Canberra Central & Belconnen',
        tier: 'tier_1',
        cities: ['Canberra', 'Acton', 'Braddon', 'Kingston', 'Manuka'],
        popularLocalities: ['Lonsdale Street Braddon (Culinary Strip)', 'Kingston Foreshore', 'Manuka Precinct', 'Civic Central'],
        centroid: { lat: -35.2809, lng: 149.1300 },
      },
    ],
  },
  {
    code: 'NT',
    name: 'Northern Territory',
    capital: 'Darwin',
    lgas: [
      {
        name: 'Greater Darwin & Alice Springs',
        tier: 'tier_2',
        cities: ['Darwin', 'Palmerston', 'Alice Springs'],
        popularLocalities: ['Mitchell Street Darwin Dining Strip', 'Darwin Waterfront Precinct', 'Todd Mall Alice Springs'],
        centroid: { lat: -12.4634, lng: 130.8456 },
      },
    ],
  },
];
