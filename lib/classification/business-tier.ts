// lib/classification/business-tier.ts
// Industry-Grade Hospitality Tier Classification & Brand Recognition Engine
// Specially tuned for Indian Hospitality: Luxury Hotels, Fine Dining, National & Global Chains,
// and filtering out low-tier stalls, tapris, and roadside eateries.

import { Restaurant } from '../types';

export type HospitalityTier = 'luxury' | 'premium' | 'established' | 'standard' | 'small_outlet';

export type CategoryGroup =
  | 'hotels'
  | 'fine_dining'
  | 'premium_dining'
  | 'chains'
  | 'hotel_restaurants'
  | 'standard_dining'
  | 'small_outlet';

export interface BrandMatchResult {
  isChain: boolean;
  brandName: string | null;
  brandCategory: 'hotel' | 'fine_dining' | 'chain' | 'quick_service' | 'cafe_bakery' | null;
  tier: HospitalityTier;
}

export interface HospitalityClassification {
  tier: HospitalityTier;
  categoryGroup: CategoryGroup;
  brandName: string | null;
  isEstablishedChain: boolean;
  isSmallOutlet: boolean;
  meetsQualityThreshold: boolean; // Rating >= 4.0 and not small outlet
}

// Comprehensive verified brand registry for Indian hospitality
export const ESTABLISHED_BRANDS: Array<{
  name: string;
  patterns: RegExp[];
  category: 'hotel' | 'fine_dining' | 'chain' | 'quick_service' | 'cafe_bakery';
  tier: HospitalityTier;
}> = [
  // --- 1. Luxury & 5-Star / 4-Star Hotels ---
  {
    name: 'Taj Hotels',
    patterns: [/\btaj\b/i, /\bvivanta\b/i, /\bseleQtions\b/i, /\bthe gateway hotel\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'The Oberoi / Trident',
    patterns: [/\boberoi\b/i, /\btrident\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'ITC Hotels',
    patterns: [/\bitc hotel/i, /\bitc maurya/i, /\bitc maratha/i, /\bitc grand/i, /\bwelcomhotel\b/i, /\bfortune hotel\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'The Leela',
    patterns: [/\bthe leela\b/i, /\bleela palace\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'Marriott International',
    patterns: [/\bmarriott\b/i, /\bjw marriott\b/i, /\bcourtyard by marriott\b/i, /\bwestin\b/i, /\bsheraton\b/i, /\brenaissance hotel\b/i, /\britz[- ]carlton\b/i, /\bthe st\. regis\b/i, /\bmeridien\b/i, /\bfour points by sheraton\b/i, /\bautograph collection\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'Hyatt',
    patterns: [/\bhyatt\b/i, /\bgrand hyatt\b/i, /\bhyatt regency\b/i, /\bandaz\b/i, /\bhyatt centric\b/i, /\bhyatt place\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'Hilton',
    patterns: [/\bhilton\b/i, /\bconrad\b/i, /\bdoubletree by hilton\b/i, /\bhilton garden inn\b/i, /\bwaldorf astoria\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'Radisson Hotel Group',
    patterns: [/\bradisson\b/i, /\bradisson blu\b/i, /\bradisson red\b/i, /\bradisson collection\b/i, /\bpark inn by radisson\b/i, /\bpark plaza\b/i, /\bcountry inn & suites\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'Accor / Novotel / Pullman',
    patterns: [/\bnovotel\b/i, /\bpullman\b/i, /\bsofitel\b/i, /\bmercure\b/i, /\bibis\b/i, /\bfairmont\b/i, /\braffles\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'Lemon Tree Hotels',
    patterns: [/\blemon tree\b/i, /\blemon tree premier\b/i, /\bred fox hotel\b/i, /\baurika\b/i],
    category: 'hotel',
    tier: 'established',
  },
  {
    name: 'The Lalit',
    patterns: [/\bthe lalit\b/i, /\blalit great eastern\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'Sarovar Hotels',
    patterns: [/\bsarovar premiere\b/i, /\bsarovar portico\b/i, /\bhometel\b/i],
    category: 'hotel',
    tier: 'established',
  },
  {
    name: 'Ginger Hotels',
    patterns: [/\bginger hotel\b/i, /\bginger\b/i],
    category: 'hotel',
    tier: 'established',
  },
  {
    name: 'Holiday Inn / IHG',
    patterns: [/\bholiday inn\b/i, /\bcrowne plaza\b/i, /\bintercontinental\b/i, /\bvoco\b/i],
    category: 'hotel',
    tier: 'luxury',
  },
  {
    name: 'Clarks Hotels',
    patterns: [/\bthe clarks\b/i, /\bclarks avadh\b/i, /\bclarks shiraz\b/i, /\bclarks amer\b/i, /\bclarks inn\b/i],
    category: 'hotel',
    tier: 'established',
  },
  {
    name: 'Sayaji Hotels',
    patterns: [/\bsayaji\b/i],
    category: 'hotel',
    tier: 'established',
  },
  {
    name: 'Ramada by Wyndham',
    patterns: [/\bramada\b/i, /\bwyndham\b/i, /\bhoward johnson\b/i],
    category: 'hotel',
    tier: 'established',
  },

  // --- 2. Fine Dining & Upscale Dining ---
  {
    name: 'Barbeque Nation',
    patterns: [/\bbarbeque nation\b/i, /\bbarbecue nation\b/i, /\bbbq nation\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Absolute Barbecues',
    patterns: [/\babsolute barbecues\b/i, /\bab['’]?s\b/i, /\babsolute bbq\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Mainland China',
    patterns: [/\bmainland china\b/i, /\basia kitchen by mainland china\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Punjab Grill',
    patterns: [/\bpunjab grill\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Farzi Cafe',
    patterns: [/\bfarzi cafe\b/i, /\bfarzi café\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Social',
    patterns: [/\bhauz khas social\b/i, /\bcolaba social\b/i, /\bgurgaon social\b/i, /\bcyber hub social\b/i, /\bindiranagar social\b/i, /\bchurch street social\b/i, /\bkoramangala social\b/i, /\b\w+ social\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Smoke House Deli',
    patterns: [/\bsmoke house deli\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Mamagoto',
    patterns: [/\bmamagoto\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Copper Chimney',
    patterns: [/\bcopper chimney\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Oh! Calcutta',
    patterns: [/\boh!? calcutta\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'The Great Kabab Factory',
    patterns: [/\bthe great kabab factory\b/i, /\bgreat kabab factory\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Pirates of Grill',
    patterns: [/\bpirates of grill\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Sigree',
    patterns: [/\bsigree\b/i, /\bsigree global grill\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'Bercos',
    patterns: [/\bberco['’]?s\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },
  {
    name: 'The Royal Cafe',
    patterns: [/\broyal cafe\b/i, /\bthe royal cafe\b/i],
    category: 'fine_dining',
    tier: 'premium',
  },

  // --- 3. Recognized National Restaurant & Confectionery Chains ---
  {
    name: "Haldiram's",
    patterns: [/\bhaldiram['’]?s?\b/i],
    category: 'chain',
    tier: 'established',
  },
  {
    name: 'Bikanervala',
    patterns: [/\bbikanervala\b/i, /\bbikano\b/i],
    category: 'chain',
    tier: 'established',
  },
  {
    name: 'Sagar Ratna',
    patterns: [/\bsagar ratna\b/i],
    category: 'chain',
    tier: 'established',
  },
  {
    name: 'Saravana Bhavan',
    patterns: [/\bsaravana bhavan\b/i, /\bhotel saravana bhavan\b/i],
    category: 'chain',
    tier: 'established',
  },
  {
    name: 'Behrouz Biryani',
    patterns: [/\bbehrouz\b/i, /\bbehrouz biryani\b/i],
    category: 'chain',
    tier: 'established',
  },
  {
    name: 'Biryani By Kilo',
    patterns: [/\bbiryani by kilo\b/i, /\bbbk\b/i],
    category: 'chain',
    tier: 'established',
  },
  {
    name: 'Paradise Biryani',
    patterns: [/\bparadise biryani\b/i, /\bparadise food court\b/i],
    category: 'chain',
    tier: 'established',
  },
  {
    name: 'Wow! Momo',
    patterns: [/\bwow!?\s*momo\b/i, /\bwow!?\s*china\b/i],
    category: 'quick_service',
    tier: 'established',
  },
  {
    name: 'Chaayos',
    patterns: [/\bchaayos\b/i],
    category: 'cafe_bakery',
    tier: 'established',
  },
  {
    name: 'Chai Point',
    patterns: [/\bchai point\b/i],
    category: 'cafe_bakery',
    tier: 'established',
  },

  // --- 4. Global Quick-Service & Dining Chains ---
  {
    name: "McDonald's",
    patterns: [/\bmcdonald['’]?s\b/i, /\bmcd\b/i],
    category: 'quick_service',
    tier: 'established',
  },
  {
    name: 'KFC',
    patterns: [/\bkfc\b/i, /\bkentucky fried chicken\b/i],
    category: 'quick_service',
    tier: 'established',
  },
  {
    name: 'Domino’s Pizza',
    patterns: [/\bdomino['’]?s\b/i, /\bdominos pizza\b/i],
    category: 'quick_service',
    tier: 'established',
  },
  {
    name: 'Pizza Hut',
    patterns: [/\bpizza hut\b/i],
    category: 'quick_service',
    tier: 'established',
  },
  {
    name: 'Burger King',
    patterns: [/\bburger king\b/i],
    category: 'quick_service',
    tier: 'established',
  },
  {
    name: 'Subway',
    patterns: [/\bsubway\b/i],
    category: 'quick_service',
    tier: 'established',
  },
  {
    name: 'Starbucks',
    patterns: [/\bstarbucks\b/i, /\btata starbucks\b/i],
    category: 'cafe_bakery',
    tier: 'established',
  },
  {
    name: 'Tim Hortons',
    patterns: [/\btim hortons\b/i],
    category: 'cafe_bakery',
    tier: 'established',
  },
  {
    name: 'Taco Bell',
    patterns: [/\btaco bell\b/i],
    category: 'quick_service',
    tier: 'established',
  },
  {
    name: 'The Belgian Waffle Co.',
    patterns: [/\bthe belgian waffle/i, /\bbelgian waffle/i],
    category: 'cafe_bakery',
    tier: 'established',
  },
  {
    name: "Naturals Ice Cream",
    patterns: [/\bnatural['’]?s ice cream\b/i, /\bnaturals ice cream\b/i],
    category: 'cafe_bakery',
    tier: 'established',
  },
];

/**
 * Patterns matching small roadside stalls, tapris, carts, and micro-kiosks
 */
const SMALL_OUTLET_PATTERNS = [
  /\btea stall\b/i,
  /\bchai stall\b/i,
  /\bchai tapri\b/i,
  /\btapri\b/i,
  /\bthela\b/i,
  /\btea point\b/i,
  /\bpan shop\b/i,
  /\bpaan shop\b/i,
  /\bpaan corner\b/i,
  /\bkiosk\b/i,
  /\bcart\b/i,
  /\bstreet food stall\b/i,
  /\broadside vendor\b/i,
  /\bmaggi point\b/i,
  /\bmaggie point\b/i,
  /\bomlette stall\b/i,
  /\banda stall\b/i,
  /\bjuice stall\b/i,
  /\bjuice corner\b/i,
  /\bmicro canteen\b/i,
  /\broll corner\b/i,
  /\bmomo stall\b/i,
];

/**
 * Checks if a business is a detected recognized chain/brand
 */
export function detectEstablishedBrand(businessName: string): BrandMatchResult {
  if (!businessName) {
    return { isChain: false, brandName: null, brandCategory: null, tier: 'standard' };
  }

  const cleanName = businessName.trim();

  for (const brand of ESTABLISHED_BRANDS) {
    for (const pattern of brand.patterns) {
      if (pattern.test(cleanName)) {
        return {
          isChain: true,
          brandName: brand.name,
          brandCategory: brand.category,
          tier: brand.tier,
        };
      }
    }
  }

  return { isChain: false, brandName: null, brandCategory: null, tier: 'standard' };
}

/**
 * Determines whether a business is a small roadside eatery, tea stall, or micro-kiosk.
 * Safeguard: An outlet is NEVER classified as small if it is a recognized brand
 * or has high verified ratings (>= 4.3) with significant reviews (>= 300).
 */
export function isSmallEateryOrStall(business: {
  business_name: string;
  category?: string | null;
  rating?: number | null;
  review_count?: number | null;
}): boolean {
  const name = business.business_name || '';
  const cat = business.category || '';

  // 1. If it's a known brand, it's not a small stall
  const brand = detectEstablishedBrand(name);
  if (brand.isChain) return false;

  // 2. High authority reviews safeguard
  const rating = business.rating !== null && business.rating !== undefined ? Number(business.rating) : null;
  const reviews = business.review_count !== null && business.review_count !== undefined ? Number(business.review_count) : null;
  if (rating !== null && rating >= 4.3 && reviews !== null && reviews >= 300) {
    return false; // Established iconic local place
  }

  // 3. Name matches small stall patterns
  for (const pattern of SMALL_OUTLET_PATTERNS) {
    if (pattern.test(name)) return true;
  }

  // 4. Category explicitly says stall, kiosk, or street food
  const catLower = cat.toLowerCase();
  if (
    catLower.includes('street food') ||
    catLower.includes('tea stall') ||
    catLower.includes('food cart') ||
    catLower.includes('kiosk')
  ) {
    return true;
  }

  // 5. "Dhaba" with low review count or low rating
  if (catLower.includes('dhaba') || name.toLowerCase().includes('dhaba')) {
    if (rating === null || rating < 4.0 || reviews === null || reviews < 100) {
      return true;
    }
  }

  return false;
}

/**
 * Classifies a restaurant candidate into hospitality tiers and category groups
 */
export function classifyHospitalityTier(restaurant: Partial<Restaurant>): HospitalityClassification {
  const name = restaurant.business_name || '';
  const cat = (restaurant.category || '').toLowerCase();
  const address = (restaurant.formatted_address || '').toLowerCase();
  const rating = restaurant.rating !== null && restaurant.rating !== undefined ? Number(restaurant.rating) : null;
  const reviews = restaurant.review_count !== null && restaurant.review_count !== undefined ? Number(restaurant.review_count) : null;

  const brand = detectEstablishedBrand(name);
  const isSmall = isSmallEateryOrStall({
    business_name: name,
    category: restaurant.category,
    rating,
    review_count: reviews,
  });

  if (isSmall) {
    return {
      tier: 'small_outlet',
      categoryGroup: 'small_outlet',
      brandName: null,
      isEstablishedChain: false,
      isSmallOutlet: true,
      meetsQualityThreshold: false,
    };
  }

  // If detected as recognized brand
  if (brand.isChain && brand.brandName) {
    let group: CategoryGroup = 'chains';
    if (brand.brandCategory === 'hotel') group = 'hotels';
    else if (brand.brandCategory === 'fine_dining') group = 'fine_dining';

    return {
      tier: brand.tier,
      categoryGroup: group,
      brandName: brand.brandName,
      isEstablishedChain: true,
      isSmallOutlet: false,
      meetsQualityThreshold: rating !== null && rating >= 4.0,
    };
  }

  // Check if Hotel / Resort / Palace
  const isHotel =
    cat.includes('hotel') ||
    cat.includes('resort') ||
    cat.includes('palace') ||
    cat.includes('lodging') ||
    /\b(hotel|resort|palace|grand|suites)\b/i.test(name);

  // Check if Fine Dining / Upscale / Rooftop
  const isFineDining =
    cat.includes('fine dining') ||
    cat.includes('fine_dining') ||
    cat.includes('upscale') ||
    /\b(fine dining|rooftop|sky lounge|lounge & bar|gourmet)\b/i.test(name) ||
    /\b(rooftop|sky deck|bar & grill)\b/i.test(address);

  // Check if Hotel Restaurant
  const isHotelRestaurant =
    (cat.includes('restaurant') || cat.includes('dining')) &&
    (/\bhotel\b/i.test(address) || /\bhotel\b/i.test(name) || isHotel);

  let tier: HospitalityTier = 'standard';
  let categoryGroup: CategoryGroup = 'standard_dining';

  if (isHotel) {
    categoryGroup = 'hotels';
    if (rating !== null && rating >= 4.3 && reviews !== null && reviews >= 150) {
      tier = 'luxury';
    } else {
      tier = 'premium';
    }
  } else if (isFineDining) {
    categoryGroup = 'fine_dining';
    tier = 'premium';
  } else if (isHotelRestaurant) {
    categoryGroup = 'hotel_restaurants';
    tier = 'premium';
  } else if (rating !== null && rating >= 4.2 && reviews !== null && reviews >= 200) {
    categoryGroup = 'premium_dining';
    tier = 'premium';
  }

  const meetsQualityThreshold = rating !== null && rating >= 4.0;

  return {
    tier,
    categoryGroup,
    brandName: null,
    isEstablishedChain: false,
    isSmallOutlet: false,
    meetsQualityThreshold,
  };
}
