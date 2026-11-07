// lib/locations/countries/gb.ts
// Administrative Geography & City Registry for the United Kingdom (GB / GBR)
// Structured as Country -> Region / Nation -> County / Council Area -> City / Town -> Borough / Quarter
// Source: Office for National Statistics (ONS) Open Geography Portal & Ordnance Survey
// Licensing: Open Government Licence (OGL v3.0) / Open Database License (ODbL)

export interface UKCounty {
  name: string;
  countySeat: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  cities: string[];
  popularLocalities: string[];
  centroid: { lat: number; lng: number };
}

export interface UKRegion {
  code: string; // e.g. 'ENG-LDN', 'ENG-SE', 'ENG-NW', 'SCT', 'WLS', 'NIR'
  name: string;
  capital: string;
  type: 'constituent_country' | 'region';
  counties: UKCounty[];
}

export const UK_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // London
  'london': { lat: 51.5074, lng: -0.1278 },
  'city of london': { lat: 51.5155, lng: -0.0922 },
  'westminster': { lat: 51.4975, lng: -0.1357 },
  'camden': { lat: 51.5429, lng: -0.1426 },
  'southwark': { lat: 51.5034, lng: -0.0877 },
  'islington': { lat: 51.5416, lng: -0.1022 },
  'kensington and chelsea': { lat: 51.5020, lng: -0.1947 },
  'hackney': { lat: 51.5450, lng: -0.0553 },
  'greenwich': { lat: 51.4826, lng: 0.0077 },

  // West Midlands
  'birmingham': { lat: 52.4862, lng: -1.8904 },
  'coventry': { lat: 52.4068, lng: -1.5197 },
  'wolverhampton': { lat: 52.5862, lng: -2.1288 },
  'solihull': { lat: 52.4128, lng: -1.7782 },

  // North West
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'salford': { lat: 53.4875, lng: -2.2901 },
  'liverpool': { lat: 53.4084, lng: -2.9916 },
  'bolton': { lat: 53.5769, lng: -2.4282 },
  'stockport': { lat: 53.4106, lng: -2.1575 },
  'preston': { lat: 53.7632, lng: -2.7031 },
  'chester': { lat: 53.1905, lng: -2.8916 },

  // Yorkshire
  'leeds': { lat: 53.8008, lng: -1.5491 },
  'sheffield': { lat: 53.3811, lng: -1.4701 },
  'bradford': { lat: 53.7960, lng: -1.7594 },
  'york': { lat: 53.9591, lng: -1.0815 },
  'hull': { lat: 53.7457, lng: -0.3367 },
  'halifax': { lat: 53.7248, lng: -1.8617 },

  // South West
  'bristol': { lat: 51.4545, lng: -2.5879 },
  'bath': { lat: 51.3811, lng: -2.3590 },
  'plymouth': { lat: 50.3755, lng: -4.1427 },
  'exeter': { lat: 50.7184, lng: -3.5339 },

  // South East
  'brighton': { lat: 50.8225, lng: -0.1372 },
  'oxford': { lat: 51.7520, lng: -1.2577 },
  'southampton': { lat: 50.9097, lng: -1.4044 },
  'portsmouth': { lat: 50.8198, lng: -1.0880 },
  'reading uk': { lat: 51.4543, lng: -0.9781 },
  'hastings': { lat: 50.8552, lng: 0.5729 },

  // East of England
  'cambridge': { lat: 52.2053, lng: 0.1218 },
  'norwich': { lat: 52.6309, lng: 1.2974 },
  'colchester': { lat: 51.8959, lng: 0.8919 },
  'luton': { lat: 51.8787, lng: -0.4200 },

  // East Midlands
  'nottingham': { lat: 52.9548, lng: -1.1581 },
  'leicester': { lat: 52.6369, lng: -1.1398 },
  'derby': { lat: 52.9225, lng: -1.4746 },

  // North East
  'newcastle upon tyne': { lat: 54.9783, lng: -1.6178 },
  'sunderland': { lat: 54.9069, lng: -1.3838 },
  'durham': { lat: 54.7753, lng: -1.5849 },
  'middlesbrough': { lat: 54.5742, lng: -1.2350 },

  // Scotland
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'glasgow': { lat: 55.8642, lng: -4.2518 },
  'aberdeen': { lat: 57.1497, lng: -2.0943 },
  'dundee': { lat: 56.4620, lng: -2.9707 },
  'inverness': { lat: 57.4778, lng: -4.2247 },
  'perth': { lat: 56.3950, lng: -3.4308 },

  // Wales
  'cardiff': { lat: 51.4816, lng: -3.1791 },
  'swansea': { lat: 51.6214, lng: -3.9436 },
  'newport': { lat: 51.5842, lng: -2.9977 },
  'wrexham': { lat: 53.0430, lng: -2.9925 },

  // Northern Ireland
  'belfast': { lat: 54.5973, lng: -5.9301 },
  'derry': { lat: 54.9966, lng: -7.3086 },
  'lisburn': { lat: 54.5162, lng: -6.0594 },
};

export const UK_REGIONS: UKRegion[] = [
  {
    code: 'ENG-LDN',
    name: 'Greater London',
    capital: 'London',
    type: 'region',
    counties: [
      {
        name: 'Central London',
        countySeat: 'City of London & Westminster',
        tier: 'tier_1',
        cities: ['City of London', 'Westminster', 'Holborn', 'Bloomsbury', 'Mayfair', 'Marylebone', 'Soho', 'Covent Garden'],
        popularLocalities: ['Soho Dining Quarter', 'Covent Garden Piazza', 'Chinatown London', 'Fitzrovia', 'Mayfair Fine Dining', 'Strand'],
        centroid: { lat: 51.5074, lng: -0.1278 },
      },
      {
        name: 'Camden & North London',
        countySeat: 'Camden Town',
        tier: 'tier_1',
        cities: ['Camden Town', 'Islington', 'Hampstead', 'Highgate', 'Kings Cross'],
        popularLocalities: ['Camden Lock Market', 'Upper Street Islington', 'Granary Square Kings Cross'],
        centroid: { lat: 51.5429, lng: -0.1426 },
      },
      {
        name: 'Southwark & South Bank',
        countySeat: 'Southwark',
        tier: 'tier_1',
        cities: ['Southwark', 'Bermondsey', 'Lambeth', 'Brixton', 'Clapham'],
        popularLocalities: ['Borough Market', 'Bermondsey Street', 'South Bank Promenade', 'Brixton Village'],
        centroid: { lat: 51.5034, lng: -0.0877 },
      },
      {
        name: 'East London & Docklands',
        countySeat: 'Tower Hamlets',
        tier: 'tier_1',
        cities: ['Shoreditch', 'Whitechapel', 'Canary Wharf', 'Stratford', 'Hackney'],
        popularLocalities: ['Brick Lane (Curry Mile)', 'Spitalfields Market', 'Shoreditch High Street', 'Broadway Market'],
        centroid: { lat: 51.5200, lng: -0.0700 },
      },
      {
        name: 'Kensington & West London',
        countySeat: 'Kensington',
        tier: 'tier_1',
        cities: ['Kensington', 'Chelsea', 'Notting Hill', 'Hammersmith', 'Fulham', 'Richmond'],
        popularLocalities: ['King Road Chelsea', 'Portobello Road Notting Hill', 'Richmond Riverside'],
        centroid: { lat: 51.5020, lng: -0.1947 },
      },
    ],
  },
  {
    code: 'ENG-NW',
    name: 'North West England',
    capital: 'Manchester & Liverpool',
    type: 'region',
    counties: [
      {
        name: 'Greater Manchester',
        countySeat: 'Manchester',
        tier: 'tier_1',
        cities: ['Manchester', 'Salford', 'Bolton', 'Stockport', 'Oldham', 'Rochdale', 'Wigan'],
        popularLocalities: ['Northern Quarter', 'Spinningfields', 'Ancoats (Little Italy)', 'Deansgate', 'Rusholme (Curry Mile)', 'MediaCityUK'],
        centroid: { lat: 53.4808, lng: -2.2426 },
      },
      {
        name: 'Merseyside',
        countySeat: 'Liverpool',
        tier: 'tier_1',
        cities: ['Liverpool', 'St Helens', 'Southport', 'Birkenhead'],
        popularLocalities: ['Albert Dock', 'Ropewalks (Bold Street)', 'Baltic Triangle', 'Hope Street'],
        centroid: { lat: 53.4084, lng: -2.9916 },
      },
      {
        name: 'Lancashire',
        countySeat: 'Preston',
        tier: 'tier_2',
        cities: ['Preston', 'Blackpool', 'Lancaster', 'Blackburn', 'Burnley'],
        popularLocalities: ['Preston Docks', 'Lancaster Historic Core'],
        centroid: { lat: 53.7632, lng: -2.7031 },
      },
    ],
  },
  {
    code: 'ENG-WM',
    name: 'West Midlands',
    capital: 'Birmingham',
    type: 'region',
    counties: [
      {
        name: 'West Midlands Metropolitan County',
        countySeat: 'Birmingham',
        tier: 'tier_1',
        cities: ['Birmingham', 'Coventry', 'Wolverhampton', 'Solihull', 'Dudley', 'Walsall'],
        popularLocalities: ['Balti Triangle', 'Jewellery Quarter', 'Colmore Business District', 'Digbeth (Custard Factory)', 'Brindleyplace'],
        centroid: { lat: 52.4862, lng: -1.8904 },
      },
      {
        name: 'Warwickshire',
        countySeat: 'Warwick',
        tier: 'tier_2',
        cities: ['Warwick', 'Royal Leamington Spa', 'Stratford-upon-Avon', 'Rugby'],
        popularLocalities: ['Leamington Parade', 'Stratford Historic Quarter'],
        centroid: { lat: 52.2823, lng: -1.5849 },
      },
    ],
  },
  {
    code: 'ENG-YH',
    name: 'Yorkshire and the Humber',
    capital: 'Leeds & Sheffield',
    type: 'region',
    counties: [
      {
        name: 'West Yorkshire',
        countySeat: 'Leeds',
        tier: 'tier_1',
        cities: ['Leeds', 'Bradford', 'Wakefield', 'Huddersfield', 'Halifax'],
        popularLocalities: ['Call Lane (Leeds Nightlife)', 'Briggate Corridor', 'Victoria Gate', 'Bradford Curry Quarter'],
        centroid: { lat: 53.8008, lng: -1.5491 },
      },
      {
        name: 'South Yorkshire',
        countySeat: 'Sheffield',
        tier: 'tier_1',
        cities: ['Sheffield', 'Doncaster', 'Rotherham', 'Barnsley'],
        popularLocalities: ['Kelham Island', 'Ecclesall Road', 'Devonshire Quarter'],
        centroid: { lat: 53.3811, lng: -1.4701 },
      },
      {
        name: 'North Yorkshire',
        countySeat: 'Northallerton / York',
        tier: 'tier_2',
        cities: ['York', 'Harrogate', 'Scarborough', 'Ripon'],
        popularLocalities: ['The Shambles York', 'Harrogate Montpellier Quarter'],
        centroid: { lat: 53.9591, lng: -1.0815 },
      },
    ],
  },
  {
    code: 'ENG-SW',
    name: 'South West England',
    capital: 'Bristol',
    type: 'region',
    counties: [
      {
        name: 'Bristol & Bath Area',
        countySeat: 'Bristol',
        tier: 'tier_1',
        cities: ['Bristol', 'Bath', 'Weston-super-Mare'],
        popularLocalities: ['Clifton Village', 'Bristol Harbourside', 'Gloucester Road', 'Bath Milsom Street'],
        centroid: { lat: 51.4545, lng: -2.5879 },
      },
      {
        name: 'Devon',
        countySeat: 'Exeter',
        tier: 'tier_2',
        cities: ['Plymouth', 'Exeter', 'Torquay', 'Exmouth'],
        popularLocalities: ['Exeter Quay', 'Plymouth Barbican', 'Torquay Harbour'],
        centroid: { lat: 50.7184, lng: -3.5339 },
      },
    ],
  },
  {
    code: 'ENG-SE',
    name: 'South East England',
    capital: 'Guildford / Oxford',
    type: 'region',
    counties: [
      {
        name: 'Brighton & Hove (East Sussex)',
        countySeat: 'Brighton',
        tier: 'tier_1',
        cities: ['Brighton', 'Hove', 'Eastbourne', 'Hastings'],
        popularLocalities: ['The Lanes Brighton', 'North Laine', 'Brighton Seafront'],
        centroid: { lat: 50.8225, lng: -0.1372 },
      },
      {
        name: 'Oxfordshire',
        countySeat: 'Oxford',
        tier: 'tier_1',
        cities: ['Oxford', 'Banbury', 'Abingdon', 'Bicester'],
        popularLocalities: ['Jericho Oxford', 'Cowley Road', 'High Street Oxford', 'Bicester Village Dining'],
        centroid: { lat: 51.7520, lng: -1.2577 },
      },
      {
        name: 'Hampshire',
        countySeat: 'Winchester',
        tier: 'tier_2',
        cities: ['Southampton', 'Portsmouth', 'Winchester', 'Basingstoke'],
        popularLocalities: ['Southampton Oxford Street', 'Gunwharf Quays Portsmouth', 'Winchester High Street'],
        centroid: { lat: 50.9097, lng: -1.4044 },
      },
    ],
  },
  {
    code: 'ENG-EE',
    name: 'East of England',
    capital: 'Cambridge / Chelmsford',
    type: 'region',
    counties: [
      {
        name: 'Cambridgeshire',
        countySeat: 'Cambridge',
        tier: 'tier_1',
        cities: ['Cambridge', 'Peterborough', 'Ely', 'Huntingdon'],
        popularLocalities: ['Mill Road Cambridge', 'Bridge Street / Quayside', 'Peterborough Cathedral Square'],
        centroid: { lat: 52.2053, lng: 0.1218 },
      },
      {
        name: 'Norfolk & Suffolk',
        countySeat: 'Norwich',
        tier: 'tier_2',
        cities: ['Norwich', 'Ipswich', 'Bury St Edmunds', 'King Lynn'],
        popularLocalities: ['Norwich Lanes', 'Tombland', 'Ipswich Waterfront'],
        centroid: { lat: 52.6309, lng: 1.2974 },
      },
    ],
  },
  {
    code: 'ENG-EM',
    name: 'East Midlands',
    capital: 'Nottingham',
    type: 'region',
    counties: [
      {
        name: 'Nottinghamshire & Derbyshire',
        countySeat: 'Nottingham',
        tier: 'tier_1',
        cities: ['Nottingham', 'Derby', 'Mansfield', 'Chesterfield'],
        popularLocalities: ['Lace Market Nottingham', 'Hockley Creative Quarter', 'Derby Cathedral Quarter'],
        centroid: { lat: 52.9548, lng: -1.1581 },
      },
      {
        name: 'Leicestershire',
        countySeat: 'Leicester',
        tier: 'tier_1',
        cities: ['Leicester', 'Loughborough', 'Hinckley', 'Melton Mowbray'],
        popularLocalities: ['Belgrave Road (Golden Mile)', 'Cultural Quarter Leicester', 'St Martins Square'],
        centroid: { lat: 52.6369, lng: -1.1398 },
      },
    ],
  },
  {
    code: 'ENG-NE',
    name: 'North East England',
    capital: 'Newcastle upon Tyne',
    type: 'region',
    counties: [
      {
        name: 'Tyne and Wear',
        countySeat: 'Newcastle upon Tyne',
        tier: 'tier_1',
        cities: ['Newcastle upon Tyne', 'Sunderland', 'Gateshead', 'South Shields', 'Tynemouth'],
        popularLocalities: ['Newcastle Quayside', 'Grey Street Corridor', 'Ouseburn Cultural Valley', 'Jesmond Osborne Road'],
        centroid: { lat: 54.9783, lng: -1.6178 },
      },
      {
        name: 'County Durham & Tees Valley',
        countySeat: 'Durham',
        tier: 'tier_2',
        cities: ['Durham', 'Darlington', 'Middlesbrough', 'Stockton-on-Tees', 'Hartlepool'],
        popularLocalities: ['Durham Market Place', 'Baker & Bedford Street Middlesbrough'],
        centroid: { lat: 54.7753, lng: -1.5849 },
      },
    ],
  },
  {
    code: 'SCT',
    name: 'Scotland',
    capital: 'Edinburgh',
    type: 'constituent_country',
    counties: [
      {
        name: 'City of Edinburgh',
        countySeat: 'Edinburgh',
        tier: 'tier_1',
        cities: ['Edinburgh', 'Leith', 'South Queensferry'],
        popularLocalities: ['Royal Mile / Old Town', 'New Town (George Street)', 'The Shore Leith (Michelin Strip)', 'Stockbridge', 'Grassmarket'],
        centroid: { lat: 55.9533, lng: -3.1883 },
      },
      {
        name: 'Glasgow City & Clyde Valley',
        countySeat: 'Glasgow',
        tier: 'tier_1',
        cities: ['Glasgow', 'Paisley', 'East Kilbride', 'Cumbernauld'],
        popularLocalities: ['West End (Byres Road / Ashton Lane)', 'Merchant City', 'Finnieston Dining Strip', 'Buchanan Street Corridor'],
        centroid: { lat: 55.8642, lng: -4.2518 },
      },
      {
        name: 'Aberdeenshire & Dundee',
        countySeat: 'Aberdeen',
        tier: 'tier_2',
        cities: ['Aberdeen', 'Dundee', 'Inverness', 'Perth', 'Stirling'],
        popularLocalities: ['Union Street Aberdeen', 'Dundee Waterfront (V&A)', 'Inverness River Ness Strip'],
        centroid: { lat: 57.1497, lng: -2.0943 },
      },
    ],
  },
  {
    code: 'WLS',
    name: 'Wales',
    capital: 'Cardiff',
    type: 'constituent_country',
    counties: [
      {
        name: 'South Wales Glamorgan & Gwent',
        countySeat: 'Cardiff',
        tier: 'tier_1',
        cities: ['Cardiff', 'Swansea', 'Newport', 'Barry', 'Penarth'],
        popularLocalities: ['Cardiff Bay Waterfront', 'Cardiff City Centre (St Mary St / Arcades)', 'Pontcanna Dining Corridor', 'Swansea Marina & Mumbles'],
        centroid: { lat: 51.4816, lng: -3.1791 },
      },
      {
        name: 'North & West Wales',
        countySeat: 'Wrexham',
        tier: 'tier_2',
        cities: ['Wrexham', 'Bangor', 'Conwy', 'Llandudno', 'Aberystwyth'],
        popularLocalities: ['Wrexham High Street', 'Llandudno Promenade', 'Conwy Quay'],
        centroid: { lat: 53.0430, lng: -2.9925 },
      },
    ],
  },
  {
    code: 'NIR',
    name: 'Northern Ireland',
    capital: 'Belfast',
    type: 'constituent_country',
    counties: [
      {
        name: 'Greater Belfast',
        countySeat: 'Belfast',
        tier: 'tier_1',
        cities: ['Belfast', 'Lisburn', 'Bangor NI', 'Castlereagh'],
        popularLocalities: ['Cathedral Quarter', 'Titanic Quarter', 'Queen Quarter', 'Belfast City Hall Precinct'],
        centroid: { lat: 54.5973, lng: -5.9301 },
      },
      {
        name: 'Derry and Strabane',
        countySeat: 'Derry',
        tier: 'tier_2',
        cities: ['Derry', 'Strabane'],
        popularLocalities: ['Walled City Derry', 'Waterloo Street Music & Dining Corridor', 'Ebrington Square'],
        centroid: { lat: 54.9966, lng: -7.3086 },
      },
    ],
  },
];
