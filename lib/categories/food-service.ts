// lib/categories/food-service.ts
// Standardized Business Categories for India-Wide Food & Hospitality Discovery

export interface BusinessCategoryDefinition {
  id: string;
  name: string;
  description: string;
  osmTags: string[]; // OSM tag filters (amenity, shop, etc.)
  keywords: string[]; // Search keywords used for geocoding / query formulation
  badgeColor: string;
}

export const FOOD_SERVICE_CATEGORIES: BusinessCategoryDefinition[] = [
  {
    id: 'luxury_hotels',
    name: 'Luxury & 5-Star Hotels',
    description: 'Five-star, four-star, luxury heritage palaces, and established business hotels',
    osmTags: ['tourism=hotel', 'stars=5', 'stars=4'],
    keywords: ['luxury hotel', '5 star hotel', 'palace hotel', 'taj hotel', 'itc hotel', 'marriott', 'radisson'],
    badgeColor: 'amber',
  },
  {
    id: 'fine_dining',
    name: 'Fine Dining & Rooftops',
    description: 'Upscale fine dining, rooftop sky lounges, and chef-curated gourmet restaurants',
    osmTags: ['amenity=restaurant', 'cuisine=fine_dining'],
    keywords: ['fine dining', 'rooftop restaurant', 'sky lounge', 'gourmet dining', 'upscale restaurant'],
    badgeColor: 'purple',
  },
  {
    id: 'restaurant_chains',
    name: 'Recognized Restaurant Chains',
    description: 'National and global multi-location restaurant chains and dining groups',
    osmTags: ['amenity=restaurant', 'brand=*'],
    keywords: ['barbeque nation', 'mainland china', 'haldirams', 'bikanervala', 'punjab grill', 'chain restaurant'],
    badgeColor: 'blue',
  },
  {
    id: 'restaurants',
    name: 'Restaurants',
    description: 'Fine dining, casual dining, multicuisine, and specialty eateries',
    osmTags: ['amenity=restaurant'],
    keywords: ['restaurant', 'dining', 'family restaurant', 'bhojanalaya'],
    badgeColor: 'emerald',
  },
  {
    id: 'cafes',
    name: 'Cafes & Coffee Shops',
    description: 'Cafeterias, espresso bars, tea cafes, and beverage hubs',
    osmTags: ['amenity=cafe'],
    keywords: ['cafe', 'coffee shop', 'tea bar', 'chai cafe'],
    badgeColor: 'amber',
  },
  {
    id: 'fast_food',
    name: 'Fast Food',
    description: 'Quick-service outlets, chaat hubs, burger & sandwich stalls',
    osmTags: ['amenity=fast_food'],
    keywords: ['fast food', 'chaat', 'burger', 'roll', 'kiosk'],
    badgeColor: 'orange',
  },
  {
    id: 'dhabas',
    name: 'Dhabas',
    description: 'Traditional roadside dhabas and Punjabi / local heritage eateries',
    osmTags: ['amenity=restaurant', 'cuisine=indian'],
    keywords: ['dhaba', 'punjabi dhaba', 'shuddh shakahari dhaba'],
    badgeColor: 'yellow',
  },
  {
    id: 'bakeries',
    name: 'Bakeries',
    description: 'Fresh cake, pastry, artisanal bread, and confectionary bakeries',
    osmTags: ['shop=bakery'],
    keywords: ['bakery', 'cake shop', 'patisserie', 'bread'],
    badgeColor: 'pink',
  },
  {
    id: 'sweet_shops',
    name: 'Sweet Shops (Mithai)',
    description: 'Traditional Indian sweet confectionery and namkeen shops',
    osmTags: ['shop=confectionery', 'shop=pastry'],
    keywords: ['sweets', 'mithai', 'halwai', 'namkeen'],
    badgeColor: 'rose',
  },
  {
    id: 'hotels_restaurants',
    name: 'Hotels with Restaurants',
    description: 'Boutique hotels, resorts, and lodges with in-house dining operations',
    osmTags: ['tourism=hotel', 'amenity=restaurant'],
    keywords: ['hotel restaurant', 'hotel and restaurant', 'resort restaurant'],
    badgeColor: 'blue',
  },
  {
    id: 'family_restaurants',
    name: 'Family Restaurants',
    description: 'Spacious multi-generation dining establishments and vegetarian thali halls',
    osmTags: ['amenity=restaurant'],
    keywords: ['family restaurant', 'thali', 'pure veg restaurant'],
    badgeColor: 'cyan',
  },
  {
    id: 'pizza_burgers',
    name: 'Pizza & Burger Outlets',
    description: 'Pizzerias, burger lounges, and American/Italian casual diners',
    osmTags: ['amenity=restaurant', 'cuisine=pizza'],
    keywords: ['pizza', 'burger', 'pizzeria', 'italian fast food'],
    badgeColor: 'indigo',
  },
  {
    id: 'food_courts',
    name: 'Food Courts',
    description: 'Mall food courts, market food plazas, and multi-vendor dining hubs',
    osmTags: ['amenity=food_court'],
    keywords: ['food court', 'food plaza', 'eats street'],
    badgeColor: 'purple',
  },
  {
    id: 'cloud_kitchens',
    name: 'Cloud Kitchens',
    description: 'Delivery-only virtual food brands and dark kitchen facilities',
    osmTags: ['amenity=restaurant', 'delivery=only'],
    keywords: ['cloud kitchen', 'delivery kitchen', 'dark kitchen'],
    badgeColor: 'violet',
  },
  {
    id: 'catering',
    name: 'Catering Businesses',
    description: 'Party, wedding, institutional, and corporate caterers',
    osmTags: ['craft=caterer', 'amenity=restaurant'],
    keywords: ['caterer', 'catering services', 'outdoor catering'],
    badgeColor: 'teal',
  },
  {
    id: 'other_food_service',
    name: 'Other Food-Service Businesses',
    description: 'Juice bars, ice-cream parlours, dessert cafes, and specialty food kiosks',
    osmTags: ['amenity=ice_cream', 'amenity=bar'],
    keywords: ['ice cream parlour', 'juice corner', 'dessert parlour'],
    badgeColor: 'sky',
  },
];

export function getCategoryById(id: string): BusinessCategoryDefinition | undefined {
  return FOOD_SERVICE_CATEGORIES.find(c => c.id === id);
}

export function searchCategories(query: string): BusinessCategoryDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return FOOD_SERVICE_CATEGORIES;
  return FOOD_SERVICE_CATEGORIES.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.description.toLowerCase().includes(q) ||
    c.keywords.some(k => k.toLowerCase().includes(q))
  );
}
