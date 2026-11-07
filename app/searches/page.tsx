'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  UtensilsCrossed,
  PhoneCall,
  Mail,
  Globe,
  GlobeX,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  Crown,
  Star,
  Award,
} from 'lucide-react';
import { SearchConfig } from '@/lib/types';
import {
  INDIAN_STATES_AND_UTS,
  StateOrUT,
  DistrictMeta,
  getDistrictCitiesAndTowns,
  findVerifiedCityById,
  VerifiedCityInfo,
} from '@/lib/locations/india';
import {
  GLOBAL_COUNTRIES,
  getCountryByCode,
  getCountryAdministrativeHierarchy,
  getAdministrativePlaces,
  findGlobalPlaceById,
  isLocationInGlobalScope,
} from '@/lib/locations/global-registry';
import { FOOD_SERVICE_CATEGORIES } from '@/lib/categories/food-service';
import { PhoneFilterOption } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function NewSearchWizardPage() {
  const router = useRouter();

  // Multi-step Wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('IN');
  const [jobName, setJobName] = useState('India Restaurant & Business Lead Discovery');

  // Hierarchy Selection State (Country -> Level 1 -> Level 2 -> Level 3)
  const [activeStateCode, setActiveStateCode] = useState<string>('UP');
  const [activeDistrictName, setActiveDistrictName] = useState<string>('Lucknow');
  const [stateSearchQuery, setStateSearchQuery] = useState<string>('');
  const [districtSearchQuery, setDistrictSearchQuery] = useState<string>('');
  const [localitySearchQuery, setLocalitySearchQuery] = useState<string>('');

  // Selected Districts/Divisions
  const [selectedDistricts, setSelectedDistricts] = useState<
    { stateCode: string; stateName: string; districtName: string }[]
  >([
    { stateCode: 'UP', stateName: 'Uttar Pradesh', districtName: 'Lucknow' },
  ]);

  // Excluded City IDs (for optional "Exclude locality" toggle)
  const [excludedCityIds, setExcludedCityIds] = useState<Set<string>>(new Set());

  // Custom Localities added by user
  const [customLocalities, setCustomLocalities] = useState<
    { id: string; name: string; district: string; state: string }[]
  >([]);
  const [customLocalityName, setCustomLocalityName] = useState<string>('');
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);

  // Categories
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Restaurants',
    'Cafes & Coffee Shops',
    'Family Restaurants',
  ]);

  // Filters & Fields
  const [minRating, setMinRating] = useState<number>(3.5);
  const [minReviews, setMinReviews] = useState<number>(25);
  const [includeUnrated, setIncludeUnrated] = useState<boolean>(true); // Free OSM default
  const [phoneFilter, setPhoneFilter] = useState<PhoneFilterOption>('all');
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'no_website_only' | 'verified_absent' | 'listed_only'>('all');
  const [includeWithoutEmail, setIncludeWithoutEmail] = useState<boolean>(true);
  const [phoneOnly, setPhoneOnly] = useState<boolean>(false);
  const [emailOnly, setEmailOnly] = useState<boolean>(false);
  const [maxRecords, setMaxRecords] = useState<number>(150);

  // Provider & Review
  const [selectedProvider, setSelectedProvider] = useState<string>('osm_overpass');
  const [providers, setProviders] = useState<{ id: string; name: string; isConfigured: boolean }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmLargeScan, setConfirmLargeScan] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/providers')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProviders(data.providers);
          const active = data.providers.find((p: { isConfigured: boolean }) => p.isConfigured);
          if (active) setSelectedProvider(active.id);
        }
      })
      .catch(() => {});
  }, []);

  // Country metadata
  const selectedCountryMeta = useMemo(() => {
    return getCountryByCode(selectedCountryCode) || GLOBAL_COUNTRIES[0];
  }, [selectedCountryCode]);

  // Dynamic Level 1 administrative divisions list
  const level1List = useMemo(() => {
    if (selectedCountryCode === 'IN') {
      return INDIAN_STATES_AND_UTS;
    }
    const hierarchy = getCountryAdministrativeHierarchy(selectedCountryCode);
    return hierarchy.map(h => ({
      code: h.code,
      name: h.name,
      type: h.type,
      capital: h.capital || '',
      districts: h.divisions.map(div => ({
        name: div.name,
        headquarters: div.headquarters || div.name,
        tier: div.tier || 'tier_2',
        cities: div.cities,
        popularLocalities: div.popularLocalities || div.cities,
      })),
    }));
  }, [selectedCountryCode]);

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    const country = getCountryByCode(countryCode) || GLOBAL_COUNTRIES[0];
    let firstStateCode = 'UP';
    let firstStateName = 'Uttar Pradesh';
    let firstDistName = 'Lucknow';

    if (countryCode !== 'IN') {
      const hierarchy = getCountryAdministrativeHierarchy(countryCode);
      if (hierarchy.length > 0) {
        firstStateCode = hierarchy[0].code;
        firstStateName = hierarchy[0].name;
        if (hierarchy[0].divisions.length > 0) {
          firstDistName = hierarchy[0].divisions[0].name;
        }
      }
    }

    setActiveStateCode(firstStateCode);
    setActiveDistrictName(firstDistName);
    setSelectedDistricts([{ stateCode: firstStateCode, stateName: firstStateName, districtName: firstDistName }]);
    setExcludedCityIds(new Set());
    setCustomLocalities([]);
    setJobName(`${country.name} Restaurant & Business Lead Discovery`);
  };

  // Filtered Level 1 divisions list
  const filteredStates = useMemo(() => {
    const q = stateSearchQuery.toLowerCase().trim();
    if (!q) return level1List;
    return level1List.filter(
      s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.capital.toLowerCase().includes(q)
    );
  }, [stateSearchQuery, level1List]);

  // Current active State / Province / Region
  const activeState = useMemo(() => {
    return level1List.find(s => s.code === activeStateCode) || level1List[0];
  }, [activeStateCode, level1List]);

  // Filtered Districts / Counties within Active State
  const filteredDistricts = useMemo(() => {
    if (!activeState) return [];
    const q = districtSearchQuery.toLowerCase().trim();
    if (!q) return activeState.districts;
    return activeState.districts.filter(
      d => d.name.toLowerCase().includes(q) || d.headquarters.toLowerCase().includes(q) || d.cities.some(c => c.toLowerCase().includes(q))
    );
  }, [activeState, districtSearchQuery]);

  // Current active District / County
  const activeDistrict = useMemo(() => {
    if (!activeState) return undefined;
    return activeState.districts.find(d => d.name.toLowerCase() === activeDistrictName.toLowerCase()) || activeState.districts[0];
  }, [activeState, activeDistrictName]);

  // Filtered Localities within Active District
  const filteredLocalities = useMemo(() => {
    if (!activeDistrict) return [];
    const q = localitySearchQuery.toLowerCase().trim();
    if (!q) return activeDistrict.popularLocalities;
    return activeDistrict.popularLocalities.filter(l => l.toLowerCase().includes(q));
  }, [activeDistrict, localitySearchQuery]);

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    const q = categorySearchQuery.toLowerCase().trim();
    if (!q) return FOOD_SERVICE_CATEGORIES;
    return FOOD_SERVICE_CATEGORIES.filter(
      c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [categorySearchQuery]);

  // Resolve district hierarchy for all currently selected districts
  const resolvedDistrictsData = useMemo(() => {
    return selectedDistricts.map(d => {
      if (selectedCountryCode === 'IN') {
        const hierarchy = getDistrictCitiesAndTowns(d.stateName, d.districtName);
        return {
          ...d,
          hierarchy,
        };
      } else {
        const adminRes = getAdministrativePlaces(selectedCountryCode, d.stateName, d.districtName);
        return {
          ...d,
          hierarchy: {
            state: d.stateName,
            district: d.districtName,
            headquarters: d.districtName,
            tier: 'tier_2' as const,
            cities: adminRes.places.map(p => ({
              id: p.id,
              name: p.name,
              district: p.level2Name,
              state: p.level1Name,
              isHeadquarters: p.isHeadquarters,
              searchCells: p.searchCells,
              localities: p.localities,
              latitude: p.latitude,
              longitude: p.longitude,
            })),
            popularLocalities: adminRes.places.flatMap(p => p.localities),
            coverageGapReported: adminRes.coverageGapReported,
            coverageGapNotes: adminRes.coverageGapNotes,
          },
        };
      }
    });
  }, [selectedDistricts, selectedCountryCode]);

  // Active district's hierarchy (for Column 3 view)
  const activeDistrictHierarchy = useMemo(() => {
    if (!activeState || !activeDistrict) return null;
    if (selectedCountryCode === 'IN') {
      return getDistrictCitiesAndTowns(activeState.name, activeDistrict.name);
    } else {
      const adminRes = getAdministrativePlaces(selectedCountryCode, activeState.name, activeDistrict.name);
      return {
        state: activeState.name,
        district: activeDistrict.name,
        headquarters: activeDistrict.name,
        tier: 'tier_2' as const,
        cities: adminRes.places.map(p => ({
          id: p.id,
          name: p.name,
          district: p.level2Name,
          state: p.level1Name,
          isHeadquarters: p.isHeadquarters,
          searchCells: p.searchCells,
          localities: p.localities,
          latitude: p.latitude,
          longitude: p.longitude,
        })),
        popularLocalities: adminRes.places.flatMap(p => p.localities),
        coverageGapReported: adminRes.coverageGapReported,
        coverageGapNotes: adminRes.coverageGapNotes,
      };
    }
  }, [activeState, activeDistrict, selectedCountryCode]);

  // All verified cities across all selected districts (deduplicated by city.id)
  const allVerifiedCities = useMemo(() => {
    const list: VerifiedCityInfo[] = [];
    const seen = new Set<string>();
    for (const d of resolvedDistrictsData) {
      for (const city of d.hierarchy.cities) {
        if (!seen.has(city.id)) {
          seen.add(city.id);
          list.push(city);
        }
      }
    }
    return list;
  }, [resolvedDistrictsData]);

  // Included (non-excluded) cities
  const includedCities = useMemo(() => {
    return allVerifiedCities.filter(c => !excludedCityIds.has(c.id));
  }, [allVerifiedCities, excludedCityIds]);

  // Excluded cities
  const excludedCities = useMemo(() => {
    return allVerifiedCities.filter(c => excludedCityIds.has(c.id));
  }, [allVerifiedCities, excludedCityIds]);

  // Geographic coverage gaps across all selected districts
  const coverageGaps = useMemo(() => {
    return resolvedDistrictsData.filter(d => d.hierarchy.coverageGapReported);
  }, [resolvedDistrictsData]);

  // Final selected locations (city IDs + custom locality IDs)
  // Strictly isolated to verified places within the currently selected districts of the active state
  const selectedLocations = useMemo(() => {
    if (!activeState) return [];
    const currentDistNames = new Set(selectedDistricts.map(d => d.districtName.toLowerCase()));
    const validIncludedCities = includedCities.filter(c => {
      const stateMatch =
        c.state.toLowerCase() === activeState.name.toLowerCase() ||
        c.state.toLowerCase() === activeState.code.toLowerCase();
      const distMatch = currentDistNames.has(c.district.toLowerCase());
      return stateMatch && distMatch;
    });

    const ids: string[] = validIncludedCities.map(c => c.id);
    for (const cl of customLocalities) {
      if (
        (cl.state.toLowerCase() === activeState.name.toLowerCase() || cl.state.toLowerCase() === activeState.code.toLowerCase()) &&
        currentDistNames.has(cl.district.toLowerCase()) &&
        !ids.includes(cl.id)
      ) {
        ids.push(cl.id);
      }
    }
    return ids;
  }, [includedCities, customLocalities, activeState, selectedDistricts]);

  // Location label map
  const locationLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of allVerifiedCities) {
      map[c.id] = `${c.name} (${c.district}), ${c.state}`;
    }
    for (const cl of customLocalities) {
      map[cl.id] = `${cl.name} (${cl.district}), ${cl.state}`;
    }
    return map;
  }, [allVerifiedCities, customLocalities]);

  type Level1Division = {
    code: string;
    name: string;
    type?: string;
    capital?: string;
    districts: DistrictMeta[];
  };

  // 1. Select Only This District (switches district and replaces prior selection, leaving NO stale cities)
  const selectOnlyDistrict = (state: Level1Division, dist: DistrictMeta) => {
    setActiveStateCode(state.code);
    setActiveDistrictName(dist.name);
    setSelectedDistricts([{ stateCode: state.code, stateName: state.name, districtName: dist.name }]);
    setExcludedCityIds(new Set());
    setCustomLocalities([]);
  };

  // 2. Add / Merge District to selection without duplicates (strictly within active state)
  const addDistrictToSelection = (state: Level1Division, dist: DistrictMeta) => {
    setSelectedDistricts(prev => {
      // Filter out any lingering districts from other states to enforce strict geographic isolation
      const currentInState = prev.filter(d => d.stateCode === state.code);
      const exists = currentInState.some(
        d => d.districtName.toLowerCase() === dist.name.toLowerCase()
      );
      if (exists) return currentInState;
      return [...currentInState, { stateCode: state.code, stateName: state.name, districtName: dist.name }];
    });
  };

  // 3. Remove District from selection
  const removeDistrictFromSelection = (stateCode: string, distName: string) => {
    setSelectedDistricts(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(
        d => !(d.stateCode === stateCode && d.districtName.toLowerCase() === distName.toLowerCase())
      );
    });
  };

  // 4. Toggle District in Column 2 checkbox
  const toggleDistrictSelection = (state: Level1Division, dist: DistrictMeta) => {
    const isSelected = selectedDistricts.some(
      d => d.stateCode === state.code && d.districtName.toLowerCase() === dist.name.toLowerCase()
    );
    if (isSelected) {
      removeDistrictFromSelection(state.code, dist.name);
    } else {
      addDistrictToSelection(state, dist);
    }
  };

  // 5. Select All Districts in State (replaces all cross-state selections)
  const selectAllDistrictsInState = (state: Level1Division) => {
    const toAdd = state.districts.map(d => ({
      stateCode: state.code,
      stateName: state.name,
      districtName: d.name,
    }));
    setSelectedDistricts(toAdd);
    setExcludedCityIds(new Set());
    setCustomLocalities([]);
  };

  // 6. Clear State Districts from selection
  const clearStateLocations = (state: Level1Division) => {
    if (state.districts.length > 0) {
      selectOnlyDistrict(state, state.districts[0]);
    }
  };

  // 7. Toggle exclusion of a single city
  const toggleCityExclusion = (cityId: string) => {
    setExcludedCityIds(prev => {
      const next = new Set(prev);
      if (next.has(cityId)) {
        next.delete(cityId);
      } else {
        if (selectedLocations.length > 1) {
          next.add(cityId);
        }
      }
      return next;
    });
  };

  // 8. Custom Locality Handler
  const handleAddCustomLocality = () => {
    if (!customLocalityName.trim() || !activeState || !activeDistrict) return;
    setIsAddingCustom(true);
    const locName = customLocalityName.trim();
    const distSlug = activeDistrict.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const locSlug = locName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const locId = `loc-${activeState.code.toLowerCase()}-${distSlug}-${locSlug}`;

    setCustomLocalities(prev => [
      ...prev,
      {
        id: locId,
        name: locName,
        district: activeDistrict.name,
        state: activeState.name,
      },
    ]);
    setCustomLocalityName('');
    setIsAddingCustom(false);
  };

  const removeCustomLocality = (locId: string) => {
    setCustomLocalities(prev => prev.filter(l => l.id !== locId));
  };

  // Toggle Category
  const toggleCategory = (catName: string) => {
    if (selectedCategories.includes(catName)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== catName));
      }
    } else {
      setSelectedCategories([...selectedCategories, catName]);
    }
  };

  const selectAllCategories = () => {
    setSelectedCategories(FOOD_SERVICE_CATEGORIES.map(c => c.name));
  };

  const clearCategories = () => {
    setSelectedCategories(['Restaurants']);
  };

  // Submit & Start Scan
  const handleStartScan = async () => {
    if (selectedLocations.length > 5 && !confirmLargeScan) {
      alert('Please confirm the large scan scope acknowledgment before launching.');
      return;
    }

    const targetDistName = activeDistrict?.name || 'Lucknow';
    const targetStateName = activeState?.name || 'Uttar Pradesh';

    // Strict Geographic Isolation Pre-flight:
    // Filter and sanitize selectedLocations to ensure NO cross-district pollution
    const currentDistNames = new Set(selectedDistricts.map(d => d.districtName.toLowerCase()));
    const sanitizedLocations = selectedLocations.filter(locId => {
      if (selectedCountryCode === 'IN') {
        if (locId.startsWith('city-')) {
          const city = findVerifiedCityById(locId);
          if (!city) return false;
          return (
            currentDistNames.has(city.district.toLowerCase()) &&
            (city.state.toLowerCase() === targetStateName.toLowerCase() ||
             city.state.toLowerCase() === (activeState?.code || '').toLowerCase())
          );
        }
        return true;
      } else {
        return selectedDistricts.length > 0
          ? selectedDistricts.some(d => isLocationInGlobalScope(locId, selectedCountryCode, d.stateName, d.districtName))
          : isLocationInGlobalScope(locId, selectedCountryCode, targetStateName, targetDistName);
      }
    });

    if (sanitizedLocations.length === 0) {
      alert(`Geographic isolation error: No verified locations belonging to ${targetDistName}, ${targetStateName} are selected.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const config: SearchConfig = {
        id: `config-${Date.now()}`,
        name: jobName,
        selected_country: selectedCountryCode,
        selected_district: {
          state: targetStateName,
          district: targetDistName,
        },
        selected_locations: sanitizedLocations,
        categories: selectedCategories,
        rating_filters: {
          min: minRating,
          include_unrated: (selectedProvider === 'osm_overpass' || selectedProvider === 'offline_local') ? true : includeUnrated,
        },
        review_filters: {
          min: (selectedProvider === 'osm_overpass' || selectedProvider === 'offline_local') ? 0 : minReviews,
          include_zero: (selectedProvider === 'osm_overpass' || selectedProvider === 'offline_local') ? true : includeUnrated,
        },
        contact_filters: {
          phone: phoneFilter === 'with_phone' ? 'required' : phoneFilter === 'without_phone' ? 'unavailable' : 'optional',
          phone_filter: phoneFilter,
          website_filter: websiteFilter,
          include_without_phone: phoneFilter !== 'with_phone',
          include_without_email: includeWithoutEmail,
        },
        limits: {
          max_records_per_location: 60,
          max_total_records: maxRecords,
        },
        provider_id: selectedProvider,
      };

      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: jobName,
          config,
          providerId: selectedProvider,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push('/scans');
      } else {
        alert(data.error || 'Failed to start scan');
      }
    } catch (e) {
      console.error(e);
      alert('Error launching scan job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
      {/* Wizard Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            India-Wide Lead Engine
          </span>
          <span className="text-xs text-slate-400">• 28 States & 8 UTs Supported</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1.5">
          Configure Restaurant & Business Lead Scan
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Target verified food-service businesses across all Indian states and Union Territories using open data with zero paid API costs.
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        {[
          { step: 1, label: '1. India Hierarchy' },
          { step: 2, label: '2. Food Categories' },
          { step: 3, label: '3. Data Fields & Filters' },
          { step: 4, label: '4. Provider & Review' },
        ].map(item => (
          <div key={item.step} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === item.step
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : currentStep > item.step
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              {currentStep > item.step ? '✓' : item.step}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                currentStep === item.step ? 'text-slate-200' : 'text-slate-500'
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
        {/* ================= STEP 1: HIERARCHY SELECTOR ================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Country Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Select Target Country ({GLOBAL_COUNTRIES.length} Priority Jurisdictions)</span>
                <span className="text-[10px] text-emerald-400 font-normal">Active: {selectedCountryMeta.flagEmoji} {selectedCountryMeta.name}</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {GLOBAL_COUNTRIES.map(country => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountryChange(country.code)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                      selectedCountryCode === country.code
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-base">{country.flagEmoji}</span>
                    <span className="truncate">{country.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={jobName}
                onChange={e => setJobName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. London Hospitality Leads or New York Cafes"
              />
            </div>

            {/* Selected Locations Summary Box */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Target Scope: {selectedLocations.length} Location(s) across {selectedDistricts.length} District(s)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Estimated Scope: ~{selectedLocations.length * 20} to {selectedLocations.length * 50} potential businesses
                </span>
              </div>

              {/* 1. Districts Selected */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  1. District(s) Selected ({selectedDistricts.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDistricts.map(d => (
                    <span
                      key={`${d.stateCode}-${d.districtName}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                    >
                      <span className="font-semibold">{d.districtName}</span>
                      <span className="text-[10px] text-emerald-400/80">({d.stateName})</span>
                      {selectedDistricts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDistrictFromSelection(d.stateCode, d.districtName)}
                          className="hover:text-red-400 ml-1"
                          title="Remove District"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* 2. Cities & Towns Automatically Included */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    2. Cities & Towns Automatically Included ({includedCities.length}):
                  </span>
                  {excludedCities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExcludedCityIds(new Set())}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      Restore all excluded ({excludedCities.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {includedCities.map(c => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900 text-slate-200 border border-slate-700/80"
                    >
                      <span>{c.name}</span>
                      {c.isHeadquarters && (
                        <span className="text-[9px] text-emerald-400 px-1 py-0.2 bg-emerald-950/80 rounded border border-emerald-800/40">Hq</span>
                      )}
                      <span className="text-[10px] text-slate-500">({c.district})</span>
                      {selectedLocations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleCityExclusion(c.id)}
                          className="hover:text-red-400 text-slate-500 ml-1"
                          title="Exclude this city from scan"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </span>
                  ))}
                  {excludedCities.map(c => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-950 text-slate-500 border border-slate-800 line-through opacity-75"
                    >
                      <span>{c.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleCityExclusion(c.id)}
                        className="hover:text-emerald-400 text-slate-400 no-underline ml-1"
                        title="Re-include this city"
                      >
                        <Plus size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 3. Custom Localities */}
              {customLocalities.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    3. Custom Localities Added ({customLocalities.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {customLocalities.map(cl => (
                      <span
                        key={cl.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-950/50 text-cyan-300 border border-cyan-800/50"
                      >
                        <span>{cl.name}</span>
                        <span className="text-[10px] text-cyan-500/80">({cl.district})</span>
                        <button
                          type="button"
                          onClick={() => removeCustomLocality(cl.id)}
                          className="hover:text-red-400 text-cyan-400 ml-1"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Geographic Coverage Gaps */}
              {coverageGaps.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <AlertTriangle size={14} />
                    <span>Geographic Coverage Notice ({coverageGaps.length} District(s))</span>
                  </div>
                  {coverageGaps.map(cg => (
                    <p key={`${cg.stateCode}-${cg.districtName}`} className="text-[11px] leading-relaxed">
                      <strong>{cg.districtName} ({cg.stateName}):</strong> {cg.hierarchy.coverageGapNotes || 'Only administrative headquarters is indexed in base dataset. Sub-divisional localities will be dynamically resolved.'}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Hierarchy Browser: Country -> Level 1 -> Level 2 -> Level 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-800 rounded-xl p-4 bg-slate-950/50">
              {/* Column 1: Level 1 (State / Province / Region / Emirate) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
                    1. {selectedCountryMeta.hierarchyTerms.level1Name} ({level1List.length})
                  </span>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={stateSearchQuery}
                    onChange={e => setStateSearchQuery(e.target.value)}
                    placeholder={`Search ${selectedCountryMeta.hierarchyTerms.level1Name.toLowerCase()}s...`}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="h-64 overflow-y-auto space-y-1 pr-1 border border-slate-900 rounded-lg p-1">
                  {filteredStates.map(s => {
                    const isSelected = activeStateCode === s.code;
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => {
                          setActiveStateCode(s.code);
                          if (s.districts.length > 0) {
                            const firstDist = s.districts[0];
                            setActiveDistrictName(firstDist.name);
                            setSelectedDistricts([{ stateCode: s.code, stateName: s.name, districtName: firstDist.name }]);
                          } else {
                            setSelectedDistricts([]);
                          }
                          setExcludedCityIds(new Set());
                          setCustomLocalities([]);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                        <span className="text-[10px] text-slate-500 ml-1 shrink-0">
                          {s.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: Level 2 in Selected Level 1 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
                    2. {selectedCountryMeta.hierarchyTerms.level2Name} in {activeState?.name}
                  </span>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={districtSearchQuery}
                    onChange={e => setDistrictSearchQuery(e.target.value)}
                    placeholder={`Search ${selectedCountryMeta.hierarchyTerms.level2Name.toLowerCase()}s...`}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="h-64 overflow-y-auto space-y-1 pr-1 border border-slate-900 rounded-lg p-1">
                  {filteredDistricts.map(d => {
                    const isDistrictActive = activeDistrictName.toLowerCase() === d.name.toLowerCase();
                    const isDistrictSelected = selectedDistricts.some(
                      sd => sd.stateCode === activeState.code && sd.districtName.toLowerCase() === d.name.toLowerCase()
                    );

                    return (
                      <div
                        key={d.name}
                        onClick={() => selectOnlyDistrict(activeState, d)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                          isDistrictActive
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isDistrictSelected}
                            onChange={() => toggleDistrictSelection(activeState, d)}
                            onClick={e => e.stopPropagation()}
                            className="rounded accent-emerald-500 cursor-pointer"
                            title={isDistrictSelected ? 'Uncheck to remove district' : 'Check to add district'}
                          />
                          <span className="truncate">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectOnlyDistrict(activeState, d);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            title="Select only this district and clear others"
                          >
                            Select Only
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectAllDistrictsInState(activeState)}
                    className="flex-1 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-emerald-400 border border-slate-800"
                  >
                    Select All in {activeState.code}
                  </button>
                  <button
                    type="button"
                    onClick={() => clearStateLocations(activeState)}
                    className="py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-400 border border-slate-800"
                  >
                    Clear State
                  </button>
                </div>
              </div>

              {/* Column 3: Cities & Towns in Active District */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
                    3. {selectedCountryMeta.hierarchyTerms.level3Name} in {activeDistrict?.name} ({activeDistrictHierarchy?.cities.length || 0})
                  </span>
                </div>
                
                {/* District Action Buttons */}
                {activeDistrict && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => addDistrictToSelection(activeState, activeDistrict)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 text-center"
                    >
                      + Add All in {activeDistrict.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectOnlyDistrict(activeState, activeDistrict)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-center"
                    >
                      Select Only
                    </button>
                  </div>
                )}

                {/* Coverage gap banner for active district if reported */}
                {activeDistrictHierarchy?.coverageGapReported && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                    <span className="font-bold flex items-center gap-1 text-amber-400">
                      <AlertTriangle size={12} />
                      Geographic Boundary Notice
                    </span>
                    {activeDistrictHierarchy.coverageGapNotes}
                  </div>
                )}

                {/* Verified Cities & Towns list */}
                <div className="h-56 overflow-y-auto space-y-1 pr-1 border border-slate-900 rounded-lg p-1">
                  {activeDistrictHierarchy?.cities.map(city => {
                    const isExcluded = excludedCityIds.has(city.id);
                    const isSelected = selectedLocations.includes(city.id);

                    return (
                      <div
                        key={city.id}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-600/15 text-emerald-200 border border-emerald-500/30'
                            : isExcluded
                            ? 'bg-slate-950 text-slate-500 border border-slate-800 opacity-60'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{city.name}</span>
                          {city.isHeadquarters && (
                            <span className="text-[9px] text-emerald-400 px-1 py-0.2 bg-emerald-950/80 rounded border border-emerald-800/40 shrink-0">
                              Hq
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 shrink-0">
                            ({city.searchCells.length} cells)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCityExclusion(city.id)}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                            isExcluded
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-red-400'
                          }`}
                        >
                          {isExcluded ? 'Include' : 'Exclude'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Locality form */}
                <div className="pt-1 flex gap-1.5">
                  <input
                    type="text"
                    value={customLocalityName}
                    onChange={e => setCustomLocalityName(e.target.value)}
                    placeholder="New custom locality..."
                    className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={!customLocalityName.trim() || isAddingCustom}
                    onClick={handleAddCustomLocality}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40"
                    title="Add custom locality"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: BUSINESS CATEGORIES ================= */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-sm font-semibold text-slate-200 block">
                  Select Food-Service & Hospitality Categories
                </span>
                <span className="text-xs text-slate-400">
                  Choose the specific business models to discover ({selectedCategories.length} selected).
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategories([
                      'Luxury & 5-Star Hotels',
                      'Fine Dining & Rooftops',
                      'Recognized Restaurant Chains',
                    ]);
                    setMinRating(4.0);
                    setMinReviews(50);
                    setIncludeUnrated(false);
                    setJobName('Premium 4.0+ Hospitality & Chain Lead Discovery');
                  }}
                  className="px-3 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-300 inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Crown size={12} />
                  4.0+ Premium Hospitality Preset
                </button>
                <button
                  type="button"
                  onClick={selectAllCategories}
                  className="px-3 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-emerald-400 hover:border-emerald-500/50"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearCategories}
                  className="px-3 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-400 hover:border-slate-700"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={categorySearchQuery}
                onChange={e => setCategorySearchQuery(e.target.value)}
                placeholder="Search food-service categories (e.g. cafe, dhaba, sweets, bakery)..."
                className="w-full pl-8 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredCategories.map(cat => {
                const isSelected = selectedCategories.includes(cat.name);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-600/15 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="font-semibold text-xs text-slate-200">{cat.name}</span>
                      {isSelected ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                      {cat.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 3: DATA FIELDS & OPTIONAL FILTERS ================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <span className="text-sm font-semibold text-slate-200 block mb-1">
                Contact & Information Availability Filters
              </span>
              <span className="text-xs text-slate-400">
                Configure which contact channels must be present for lead qualification.
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-200 block mb-1">
                Phone Number Filtering Policy
              </span>
              <span className="text-xs text-slate-400">
                Choose how telephone availability affects discovery and lead qualification.
              </span>
            </div>

            {/* 3-Option Phone Number Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPhoneFilter('all')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  phoneFilter === 'all'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-slate-200">All Leads</span>
                  <div className={`w-3.5 h-3.5 rounded-full border ${phoneFilter === 'all' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-700'}`} />
                </div>
                <span className="text-[11px] text-slate-400 mt-2">
                  Include both businesses with valid phone numbers and businesses without phone numbers.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPhoneFilter('with_phone')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  phoneFilter === 'with_phone'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-slate-200">With Phone Number</span>
                  <div className={`w-3.5 h-3.5 rounded-full border ${phoneFilter === 'with_phone' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-700'}`} />
                </div>
                <span className="text-[11px] text-slate-400 mt-2">
                  Only discover & qualify businesses with a verified, valid telephone number.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPhoneFilter('without_phone')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  phoneFilter === 'without_phone'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-slate-200">Without Phone Number</span>
                  <div className={`w-3.5 h-3.5 rounded-full border ${phoneFilter === 'without_phone' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-700'}`} />
                </div>
                <span className="text-[11px] text-slate-400 mt-2">
                  Only discover & qualify businesses without telephone numbers listed.
                </span>
              </button>
            </div>

            {/* Email filter toggle */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Include Businesses Without Email
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Free open data sources have limited public emails; leave checked to retain high coverage.
                </span>
              </div>
              <input
                type="checkbox"
                checked={includeWithoutEmail}
                onChange={e => setIncludeWithoutEmail(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0 ml-3"
              />
            </div>

            {/* Ratings & Reviews Filter Card */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Rating & Review Handling (Transparent Semantics)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    OpenStreetMap records do not store consumer ratings or review counts.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-medium">Permit Unrated Records:</span>
                  <input
                    type="checkbox"
                    checked={includeUnrated}
                    onChange={e => setIncludeUnrated(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Strict Rating and Review Count Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    Minimum Verified Rating
                  </label>
                  <select
                    value={minRating}
                    onChange={e => setMinRating(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="4.0">★ 4.0+ Stars (Strict Premium Standard)</option>
                    <option value="4.2">★ 4.2+ Stars (Highly Rated)</option>
                    <option value="4.5">★ 4.5+ Stars (Top Tier)</option>
                    <option value="4.7">★ 4.7+ Stars (Elite Luxury)</option>
                    <option value="3.5">★ 3.5+ Stars (Moderate)</option>
                    <option value="0">Any Rating / Unrated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Minimum Review Count Threshold
                  </label>
                  <select
                    value={minReviews}
                    onChange={e => setMinReviews(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="0">Any Review Count</option>
                    <option value="50">50+ Reviews (Established)</option>
                    <option value="100">100+ Reviews (High Visibility)</option>
                    <option value="250">250+ Reviews (Major Footfall)</option>
                    <option value="500">500+ Reviews (Market Leader)</option>
                    <option value="1000">1,000+ Reviews (Iconic Institution)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Website Status Filter
                  </label>
                  <select
                    value={websiteFilter}
                    onChange={e => setWebsiteFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Records (Listed + Unlisted)</option>
                    <option value="no_website_only">Website Not Listed (Top Web Development Prospects)</option>
                    <option value="listed_only">Website Listed (Audit / Redesign)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Maximum Result Limit
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="25"
                      max="500"
                      step="25"
                      value={maxRecords}
                      onChange={e => setMaxRecords(parseInt(e.target.value, 10))}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="text-xs font-mono font-bold text-emerald-400 shrink-0 w-12 text-right">
                      {maxRecords}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: PROVIDER SELECTION & CONFIRMATION ================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Select Intelligence Provider
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {providers.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (p.isConfigured) {
                        setSelectedProvider(p.id);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedProvider === p.id
                        ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-sm cursor-pointer'
                        : p.isConfigured
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
                        : 'bg-slate-950/40 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm flex items-center gap-1.5">
                        {p.name}
                        {p.id === 'osm_overpass' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                            Default Free Provider
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          p.isConfigured
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {p.isConfigured ? 'Ready (No API Key Required)' : 'Key Missing'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block mt-1.5">
                      {p.id === 'osm_overpass'
                        ? 'OpenStreetMap Dual-Engine (Nominatim + Overpass). Fully functional, no billing, no commercial API keys required.'
                        : 'Optional commercial provider. Requires server-side GOOGLE_PLACES_API_KEY.'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Large Scan Scope Guard */}
            {selectedLocations.length > 5 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-400">
                  <AlertTriangle size={16} />
                  Large Scan Scope Confirmation Required
                </div>
                <p>
                  You have selected <strong>{selectedLocations.length} locations</strong> across India. To comply with OpenStreetMap and public service usage guidelines, this job will execute with respectful rate-limiting (1.2–1.5s per location with jitter).
                </p>
                <label className="flex items-center gap-2 pt-1 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmLargeScan}
                    onChange={e => setConfirmLargeScan(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span>I authorize this scan campaign and understand it will run politely in the background.</span>
                </label>
              </div>
            )}

            {/* Campaign Summary Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider block">
                Final Campaign Configuration:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-400">
                <div>Campaign Name: <strong className="text-slate-200">{jobName}</strong></div>
                <div>Provider: <strong className="text-emerald-400">{selectedProvider === 'osm_overpass' ? 'OpenStreetMap (Keyless)' : selectedProvider === 'offline_local' ? 'Offline Local Database (Zero API Cost)' : 'Google Places'}</strong></div>
                <div>Target Locations: <strong className="text-slate-200">{selectedLocations.length} locations</strong></div>
                <div>Target Categories: <strong className="text-slate-200">{selectedCategories.length} categories</strong></div>
                <div>Phone Policy: <strong className="text-slate-200">{phoneFilter === 'with_phone' ? 'With Phone Number (Required)' : phoneFilter === 'without_phone' ? 'Without Phone Number Only' : 'All Leads'}</strong></div>
                <div>Include Missing Email: <strong className="text-slate-200">{includeWithoutEmail ? 'Yes' : 'No (Email Required)'}</strong></div>
                <div>Estimated Cost: <strong className="text-emerald-400">₹0.00 (Free Open Data)</strong></div>
                <div>Target Database: <strong className="text-slate-200 font-mono">dqokioywnacwbvifrqol</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium flex items-center gap-2 border border-slate-800"
            >
              <ArrowLeft size={16} />
              Previous Step
            </button>
          ) : <div />}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              Next Step
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || (selectedLocations.length > 5 && !confirmLargeScan)}
              onClick={handleStartScan}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50"
            >
              {isSubmitting ? 'Starting Background Job...' : 'Launch Scan Campaign'}
              <Sparkles size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
