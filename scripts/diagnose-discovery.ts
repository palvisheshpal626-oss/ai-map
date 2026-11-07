import { OpenStreetMapOverpassProvider } from '../lib/providers/osm-overpass';
import { findLocationById, findVerifiedCityById } from '../lib/locations/india';
import { store } from '../lib/store/memory-store';
import { ScanWorker } from '../lib/workers/scan-worker';
import { SearchConfig } from '../lib/types';

async function diagnose() {
  console.log('=== DIAGNOSTIC 1: Location Resolution ===');
  const malihabadLoc = findLocationById('city-uttar-pradesh-lucknow-malihabad');
  console.log('Malihabad Location:', malihabadLoc);

  const ranikhetLoc = findLocationById('city-uttarakhand-almora-ranikhet');
  console.log('Ranikhet Location:', ranikhetLoc);

  console.log('\n=== DIAGNOSTIC 2: Direct Provider Query for Malihabad ===');
  const provider = new OpenStreetMapOverpassProvider();

  // Test what ScanWorker builds:
  // locName = loc?.locality || loc?.city || loc?.district || 'Local Area'
  // cityName = loc?.city || locName
  // districtName = loc?.district || cityName
  // stateName = loc?.state || 'State'
  // searchQuery = `${task.category} in ${locName}, ${stateName}, ${targetCountryName}`

  const queryM = `Restaurant in ${malihabadLoc?.city || 'Malihabad'}, ${malihabadLoc?.state || 'Uttar Pradesh'}, India`;
  console.log('Testing query:', queryM, 'lat/lng:', malihabadLoc?.latitude, malihabadLoc?.longitude);

  const resM = await provider.searchBusinesses({
    query: queryM,
    category: 'Restaurant',
    latitude: malihabadLoc?.latitude || undefined,
    longitude: malihabadLoc?.longitude || undefined,
  });
  console.log('Malihabad Result count:', resM.restaurants.length, 'status:', resM.status, 'error:', resM.errorMessage);
  if (resM.restaurants.length > 0) {
    console.log('Sample Malihabad:', resM.restaurants[0].business_name, resM.restaurants[0].formatted_address);
  }

  console.log('\n=== DIAGNOSTIC 3: Direct Provider Query for Ranikhet ===');
  const queryR = `Restaurant in ${ranikhetLoc?.city || 'Ranikhet'}, ${ranikhetLoc?.state || 'Uttarakhand'}, India`;
  console.log('Testing query:', queryR, 'lat/lng:', ranikhetLoc?.latitude, ranikhetLoc?.longitude);

  const resR = await provider.searchBusinesses({
    query: queryR,
    category: 'Restaurant',
    latitude: ranikhetLoc?.latitude || undefined,
    longitude: ranikhetLoc?.longitude || undefined,
  });
  console.log('Ranikhet Result count:', resR.restaurants.length);
  if (resR.restaurants.length > 0) {
    console.log('Sample Ranikhet:', resR.restaurants[0].business_name, resR.restaurants[0].formatted_address);
  }

  console.log('\n=== DIAGNOSTIC 4: Full Scan Campaign Execution for Almora / Ranikhet ===');
  const cfgAlmora: SearchConfig = {
    id: 'cfg-almora-test',
    name: 'Almora Discovery',
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

  const job = store.createJob('Almora Campaign', cfgAlmora, 'osm_overpass');
  console.log('Created job:', job.id, 'Target:', job.selected_district);
  console.log('Queued tasks:', store.getTasksForJob(job.id).length);

  await ScanWorker.runJob(job.id);

  const updatedJob = store.getJobById(job.id);
  console.log('Job status:', updatedJob?.status);
  console.log('Progress counters:', updatedJob?.progress_counters);
  console.log('Diagnostic summary:', updatedJob?.diagnostic_summary);
  const discovered = store.getRestaurantsForRun(job.id);
  console.log('Discovered in run count:', discovered.length);
  if (discovered.length > 0) {
    console.log('Discovered Sample:', discovered.map(r => ({ name: r.business_name, category: r.category, status: r.qualification_status, phone: r.phone_number })));
  }
}

diagnose().catch(err => {
  console.error('Diagnostic error:', err);
});
