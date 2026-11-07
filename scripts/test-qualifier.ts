import { verifyCandidateWithAudit } from '../lib/qualification/qualifier';
import { SearchConfig, Restaurant } from '../lib/types';

const config: SearchConfig = {
  id: 'cfg-almora',
  name: 'Almora Hospitality',
  provider_id: 'osm_overpass',
  selected_country: 'IN',
  selected_district: { state: 'Uttarakhand', district: 'Almora' },
  selected_locations: ['city-uttarakhand-almora-ranikhet'],
  categories: ['Restaurant', 'Hotel'],
  rating_filters: { min: 1.0, include_unrated: true },
  review_filters: { min: 0, include_zero: true },
  contact_filters: { phone: 'optional', phone_filter: 'all', website_filter: 'all' },
  limits: { max_records_per_location: 50, max_total_records: 100 },
};

const candidate: Partial<Restaurant> = {
  id: 'osm-node-123456',
  business_name: 'Hotel Mayur',
  category: 'Hotel',
  state: 'Uttarakhand',
  district: 'Almora',
  city: 'Ranikhet',
  country: 'India',
  latitude: 29.6434,
  longitude: 79.4322,
  maps_url: 'https://www.openstreetmap.org/node/123456',
  source_provider: 'osm_overpass',
  source_record_id: 'osm-node-123456',
  rating: null,
  review_count: null,
};

const res = verifyCandidateWithAudit(candidate, config, {
  cityName: 'Ranikhet',
  districtName: 'Almora',
  stateName: 'Uttarakhand',
  country: 'India',
  providerId: 'osm_overpass',
});

console.log('Qualification status:', res.status);
console.log('Primary reason:', res.primaryRejectionReason);
console.log('Checks:', res.auditChecks.map(c => ({ name: c.check_name, status: c.status, evidence: c.evidence })));
