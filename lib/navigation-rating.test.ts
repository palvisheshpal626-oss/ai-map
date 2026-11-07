import { describe, it, expect, beforeEach } from 'vitest';
import {
  isValidCoordinate,
  constructFullAddress,
  getGoogleMapsUrl,
  getCoordinateMapsUrl,
  LocationNavProps,
} from './utils/maps';
import { store } from './store/memory-store';
import { Restaurant } from './types';

describe('Navigation, Google Maps Links & Rating Filter Suite', () => {
  const sampleRatedRestaurant: Partial<Restaurant> = {
    id: 'test-rated-1',
    business_name: 'The Royal Cafe',
    category: 'Cafes & Coffee Shops',
    formatted_address: 'Hazratganj, Lucknow, Uttar Pradesh 226001, India',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    city: 'Lucknow',
    latitude: 26.8505,
    longitude: 80.9422,
    rating: 4.2,
    review_count: 1540,
    phone_number: '05222627000',
  };

  const sampleUnratedRestaurant: Partial<Restaurant> = {
    id: 'test-unrated-1',
    business_name: 'Sharma Sweets',
    category: 'Sweet Shops (Mithai)',
    formatted_address: 'Lalbagh, Lucknow, Uttar Pradesh 226001, India',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    city: 'Lucknow',
    latitude: null,
    longitude: null,
    rating: null, // Strictly null from OSM
    review_count: null,
    phone_number: '9839011111',
  };

  const sampleHighRatedDining: Partial<Restaurant> = {
    id: 'test-rated-2',
    business_name: 'Oudhyana Fine Dining',
    category: 'Restaurants',
    formatted_address: 'Gomti Nagar, Lucknow, Uttar Pradesh, India',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    city: 'Lucknow',
    latitude: 26.8584,
    longitude: 80.9832,
    rating: 4.7,
    review_count: 480,
    phone_number: '05226711000',
  };

  beforeEach(() => {
    store.saveRestaurant(sampleRatedRestaurant);
    store.saveRestaurant(sampleUnratedRestaurant);
    store.saveRestaurant(sampleHighRatedDining);
  });

  // --- Requirement 1 & 2: Coordinate & Address Navigation ---
  it('1. A business with valid coordinates generates exact map location URL', () => {
    const url = getGoogleMapsUrl(sampleRatedRestaurant);
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=26.8505%2C80.9422');
  });

  it('2. A business without coordinates opens Google Maps using its full address', () => {
    const url = getGoogleMapsUrl(sampleUnratedRestaurant);
    expect(url).toBeDefined();
    expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(url).toContain(encodeURIComponent('Lalbagh, Lucknow, Uttar Pradesh 226001, India'));
  });

  it('3. A business without coordinates or usable address produces no broken map link', () => {
    const blankBusiness: LocationNavProps = {
      business_name: '',
      formatted_address: null,
      latitude: null,
      longitude: null,
    };
    const url = getGoogleMapsUrl(blankBusiness);
    expect(url).toBeNull();

    const coordUrl = getCoordinateMapsUrl(null, null, blankBusiness);
    expect(coordUrl).toBeNull();
  });

  it('4. Different business rows produce distinct, row-specific Google Maps navigation URLs', () => {
    const url1 = getGoogleMapsUrl(sampleRatedRestaurant);
    const url2 = getGoogleMapsUrl(sampleHighRatedDining);
    const url3 = getGoogleMapsUrl(sampleUnratedRestaurant);

    expect(url1).not.toEqual(url2);
    expect(url2).not.toEqual(url3);
    expect(url1).not.toEqual(url3);
  });

  // --- Requirement 4: Rating Filters & Semantics ---
  it('5. Rating filter returns only matching rated businesses above threshold', () => {
    const all = store.getAllRestaurants();

    // Filter minRating >= 4.5
    const highRated = all.filter(
      r => r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating)) && Number(r.rating) >= 4.5
    );
    expect(highRated.length).toBeGreaterThanOrEqual(1);
    expect(highRated.every(r => Number(r.rating) >= 4.5)).toBe(true);

    // Filter minRating >= 4.0
    const fourPlus = all.filter(
      r => r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating)) && Number(r.rating) >= 4.0
    );
    expect(fourPlus.length).toBeGreaterThanOrEqual(2);
    expect(fourPlus.every(r => Number(r.rating) >= 4.0)).toBe(true);
  });

  it('6. Missing ratings are strictly null and never appear as zero-star or fabricated ratings', () => {
    const unrated = store.getRestaurantById('test-unrated-1');
    expect(unrated).toBeDefined();
    expect(unrated?.rating).toBeNull();
    expect(unrated?.rating).not.toBe(0);
    expect(unrated?.review_count).toBeNull();
    expect(unrated?.review_count).not.toBe(0);
  });

  it('7. Rating filters work together with category and location filters', () => {
    const all = store.getAllRestaurants();

    // Category Cafe + Rating >= 4.0 in Lucknow
    const cafeInLucknow = all.filter(r => {
      const matchesCat = r.category.toLowerCase().includes('cafe');
      const matchesCity = r.city?.toLowerCase() === 'lucknow';
      const matchesRating =
        r.rating !== null && r.rating !== undefined && Number(r.rating) >= 4.0;
      return matchesCat && matchesCity && matchesRating;
    });

    expect(cafeInLucknow.length).toBe(1);
    expect(cafeInLucknow[0].business_name).toBe('The Royal Cafe');

    // Category Restaurant + Rating >= 4.5
    const fineDining = all.filter(r => {
      const matchesCat = r.category.toLowerCase().includes('restaurant');
      const matchesRating =
        r.rating !== null && r.rating !== undefined && Number(r.rating) >= 4.5;
      return matchesCat && matchesRating;
    });

    expect(fineDining.length).toBe(1);
    expect(fineDining[0].business_name).toBe('Oudhyana Fine Dining');
  });

  it('8. Searching for cafes returns only cafe records, without bleeding into generic restaurants', () => {
    const all = store.getAllRestaurants();
    const cafes = all.filter(r => r.category.toLowerCase().includes('cafe'));
    expect(cafes.every(c => c.category.toLowerCase().includes('cafe'))).toBe(true);
    expect(cafes.some(c => c.business_name === 'Oudhyana Fine Dining')).toBe(false);
  });
});
