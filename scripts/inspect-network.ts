async function inspectProvider() {
  const malihabadLat = 26.9213;
  const malihabadLng = 80.7107;
  const userAgent = 'RestaurantLeadFinder/2.0 (+https://restaurantleadfinder.local; contact@restaurantleadfinder.local)';

  // Let's test with delta 0.08 (~8.8km radius) which covers Malihabad town, its railway station, and the Hardoi-Lucknow state highway bypass
  const delta = 0.08;
  const bbox = `${malihabadLat - delta},${malihabadLng - delta},${malihabadLat + delta},${malihabadLng + delta}`;
  console.log('Querying Malihabad bbox:', bbox);
  
  const q = `[out:json][timeout:15];(
    node["amenity"~"restaurant|cafe|fast_food|food_court|ice_cream|pub|bar|dhaba|tea"](${bbox});
    way["amenity"~"restaurant|cafe|fast_food|food_court|ice_cream|pub|bar|dhaba|tea"](${bbox});
    node["tourism"~"hotel|guest_house|motel|resort"](${bbox});
    way["tourism"~"hotel|guest_house|motel|resort"](${bbox});
    node["shop"~"bakery|confectionery|pastry|sweets"](${bbox});
    way["shop"~"bakery|confectionery|pastry|sweets"](${bbox});
  );out center 50;`;

  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, {
    headers: { 'User-Agent': userAgent }
  });
  if (res.ok) {
    const d = await res.json();
    console.log('Total food/hospitality elements in Malihabad bbox (delta 0.08):', d.elements?.length);
    if (d.elements?.length > 0) {
      console.log('Elements:', d.elements.map((e: any) => ({ name: e.tags?.name, amenity: e.tags?.amenity, shop: e.tags?.shop })));
    }
  }

  // Also test Lucknow city center to see Overpass response
  console.log('\n--- Testing Lucknow center (26.8467, 80.9462) ---');
  const lBbox = `26.80,80.90,26.90,81.00`;
  const lQ = `[out:json][timeout:15];(node["amenity"~"restaurant|cafe"](${lBbox}););out center 10;`;
  const lRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(lQ)}`, {
    headers: { 'User-Agent': userAgent }
  });
  if (lRes.ok) {
    const lD = await lRes.json();
    console.log('Lucknow center elements count:', lD.elements?.length);
    if (lD.elements?.length > 0) {
      console.log('Lucknow sample:', lD.elements.slice(0, 3).map((e: any) => e.tags?.name));
    }
  }
}

inspectProvider();



