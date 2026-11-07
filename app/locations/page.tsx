'use client';

import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Navigation,
  Globe2,
  Building2,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { INDIAN_STATES_AND_UTS, StateOrUT, DistrictMeta } from '@/lib/locations/india';

export default function LocationExplorerPage() {
  const [selectedStateCode, setSelectedStateCode] = useState<string>('UP');
  const [search, setSearch] = useState('');
  const [expandedDistrict, setExpandedDistrict] = useState<string | null>('Lucknow');
  const [selectedDistricts, setSelectedDistricts] = useState<Set<string>>(new Set(['Lucknow', 'Gautam Buddha Nagar']));

  const activeState: StateOrUT = useMemo(() => {
    return INDIAN_STATES_AND_UTS.find(s => s.code === selectedStateCode) || INDIAN_STATES_AND_UTS[0];
  }, [selectedStateCode]);

  const filteredDistricts = useMemo(() => {
    if (!activeState) return [];
    const q = search.toLowerCase().trim();
    if (!q) return activeState.districts;
    return activeState.districts.filter(
      d =>
        d.name.toLowerCase().includes(q) ||
        d.headquarters.toLowerCase().includes(q) ||
        d.popularLocalities.some(l => l.toLowerCase().includes(q)) ||
        d.cities.some(c => c.toLowerCase().includes(q))
    );
  }, [activeState, search]);

  const toggleSelectDistrict = (districtName: string) => {
    const next = new Set(selectedDistricts);
    if (next.has(districtName)) {
      next.delete(districtName);
    } else {
      next.add(districtName);
    }
    setSelectedDistricts(next);
  };

  const selectAll = () => {
    const next = new Set(activeState.districts.map(d => d.name));
    setSelectedDistricts(next);
  };

  const deselectAll = () => {
    setSelectedDistricts(new Set());
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            PAN-INDIA GEOGRAPHIC HIERARCHY
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
            India Location & District Explorer
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            India → 28 States & 8 Union Territories → Official Districts → Major Cities & Commercial Localities
          </p>
        </div>

        <Link
          href="/searches"
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all shrink-0"
        >
          <Sparkles size={14} />
          Configure Lead Scan
        </Link>
      </div>

      {/* State / UT Selector Tabs */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Globe2 size={14} className="text-emerald-400" />
            Select State or Union Territory ({INDIAN_STATES_AND_UTS.length} Administrative Divisions)
          </span>
          <span className="text-xs text-slate-400">
            Current: <strong className="text-emerald-400">{activeState.name}</strong> ({activeState.type === 'union_territory' ? 'Union Territory' : 'State'})
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
          {INDIAN_STATES_AND_UTS.map(s => {
            const isSelected = selectedStateCode === s.code;
            return (
              <button
                key={s.code}
                onClick={() => {
                  setSelectedStateCode(s.code);
                  if (s.districts.length > 0) {
                    setExpandedDistrict(s.districts[0].name);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search districts, cities, or localities in ${activeState.name}...`}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5"
          >
            <CheckSquare size={13} className="text-emerald-400" />
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs font-semibold"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Districts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDistricts.map(d => {
          const isExpanded = expandedDistrict === d.name;
          const isChecked = selectedDistricts.has(d.name);

          return (
            <div
              key={d.name}
              className={`p-4 rounded-2xl border transition-all ${
                isChecked
                  ? 'bg-slate-900/80 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelectDistrict(d.name)}
                    className="rounded accent-emerald-500 cursor-pointer mt-0.5"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {d.name}
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                        {d.tier.replace('_', ' ').toUpperCase()}
                      </span>
                    </h3>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      HQ: {d.headquarters} • {d.cities.length} Cities
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setExpandedDistrict(isExpanded ? null : d.name)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>

              {/* Localities Drawer */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Commercial Localities ({d.popularLocalities.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {d.popularLocalities.map(loc => (
                      <span
                        key={loc}
                        className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-medium"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>

                  {d.cities.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Included Cities & Municipalities
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        {d.cities.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
