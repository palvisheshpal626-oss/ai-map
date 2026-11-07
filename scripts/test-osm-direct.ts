async function testLucknow() {
  const userAgent = 'RestaurantLeadFinder/2.0 (+https://restaurantleadfinder.local; contact@restaurantleadfinder.local)';
  
  // 1. Nominatim for Lucknow
  console.log('1. Testing Nominatim for Lucknow...');
  const nomUrl = 'https://nominatim.openstreetmap.org/search?q=Restaurant%20in%20Lucknow%2C%20Uttar%20Pradesh%2C%20India&countrycodes=in&format=json&addressdetails=1&extratags=1&limit=50';
  const start1 = Date.now();
  const res1 = await fetch(nomUrl, { headers: { 'User-Agent': userAgent } });
  console.log('Nominatim Lucknow status:', res1.status, `(${Date.now() - start1}ms)`);
  if (res1.ok) {
    const data1 = await res1.json();
    console.log('Nominatim items:', data1.length, 'Sample:', data1[0]?.name);
  }

  // 2. OSM direct for Ranikhet (delta 0.03)
  console.log('\n2. Testing OSM direct for Ranikhet...');
  const rLat = 29.6434;
  const rLon = 79.4322;
  const rDelta = 0.03;
  const osmUrl = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${rLon - rDelta},${rLat - rDelta},${rLon + rDelta},${rLat + rDelta}`;
  const start2 = Date.now();
  const res2 = await fetch(osmUrl, { headers: { 'User-Agent': userAgent } });
  console.log('OSM direct Ranikhet status:', res2.status, `(${Date.now() - start2}ms)`);
  if (res2.ok) {
    const data2 = await res2.json();
    const hotels = data2.elements?.filter((e: any) => e.tags?.amenity === 'restaurant' || e.tags?.tourism === 'hotel' || e.tags?.tourism === 'guest_house');
    console.log('Ranikhet items:', hotels?.length, 'Sample:', hotels?.[0]?.tags?.name);
  }
}

testLucknow();
