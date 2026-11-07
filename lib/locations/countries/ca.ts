// lib/locations/countries/ca.ts
// Administrative Geography & City Registry for Canada (CA / CAN)
// Structured as Country -> Province/Territory -> Census Division / Regional Municipality -> City / Town -> Locality
// Source: Statistics Canada (StatCan) Standard Geographical Classification (SGC)
// Licensing: Statistics Canada Open Licence / ODbL

export interface CADivision {
  name: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  cities: string[];
  popularLocalities: string[];
  centroid: { lat: number; lng: number };
}

export interface CAProvince {
  code: string; // 2-letter postal code, e.g. 'ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'
  name: string;
  capital: string;
  divisions: CADivision[];
}

export const CANADA_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // Ontario
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'ottawa': { lat: 45.4215, lng: -75.6972 },
  'mississauga': { lat: 43.5890, lng: -79.6441 },
  'brampton': { lat: 43.7315, lng: -79.7624 },
  'hamilton': { lat: 43.2557, lng: -79.8711 },
  'london': { lat: 42.9849, lng: -81.2453 },
  'london on': { lat: 42.9849, lng: -81.2453 },
  'cambridge': { lat: 43.3616, lng: -80.3144 },
  'markham': { lat: 43.8561, lng: -79.3370 },
  'vaughan': { lat: 43.8563, lng: -79.5085 },
  'kitchener': { lat: 43.4516, lng: -80.4925 },
  'windsor': { lat: 42.3149, lng: -83.0364 },

  // Quebec
  'montreal': { lat: 45.5017, lng: -73.5673 },
  'quebec city': { lat: 46.8139, lng: -71.2080 },
  'laval': { lat: 45.6066, lng: -73.7124 },
  'gatineau': { lat: 45.4765, lng: -75.7013 },
  'longueuil': { lat: 45.5312, lng: -73.5181 },
  'sherbrooke': { lat: 45.4042, lng: -71.8929 },

  // British Columbia
  'vancouver': { lat: 49.2827, lng: -123.1207 },
  'surrey': { lat: 49.1913, lng: -122.8490 },
  'burnaby': { lat: 49.2488, lng: -122.9805 },
  'richmond bc': { lat: 49.1666, lng: -123.1336 },
  'victoria bc': { lat: 48.4284, lng: -123.3656 },
  'kelowna': { lat: 49.8880, lng: -119.4960 },

  // Alberta
  'calgary': { lat: 51.0447, lng: -114.0719 },
  'edmonton': { lat: 53.5461, lng: -113.4938 },
  'red deer': { lat: 52.2681, lng: -113.8112 },
  'lethbridge': { lat: 49.6956, lng: -112.8451 },
  'fort mcmurray': { lat: 56.7262, lng: -111.3803 },

  // Manitoba
  'winnipeg': { lat: 49.8951, lng: -97.1384 },
  'brandon': { lat: 49.8485, lng: -99.9501 },

  // Saskatchewan
  'saskatoon': { lat: 52.1332, lng: -106.6700 },
  'regina': { lat: 50.4452, lng: -104.6189 },

  // Nova Scotia
  'halifax': { lat: 44.6488, lng: -63.5752 },
  'sydney': { lat: 46.1368, lng: -60.1831 },
  'sydney ns': { lat: 46.1368, lng: -60.1831 },

  // New Brunswick
  'moncton': { lat: 46.0878, lng: -64.7782 },
  'saint john': { lat: 45.2733, lng: -66.0633 },
  'fredericton': { lat: 45.9636, lng: -66.6431 },

  // Newfoundland and Labrador
  'st. johns': { lat: 47.5615, lng: -52.7126 },
  'corner brook': { lat: 48.9500, lng: -57.9500 },

  // Prince Edward Island
  'charlottetown': { lat: 46.2382, lng: -63.1311 },

  // Territories
  'yellowknife': { lat: 62.4540, lng: -114.3718 },
  'whitehorse': { lat: 60.7212, lng: -135.0568 },
  'iqaluit': { lat: 63.7467, lng: -68.5170 },
};

export const CANADA_PROVINCES: CAProvince[] = [
  {
    code: 'ON',
    name: 'Ontario',
    capital: 'Toronto',
    divisions: [
      {
        name: 'City of Toronto (GTA Core)',
        tier: 'tier_1',
        cities: ['Toronto', 'North York', 'Scarborough', 'Etobicoke'],
        popularLocalities: ['Downtown Toronto (Yonge-Dundas)', 'Yorkville Fine Dining', 'King West Entertainment District', 'Queen West / Kensington Market', 'Distillery District', 'Chinatown Toronto'],
        centroid: { lat: 43.6532, lng: -79.3832 },
      },
      {
        name: 'Peel Regional Municipality',
        tier: 'tier_1',
        cities: ['Mississauga', 'Brampton', 'Caledon'],
        popularLocalities: ['Port Credit Mississauga', 'Mississauga City Centre', 'Downtown Brampton'],
        centroid: { lat: 43.5890, lng: -79.6441 },
      },
      {
        name: 'York Regional Municipality',
        tier: 'tier_1',
        cities: ['Markham', 'Vaughan', 'Richmond Hill', 'Newmarket'],
        popularLocalities: ['Downtown Markham (Asian Culinary Hub)', 'Historic Unionville', 'Vaughan Metropolitan Centre'],
        centroid: { lat: 43.8561, lng: -79.3370 },
      },
      {
        name: 'City of Ottawa (National Capital Region)',
        tier: 'tier_1',
        cities: ['Ottawa', 'Kanata', 'Nepean', 'Orleans'],
        popularLocalities: ['ByWard Market', 'Elgin Street Dining Strip', 'Glebe Bank Street', 'Westboro Village'],
        centroid: { lat: 45.4215, lng: -75.6972 },
      },
      {
        name: 'Hamilton & Halton',
        tier: 'tier_2',
        cities: ['Hamilton', 'Burlington', 'Oakville', 'Milton'],
        popularLocalities: ['James Street North Hamilton', 'Downtown Oakville (Lakeshore)', 'Burlington Waterfront'],
        centroid: { lat: 43.2557, lng: -79.8711 },
      },
      {
        name: 'Waterloo & Middlesex',
        tier: 'tier_2',
        cities: ['Kitchener', 'Waterloo', 'Cambridge', 'London'],
        popularLocalities: ['Downtown Kitchener', 'Uptown Waterloo', 'Richmond Row London'],
        centroid: { lat: 43.4516, lng: -80.4925 },
      },
    ],
  },
  {
    code: 'QC',
    name: 'Quebec',
    capital: 'Quebec City',
    divisions: [
      {
        name: 'Agglomeration de Montreal',
        tier: 'tier_1',
        cities: ['Montreal', 'Westmount', 'Dollard-des-Ormeaux', 'Mount Royal'],
        popularLocalities: ['Vieux-Montreal (Old Port)', 'Le Plateau-Mont-Royal', 'Mile End', 'Downtown Montreal (Crescent / Peel)', 'Little Italy Montreal (Jean-Talon)', 'Griffintown'],
        centroid: { lat: 45.5017, lng: -73.5673 },
      },
      {
        name: 'Ville de Quebec (Capitale-Nationale)',
        tier: 'tier_1',
        cities: ['Quebec City', 'Levis', 'Sainte-Foy'],
        popularLocalities: ['Vieux-Quebec (Upper & Lower Town)', 'Rue Saint-Jean', 'Quartier Petit Champlain', 'Saint-Roch'],
        centroid: { lat: 46.8139, lng: -71.2080 },
      },
      {
        name: 'Laval & Monteregie',
        tier: 'tier_2',
        cities: ['Laval', 'Longueuil', 'Brossard', 'Saint-Jean-sur-Richelieu'],
        popularLocalities: ['Quartier DIX30 Brossard', 'Centropolis Laval', 'Vieux-Longueuil'],
        centroid: { lat: 45.6066, lng: -73.7124 },
      },
    ],
  },
  {
    code: 'BC',
    name: 'British Columbia',
    capital: 'Victoria',
    divisions: [
      {
        name: 'Metro Vancouver',
        tier: 'tier_1',
        cities: ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Coquitlam', 'North Vancouver'],
        popularLocalities: ['Yaletown', 'Gastown', 'Robson Street Downtown', 'Kitsilano (West 4th Ave)', 'Golden Village Richmond (Asian Dining)', 'Commercial Drive'],
        centroid: { lat: 49.2827, lng: -123.1207 },
      },
      {
        name: 'Capital Regional District (Vancouver Island)',
        tier: 'tier_1',
        cities: ['Victoria', 'Saanich', 'Langford', 'Sidney'],
        popularLocalities: ['Victoria Inner Harbour', 'Government Street Dining Corridor', 'Chinatown Victoria', 'Cook Street Village'],
        centroid: { lat: 48.4284, lng: -123.3656 },
      },
      {
        name: 'Central Okanagan',
        tier: 'tier_2',
        cities: ['Kelowna', 'West Kelowna', 'Peachland'],
        popularLocalities: ['Downtown Kelowna Waterfront', 'Pandosy Village', 'Mission Hill Wine & Dine Belt'],
        centroid: { lat: 49.8880, lng: -119.4960 },
      },
    ],
  },
  {
    code: 'AB',
    name: 'Alberta',
    capital: 'Edmonton',
    divisions: [
      {
        name: 'Calgary Metropolitan Region',
        tier: 'tier_1',
        cities: ['Calgary', 'Airdrie', 'Cochrane', 'Okotoks'],
        popularLocalities: ['17th Avenue SW (Red Mile)', 'Stephen Avenue Walk', 'Kensington Calgary', 'Inglewood', 'Chinatown Calgary'],
        centroid: { lat: 51.0447, lng: -114.0719 },
      },
      {
        name: 'Edmonton Metropolitan Region',
        tier: 'tier_1',
        cities: ['Edmonton', 'St. Albert', 'Sherwood Park', 'Spruce Grove'],
        popularLocalities: ['Old Strathcona (Whyte Ave)', 'Downtown Edmonton (Ice District)', '124th Street Culinary Strip', 'Oliver / Unity Square'],
        centroid: { lat: 53.5461, lng: -113.4938 },
      },
      {
        name: 'Red Deer & Central Alberta',
        tier: 'tier_2',
        cities: ['Red Deer', 'Lethbridge', 'Medicine Hat'],
        popularLocalities: ['Downtown Red Deer', 'Downtown Lethbridge Square'],
        centroid: { lat: 52.2681, lng: -113.8112 },
      },
    ],
  },
  {
    code: 'MB',
    name: 'Manitoba',
    capital: 'Winnipeg',
    divisions: [
      {
        name: 'Winnipeg Capital Region',
        tier: 'tier_1',
        cities: ['Winnipeg', 'Brandon', 'Steinbach', 'Selkirk'],
        popularLocalities: ['The Forks Waterfront', 'Exchange District', 'Osborne Village', 'Corydon Avenue (Little Italy)'],
        centroid: { lat: 49.8951, lng: -97.1384 },
      },
    ],
  },
  {
    code: 'SK',
    name: 'Saskatchewan',
    capital: 'Regina',
    divisions: [
      {
        name: 'Saskatoon & Regina Regions',
        tier: 'tier_1',
        cities: ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw'],
        popularLocalities: ['Broadway Avenue Saskatoon', 'Downtown Saskatoon (2nd Ave)', 'Cathedral Village Regina', 'Downtown Regina Plaza'],
        centroid: { lat: 52.1332, lng: -106.6700 },
      },
    ],
  },
  {
    code: 'NS',
    name: 'Nova Scotia',
    capital: 'Halifax',
    divisions: [
      {
        name: 'Halifax Regional Municipality',
        tier: 'tier_1',
        cities: ['Halifax', 'Dartmouth', 'Bedford', 'Sydney'],
        popularLocalities: ['Halifax Waterfront Boardwalk', 'Argyle Street Entertainment Strip', 'Spring Garden Road', 'Downtown Dartmouth'],
        centroid: { lat: 44.6488, lng: -63.5752 },
      },
    ],
  },
  {
    code: 'NB',
    name: 'New Brunswick',
    capital: 'Fredericton',
    divisions: [
      {
        name: 'Greater Moncton & Saint John',
        tier: 'tier_2',
        cities: ['Moncton', 'Saint John', 'Fredericton', 'Dieppe'],
        popularLocalities: ['Main Street Moncton', 'Uptown Saint John Market Square', 'Downtown Fredericton (Queen St)'],
        centroid: { lat: 46.0878, lng: -64.7782 },
      },
    ],
  },
  {
    code: 'NL',
    name: 'Newfoundland and Labrador',
    capital: 'St. John\'s',
    divisions: [
      {
        name: 'St. John\'s Metropolitan Area',
        tier: 'tier_2',
        cities: ['St. John\'s', 'Mount Pearl', 'Paradise', 'Corner Brook'],
        popularLocalities: ['George Street (Pub & Music Belt)', 'Water Street Downtown', 'Duckworth Street'],
        centroid: { lat: 47.5615, lng: -52.7126 },
      },
    ],
  },
  {
    code: 'PE',
    name: 'Prince Edward Island',
    capital: 'Charlottetown',
    divisions: [
      {
        name: 'Queens & Prince Counties',
        tier: 'tier_2',
        cities: ['Charlottetown', 'Summerside', 'Stratford'],
        popularLocalities: ['Victoria Row Charlottetown', 'Peake Wharf Waterfront', 'Downtown Summerside'],
        centroid: { lat: 46.2382, lng: -63.1311 },
      },
    ],
  },
  {
    code: 'NT',
    name: 'Northwest Territories',
    capital: 'Yellowknife',
    divisions: [
      {
        name: 'North Slave Region',
        tier: 'tier_3',
        cities: ['Yellowknife', 'Hay River', 'Inuvik'],
        popularLocalities: ['Old Town Yellowknife (Ragged Ass Road)', 'Downtown Franklin Avenue'],
        centroid: { lat: 62.4540, lng: -114.3718 },
      },
    ],
  },
  {
    code: 'YT',
    name: 'Yukon',
    capital: 'Whitehorse',
    divisions: [
      {
        name: 'Whitehorse Area',
        tier: 'tier_3',
        cities: ['Whitehorse', 'Dawson City'],
        popularLocalities: ['Main Street Whitehorse', 'Historic Dawson City Boardwalk'],
        centroid: { lat: 60.7212, lng: -135.0568 },
      },
    ],
  },
  {
    code: 'NU',
    name: 'Nunavut',
    capital: 'Iqaluit',
    divisions: [
      {
        name: 'Qikiqtaaluk Region',
        tier: 'tier_3',
        cities: ['Iqaluit', 'Rankin Inlet'],
        popularLocalities: ['Apostolic & Waterfront Area', 'Four Corners Core'],
        centroid: { lat: 63.7467, lng: -68.5170 },
      },
    ],
  },
];
