async function testMirrors() {
  const mirrors = [
    'https://overpass.osm.ch/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  const userAgent = 'RestaurantLeadFinder/2.0 (+https://restaurantleadfinder.local; contact@restaurantleadfinder.local)';
  // Quick test query for Ranikhet (lat 29.6434, lng 79.4322)
  const delta = 0.05;
  const lat = 29.6434;
  const lng = 79.4322;
  const bbox = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`;
  const q = `[out:json][timeout:25];(node["tourism"~"hotel|guest_house"](${bbox});node["amenity"~"restaurant|cafe"](${bbox}););out center 20;`;

  for (const m of mirrors) {
    const start = Date.now();
    try {
      // POST with form urlencoded is the official high-reliability standard for Overpass API
      const res = await fetch(m, {
        method: 'POST',
        headers: {
          'User-Agent': userAgent,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'application/json',
        },
        body: `data=${encodeURIComponent(q)}`,
        signal: AbortSignal.timeout(15000),
      });
      const latency = Date.now() - start;
      console.log(`Mirror: ${m} -> Status: ${res.status} (${latency}ms)`);
      if (res.ok) {
        const d = await res.json();
        console.log(`   SUCCESS: ${d.elements?.length} elements returned!`);
        if (d.elements?.length > 0) {
          console.log('   Sample:', d.elements.slice(0, 3).map((e: any) => e.tags?.name || e.tags?.tourism));
        }
      } else {
        console.log(`   Error status: ${res.statusText}`);
      }
    } catch (e: any) {
      console.log(`Mirror: ${m} -> Failed: ${e.message}`);
    }
  }
}

testMirrors();

