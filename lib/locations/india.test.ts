import { describe, it, expect } from 'vitest';
import {
  INDIAN_STATES_AND_UTS,
  getAllIndianStatesAndUTs,
  getNormalizedIndiaLocations,
  searchIndianLocations,
  addCustomLocality,
} from './india';
import { FOOD_SERVICE_CATEGORIES } from '../categories/food-service';

describe('India-Wide Geographic Hierarchy & Category Registry', () => {
  it('contains exactly 28 states and 8 union territories (total 36 entities)', () => {
    const all = getAllIndianStatesAndUTs();
    expect(all).toHaveLength(36);

    const states = all.filter(item => item.type === 'state');
    const uts = all.filter(item => item.type === 'union_territory');

    expect(states).toHaveLength(28);
    expect(uts).toHaveLength(8);

    // Verify key States
    const stateCodes = new Set(states.map(s => s.code));
    expect(stateCodes.has('UP')).toBe(true); // Uttar Pradesh
    expect(stateCodes.has('MH')).toBe(true); // Maharashtra
    expect(stateCodes.has('KA')).toBe(true); // Karnataka
    expect(stateCodes.has('TN')).toBe(true); // Tamil Nadu
    expect(stateCodes.has('GJ')).toBe(true); // Gujarat
    expect(stateCodes.has('WB')).toBe(true); // West Bengal
    expect(stateCodes.has('TS')).toBe(true); // Telangana
    expect(stateCodes.has('KL')).toBe(true); // Kerala
    expect(stateCodes.has('PB')).toBe(true); // Punjab
    expect(stateCodes.has('RJ')).toBe(true); // Rajasthan

    // Verify key Union Territories
    const utCodes = new Set(uts.map(u => u.code));
    expect(utCodes.has('DL')).toBe(true); // Delhi
    expect(utCodes.has('CH')).toBe(true); // Chandigarh
    expect(utCodes.has('JK')).toBe(true); // Jammu & Kashmir
    expect(utCodes.has('LA')).toBe(true); // Ladakh
    expect(utCodes.has('PY')).toBe(true); // Puducherry
    expect(utCodes.has('AN')).toBe(true); // Andaman & Nicobar
  });

  it('normalizes locations into structured GeographicLocation entities', () => {
    const locations = getNormalizedIndiaLocations();
    expect(locations.length).toBeGreaterThan(300);

    // Verify state root
    const upState = locations.find(l => l.id === 'in-up');
    expect(upState).toBeDefined();
    expect(upState?.geographic_type).toBe('state');
    expect(upState?.state).toBe('Uttar Pradesh');

    // Verify district
    const lucknow = locations.find(l => l.id === 'in-up-lucknow');
    expect(lucknow).toBeDefined();
    expect(lucknow?.district).toBe('Lucknow');
    expect(lucknow?.geographic_type).toBe('district');

    // Verify locality
    const gomtiNagar = locations.find(l => l.locality === 'Gomti Nagar');
    expect(gomtiNagar).toBeDefined();
    expect(gomtiNagar?.parent_id).toBe('in-up-lucknow');

    // Verify Bengaluru
    const bengaluru = locations.find(l => l.district === 'Bengaluru Urban');
    expect(bengaluru).toBeDefined();
    expect(bengaluru?.state).toBe('Karnataka');

    // Verify Mumbai
    const mumbai = locations.find(l => l.id === 'in-mh-mumbai-city');
    expect(mumbai).toBeDefined();
    expect(mumbai?.state).toBe('Maharashtra');
  });

  it('allows dynamic addition of a custom locality', () => {
    const custom = addCustomLocality(
      'Uttar Pradesh',
      'Lucknow',
      'Lucknow',
      'Sushant Golf City'
    );

    expect(custom.id).toContain('in-uttar-pradesh-lucknow-custom-sushant-golf-city');
    expect(custom.locality).toBe('Sushant Golf City');
    expect(custom.district).toBe('Lucknow');
    expect(custom.state).toBe('Uttar Pradesh');

    // Check searchable
    const searchRes = searchIndianLocations('Sushant Golf City');
    expect(searchRes.length).toBeGreaterThan(0);
    expect(searchRes[0].locality).toBe('Sushant Golf City');
  });

  it('searches locations across states and districts', () => {
    const mhResults = searchIndianLocations('Pune');
    expect(mhResults.length).toBeGreaterThan(0);
    expect(mhResults.some(r => r.state === 'Maharashtra')).toBe(true);

    const indiraResults = searchIndianLocations('Indiranagar');
    expect(indiraResults.length).toBeGreaterThan(0);
    expect(indiraResults.some(r => r.state === 'Karnataka')).toBe(true);
  });

  it('verifies all required food-service categories are defined', () => {
    expect(FOOD_SERVICE_CATEGORIES.length).toBeGreaterThanOrEqual(12);
    const catNames = FOOD_SERVICE_CATEGORIES.map(c => c.name);

    expect(catNames).toContain('Restaurants');
    expect(catNames).toContain('Cafes & Coffee Shops');
    expect(catNames).toContain('Fast Food');
    expect(catNames).toContain('Dhabas');
    expect(catNames).toContain('Bakeries');
    expect(catNames).toContain('Sweet Shops (Mithai)');
    expect(catNames).toContain('Hotels with Restaurants');
    expect(catNames).toContain('Family Restaurants');
    expect(catNames).toContain('Pizza & Burger Outlets');
    expect(catNames).toContain('Food Courts');
    expect(catNames).toContain('Cloud Kitchens');
    expect(catNames).toContain('Catering Businesses');
    expect(catNames).toContain('Other Food-Service Businesses');
  });
});
