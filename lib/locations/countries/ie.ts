// lib/locations/countries/ie.ts
// Administrative Geography & City Registry for Ireland (IE / IRL)
// Structured as Country -> Province -> County -> City / Town -> Quarter
// Source: Central Statistics Office (CSO) Ireland & Tailte Eireann (OSI)
// Licensing: Creative Commons Attribution 4.0 International (CC BY 4.0)

export interface IECounty {
  name: string;
  countySeat: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  cities: string[];
  popularLocalities: string[];
  centroid: { lat: number; lng: number };
}

export interface IEProvince {
  code: string;
  name: string;
  counties: IECounty[];
}

export const IRELAND_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // Leinster
  'dublin': { lat: 53.3498, lng: -6.2603 },
  'drogheda': { lat: 53.7179, lng: -6.3561 },
  'dundalk': { lat: 54.0039, lng: -6.4022 },
  'bray': { lat: 53.2009, lng: -6.1111 },
  'navan': { lat: 53.6528, lng: -6.6814 },
  'kilkenny': { lat: 52.6541, lng: -7.2448 },
  'naas': { lat: 53.2198, lng: -6.6669 },
  'wexford': { lat: 52.3369, lng: -6.4633 },
  'athlone': { lat: 53.4239, lng: -7.9407 },

  // Munster
  'cork': { lat: 51.8985, lng: -8.4756 },
  'limerick': { lat: 52.6638, lng: -8.6267 },
  'waterford': { lat: 52.2593, lng: -7.1101 },
  'tralee': { lat: 52.2704, lng: -9.7026 },
  'killarney': { lat: 52.0599, lng: -9.5044 },
  'ennis': { lat: 52.8436, lng: -8.9863 },
  'clonmel': { lat: 52.3550, lng: -7.7039 },

  // Connacht
  'galway': { lat: 53.2707, lng: -9.0568 },
  'sligo': { lat: 54.2766, lng: -8.4761 },
  'castlebar': { lat: 53.8540, lng: -9.2980 },
  'westport': { lat: 53.8000, lng: -9.5167 },

  // Ulster (ROI)
  'letterkenny': { lat: 54.9546, lng: -7.7340 },
  'cavan': { lat: 53.9908, lng: -7.3606 },
  'monaghan': { lat: 54.2486, lng: -6.9697 },
};

export const IRELAND_PROVINCES: IEProvince[] = [
  {
    code: 'LBN',
    name: 'Leinster',
    counties: [
      {
        name: 'County Dublin',
        countySeat: 'Dublin',
        tier: 'tier_1',
        cities: ['Dublin', 'Dun Laoghaire', 'Swords', 'Malahide', 'Howth', 'Blackrock'],
        popularLocalities: ['Temple Bar Cultural Quarter', 'Grafton Street & South William St', 'Capel Street (Pedestrian Dining)', 'Camden Street / Portobello', 'Ranelagh Village', 'Howth Harbour Seafood Strip'],
        centroid: { lat: 53.3498, lng: -6.2603 },
      },
      {
        name: 'County Kildare & Meath',
        countySeat: 'Naas',
        tier: 'tier_1',
        cities: ['Naas', 'Newbridge', 'Maynooth', 'Navan', 'Trim'],
        popularLocalities: ['Main Street Naas', 'Maynooth University Avenue', 'Navan Market Square'],
        centroid: { lat: 53.2198, lng: -6.6669 },
      },
      {
        name: 'County Louth & Wicklow',
        countySeat: 'Dundalk',
        tier: 'tier_2',
        cities: ['Drogheda', 'Dundalk', 'Bray', 'Greystones'],
        popularLocalities: ['Bray Seafront Promenade', 'West Street Drogheda', 'Church Street Greystones'],
        centroid: { lat: 53.7179, lng: -6.3561 },
      },
      {
        name: 'County Kilkenny & Wexford',
        countySeat: 'Kilkenny',
        tier: 'tier_2',
        cities: ['Kilkenny', 'Wexford', 'Enniscorthy', 'New Ross'],
        popularLocalities: ['Medieval Mile Kilkenny (High Street)', 'John Street Kilkenny', 'Wexford Main Street'],
        centroid: { lat: 52.6541, lng: -7.2448 },
      },
    ],
  },
  {
    code: 'MUN',
    name: 'Munster',
    counties: [
      {
        name: 'County Cork',
        countySeat: 'Cork',
        tier: 'tier_1',
        cities: ['Cork', 'Kinsale', 'Cobh', 'Midleton', 'Clonakilty'],
        popularLocalities: ['English Market Cork', 'Oliver Plunkett Street', 'MacCurtain Street (Victorian Quarter)', 'Kinsale Gourmet Capital (Main St)'],
        centroid: { lat: 51.8985, lng: -8.4756 },
      },
      {
        name: 'County Limerick & Clare',
        countySeat: 'Limerick',
        tier: 'tier_1',
        cities: ['Limerick', 'Ennis', 'Shannon'],
        popularLocalities: ['O\'Connell Street Limerick', 'Medieval Quarter / King John Castle', 'Ennis Abbey Street'],
        centroid: { lat: 52.6638, lng: -8.6267 },
      },
      {
        name: 'County Kerry & Waterford',
        countySeat: 'Tralee',
        tier: 'tier_2',
        cities: ['Killarney', 'Tralee', 'Waterford', 'Dungarvan'],
        popularLocalities: ['High Street Killarney', 'Viking Triangle Waterford', 'Dungarvan Harbour'],
        centroid: { lat: 52.0599, lng: -9.5044 },
      },
    ],
  },
  {
    code: 'CON',
    name: 'Connacht',
    counties: [
      {
        name: 'County Galway',
        countySeat: 'Galway',
        tier: 'tier_1',
        cities: ['Galway', 'Salthill', 'Tuam', 'Clifden'],
        popularLocalities: ['Quay Street / Latin Quarter', 'Shop Street Galway', 'Salthill Promenade', 'Westend Galway (Dominick St)'],
        centroid: { lat: 53.2707, lng: -9.0568 },
      },
      {
        name: 'County Mayo & Sligo',
        countySeat: 'Castlebar',
        tier: 'tier_2',
        cities: ['Sligo', 'Castlebar', 'Westport', 'Ballina'],
        popularLocalities: ['Westport Octagon / Bridge St', 'O\'Connell Street Sligo', 'Castlebar Main Street'],
        centroid: { lat: 54.2766, lng: -8.4761 },
      },
    ],
  },
  {
    code: 'ULS',
    name: 'Ulster (Republic of Ireland)',
    counties: [
      {
        name: 'County Donegal, Cavan & Monaghan',
        countySeat: 'Letterkenny',
        tier: 'tier_2',
        cities: ['Letterkenny', 'Cavan', 'Monaghan', 'Bundoran'],
        popularLocalities: ['Main Street Letterkenny', 'Cavan Town Centre Market Square', 'Monaghan Diamond Precinct'],
        centroid: { lat: 54.9546, lng: -7.7340 },
      },
    ],
  },
];
