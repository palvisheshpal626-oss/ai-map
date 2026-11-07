// lib/locations/countries/sg.ts
// Administrative Geography & City Registry for Singapore (SG / SGP)
// Structured as Country -> Region -> Planning Area / Locality -> Sector / Hawker Hub
// Source: Urban Redevelopment Authority (URA) Master Plan & Singapore Department of Statistics (SingStat)
// Licensing: Singapore Open Data Licence / ODbL

export interface SGPlanningArea {
  name: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  cities: string[];
  popularLocalities: string[];
  centroid: { lat: number; lng: number };
}

export interface SGRegion {
  code: string;
  name: string;
  areas: SGPlanningArea[];
}

export const SG_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // Singapore National Centroid
  'singapore': { lat: 1.3521, lng: 103.8198 },

  // Central Region
  'downtown core': { lat: 1.2879, lng: 103.8519 },
  'orchard': { lat: 1.3048, lng: 103.8318 },
  'chinatown': { lat: 1.2842, lng: 103.8437 },
  'bugis': { lat: 1.3008, lng: 103.8561 },
  'tanjong pagar': { lat: 1.2764, lng: 103.8447 },
  'marina bay': { lat: 1.2840, lng: 103.8600 },
  'rochor': { lat: 1.3039, lng: 103.8528 },
  'kallang': { lat: 1.3115, lng: 103.8643 },
  'novena': { lat: 1.3204, lng: 103.8437 },
  'queenstown': { lat: 1.2942, lng: 103.8060 },
  'bukit merah': { lat: 1.2819, lng: 103.8239 },

  // East Region
  'katong': { lat: 1.3061, lng: 103.9038 },
  'bedok': { lat: 1.3236, lng: 103.9273 },
  'tampines': { lat: 1.3532, lng: 103.9452 },
  'pasir ris': { lat: 1.3721, lng: 103.9474 },
  'changi': { lat: 1.3582, lng: 103.9893 },

  // North-East Region
  'ang mo kio': { lat: 1.3691, lng: 103.8454 },
  'serangoon': { lat: 1.3554, lng: 103.8679 },
  'hougang': { lat: 1.3713, lng: 103.8915 },
  'sengkang': { lat: 1.3917, lng: 103.8954 },
  'punggol': { lat: 1.4052, lng: 103.9023 },

  // North Region
  'woodlands': { lat: 1.4382, lng: 103.7891 },
  'yishun': { lat: 1.4304, lng: 103.8354 },
  'sembawang': { lat: 1.4491, lng: 103.8185 },

  // West Region
  'jurong east': { lat: 1.3329, lng: 103.7436 },
  'jurong west': { lat: 1.3404, lng: 103.7090 },
  'clementi': { lat: 1.3162, lng: 103.7649 },
  'bukit batok': { lat: 1.3590, lng: 103.7519 },
  'choa chu kang': { lat: 1.3840, lng: 103.7470 },
};

export const SG_REGIONS: SGRegion[] = [
  {
    code: 'SG-CR',
    name: 'Central Region',
    areas: [
      {
        name: 'Downtown & Marina Core',
        tier: 'tier_1',
        cities: ['Downtown Core', 'Marina Bay', 'Tanjong Pagar', 'Raffles Place'],
        popularLocalities: ['Marina Bay Sands Dining', 'Telok Ayer Street', 'Club Street', 'Amoy Street', 'Boat Quay', 'Clarke Quay', 'Lau Pa Sat Hawker Festival'],
        centroid: { lat: 1.2879, lng: 103.8519 },
      },
      {
        name: 'Orchard & River Valley',
        tier: 'tier_1',
        cities: ['Orchard', 'River Valley', 'Somerset', 'Dhoby Ghaut'],
        popularLocalities: ['Orchard Road Dining Belt', 'Emerald Hill', 'Robertson Quay Waterfront', 'Killiney Road'],
        centroid: { lat: 1.3048, lng: 103.8318 },
      },
      {
        name: 'Chinatown & Outram',
        tier: 'tier_1',
        cities: ['Chinatown', 'Outram Park', 'Tiong Bahru', 'Keong Saik'],
        popularLocalities: ['Chinatown Food Street', 'Maxwell Food Centre', 'Keong Saik Road Michelin Belt', 'Tiong Bahru Market'],
        centroid: { lat: 1.2842, lng: 103.8437 },
      },
      {
        name: 'Bugis & Rochor',
        tier: 'tier_1',
        cities: ['Bugis', 'Kampong Glam', 'Little India Singapore', 'Rochor'],
        popularLocalities: ['Haji Lane Cafe Strip', 'Arab Street', 'Serangoon Road (Little India Spices)', 'Bugis Junction', 'Tekka Centre'],
        centroid: { lat: 1.3008, lng: 103.8561 },
      },
      {
        name: 'Novena & Kallang',
        tier: 'tier_2',
        cities: ['Novena', 'Kallang', 'Balestier', 'Geylang'],
        popularLocalities: ['Balestier Heritage Bak Kut Teh Belt', 'Old Airport Road Food Centre', 'United Square Novena'],
        centroid: { lat: 1.3150, lng: 103.8550 },
      },
    ],
  },
  {
    code: 'SG-ER',
    name: 'East Region',
    areas: [
      {
        name: 'Marine Parade & Bedok',
        tier: 'tier_1',
        cities: ['Katong', 'Joo Chiat', 'Bedok', 'Marine Parade'],
        popularLocalities: ['East Coast Road Katong (Peranakan Belt)', 'Joo Chiat Heritage Strip', 'Bedok Interchange Hawker Centre', 'East Coast Seafood Centre'],
        centroid: { lat: 1.3061, lng: 103.9038 },
      },
      {
        name: 'Tampines & Pasir Ris',
        tier: 'tier_1',
        cities: ['Tampines', 'Pasir Ris', 'Changi Village'],
        popularLocalities: ['Our Tampines Hub (OTH)', 'Century Square Dining', 'Changi Village Hawker Centre', 'Downtown East'],
        centroid: { lat: 1.3532, lng: 103.9452 },
      },
    ],
  },
  {
    code: 'SG-NER',
    name: 'North-East Region',
    areas: [
      {
        name: 'Ang Mo Kio & Serangoon',
        tier: 'tier_1',
        cities: ['Ang Mo Kio', 'Serangoon', 'Serangoon Gardens', 'Bishan'],
        popularLocalities: ['Chomp Chomp Food Centre', 'myVillage Serangoon Gardens', 'AMK Hub Food Street', 'Junction 8 Bishan'],
        centroid: { lat: 1.3554, lng: 103.8679 },
      },
      {
        name: 'Hougang, Sengkang & Punggol',
        tier: 'tier_2',
        cities: ['Hougang', 'Sengkang', 'Punggol'],
        popularLocalities: ['Punggol Settlement Waterfront', 'Waterway Point Dining', 'Compass One Sengkang'],
        centroid: { lat: 1.3917, lng: 103.8954 },
      },
    ],
  },
  {
    code: 'SG-NR',
    name: 'North Region',
    areas: [
      {
        name: 'Woodlands & Yishun',
        tier: 'tier_2',
        cities: ['Woodlands', 'Yishun', 'Sembawang'],
        popularLocalities: ['Causeway Point Woodlands', 'Chong Pang City Hawker Centre', 'Northpoint City Yishun'],
        centroid: { lat: 1.4382, lng: 103.7891 },
      },
    ],
  },
  {
    code: 'SG-WR',
    name: 'West Region',
    areas: [
      {
        name: 'Jurong & Clementi',
        tier: 'tier_1',
        cities: ['Jurong East', 'Clementi', 'Jurong West', 'Buona Vista (One-North)'],
        popularLocalities: ['Jem/Westgate Dining Strip', 'Holland Village Singapore', 'Rochester Park Dining', 'Clementi 448 Food Centre'],
        centroid: { lat: 1.3329, lng: 103.7436 },
      },
      {
        name: 'Bukit Batok & Choa Chu Kang',
        tier: 'tier_2',
        cities: ['Bukit Batok', 'Choa Chu Kang', 'Bukit Panjang'],
        popularLocalities: ['West Mall Bukit Batok', 'Lot One Choa Chu Kang', 'Hillion Mall Dining'],
        centroid: { lat: 1.3590, lng: 103.7519 },
      },
    ],
  },
];
