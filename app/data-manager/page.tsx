'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Download,
  RefreshCw,
  Trash2,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Database,
  MapPin,
  Layers,
  FileText,
  Filter,
  Info,
  Building,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  OfflineArea,
  OfflineStorageMetrics,
  OfflineCleanupPreview,
  OfflineCleanupResult,
  Restaurant,
  PhoneFilterOption,
} from '@/lib/types';
import { INDIAN_STATES_AND_UTS, getDistrictCitiesAndTowns, VerifiedCityInfo } from '@/lib/locations/india';
import { buildWhatsAppUrl } from '@/lib/utils/whatsapp';

export default function OfflineDataManagerPage() {
  // State for areas & metrics
  const [areas, setAreas] = useState<OfflineArea[]>([]);
  const [metrics, setMetrics] = useState<OfflineStorageMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Download Area Modal/Form State
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [selectedStateCode, setSelectedStateCode] = useState<string>('UP');
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('Lucknow');
  const [selectedCityName, setSelectedCityName] = useState<string>('Lucknow');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Local Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  const [phoneFilter, setPhoneFilter] = useState<PhoneFilterOption>('all');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Cleanup Modal State
  const [cleanupModalPolicy, setCleanupModalPolicy] = useState<'safe' | 'strict' | null>(null);
  const [cleanupPreview, setCleanupPreview] = useState<OfflineCleanupPreview | null>(null);
  const [strictConfirmed, setStrictConfirmed] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);

  // Refreshing Area ID
  const [refreshingAreaId, setRefreshingAreaId] = useState<string | null>(null);

  // Load areas and metrics
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/offline/areas');
      const data = await res.json();
      if (data.success) {
        setAreas(data.areas || []);
        setMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error('Failed to load offline data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Local Offline Search
  const handleLocalSearch = useCallback(async () => {
    try {
      setIsSearching(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (selectedAreaFilter !== 'all') params.set('areaId', selectedAreaFilter);
      if (phoneFilter !== 'all') params.set('phoneFilter', phoneFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/offline/search?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.records || []);
      }
    } catch (err) {
      console.error('Offline search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedAreaFilter, phoneFilter]);

  useEffect(() => {
    handleLocalSearch();
  }, [handleLocalSearch]);

  // Derived district cities for download selector
  const availableCities = React.useMemo(() => {
    const stateObj = INDIAN_STATES_AND_UTS.find(s => s.code === selectedStateCode);
    const stateName = stateObj?.name || 'Uttar Pradesh';
    const hierarchy = getDistrictCitiesAndTowns(stateName, selectedDistrictName);
    return hierarchy.cities;
  }, [selectedStateCode, selectedDistrictName]);

  // Auto-select first city when district changes
  useEffect(() => {
    if (availableCities.length > 0) {
      setSelectedCityName(availableCities[0].name);
    }
  }, [availableCities]);

  // Trigger Area Download
  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stateObj = INDIAN_STATES_AND_UTS.find(s => s.code === selectedStateCode);
    const stateName = stateObj?.name || 'Uttar Pradesh';

    try {
      setIsDownloading(true);
      setActionMessage({ text: `Acquiring OpenStreetMap extract for ${selectedCityName}, ${selectedDistrictName}...`, type: 'info' });

      const res = await fetch('/api/offline/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName: selectedCityName,
          districtName: selectedDistrictName,
          stateName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage({
          text: `Successfully acquired ${data.rawCount} records for ${selectedCityName} (${data.duplicateCount} duplicates merged).`,
          type: 'success',
        });
        setShowDownloadModal(false);
        loadData();
        handleLocalSearch();
      } else {
        setActionMessage({ text: data.error || 'Failed to download area', type: 'error' });
      }
    } catch (err) {
      setActionMessage({ text: 'Network error downloading offline area', type: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  // Trigger Area Refresh
  const handleRefreshArea = async (areaId: string) => {
    try {
      setRefreshingAreaId(areaId);
      setActionMessage({ text: 'Checking OpenStreetMap for incremental updates...', type: 'info' });

      const res = await fetch('/api/offline/areas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage({ text: data.notes || 'Area refreshed successfully.', type: 'success' });
        loadData();
      } else {
        setActionMessage({ text: data.error || 'Failed to refresh area', type: 'error' });
      }
    } catch (err) {
      setActionMessage({ text: 'Error refreshing area', type: 'error' });
    } finally {
      setRefreshingAreaId(null);
    }
  };

  // Trigger Area Deletion
  const handleDeleteArea = async (areaId: string) => {
    if (!confirm('Are you sure you want to delete this offline area and its raw imported records? (Qualified leads in database will be preserved)')) {
      return;
    }

    try {
      const res = await fetch(`/api/offline/areas?areaId=${encodeURIComponent(areaId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ text: data.message, type: 'success' });
        loadData();
      } else {
        setActionMessage({ text: data.error || 'Failed to delete area', type: 'error' });
      }
    } catch (err) {
      setActionMessage({ text: 'Error deleting area', type: 'error' });
    }
  };

  // Open Cleanup Preview Modal
  const openCleanupPreview = async (policy: 'safe' | 'strict') => {
    try {
      setCleanupModalPolicy(policy);
      setStrictConfirmed(false);
      setCleanupPreview(null);

      const res = await fetch(`/api/offline/cleanup?policy=${policy}`);
      const data = await res.json();
      if (data.success) {
        setCleanupPreview(data.preview);
      }
    } catch (err) {
      console.error('Failed to get cleanup preview:', err);
    }
  };

  // Execute Cleanup
  const handleExecuteCleanup = async () => {
    if (!cleanupModalPolicy) return;
    if (cleanupModalPolicy === 'strict' && !strictConfirmed) {
      alert('Please check the confirmation box to proceed with Strict Cleanup.');
      return;
    }

    try {
      setIsCleaning(true);
      const res = await fetch('/api/offline/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy: cleanupModalPolicy,
          confirmed: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage({ text: data.result.message, type: 'success' });
        setCleanupModalPolicy(null);
        setCleanupPreview(null);
        loadData();
      } else {
        setActionMessage({ text: data.error || 'Cleanup execution failed', type: 'error' });
      }
    } catch (err) {
      setActionMessage({ text: 'Error executing cleanup', type: 'error' });
    } finally {
      setIsCleaning(false);
    }
  };

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/30 rounded-xl text-emerald-400">
              <HardDrive size={26} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Offline Business Data Manager
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                  Zero API Cost
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Acquire, inspect, index, and safely prune city-scoped OpenStreetMap business datasets.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium text-slate-200 transition"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowDownloadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium shadow-md transition"
          >
            <Download size={16} />
            Download City Extract
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : actionMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
            {actionMessage.type === 'error' && <AlertTriangle size={18} className="text-rose-400 shrink-0" />}
            {actionMessage.type === 'info' && <Info size={18} className="text-blue-400 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-black/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Storage & Records Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Downloaded Areas</span>
            <MapPin size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {metrics ? metrics.downloaded_areas_count : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Verified city extracts</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Raw Source POIs</span>
            <Layers size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {metrics ? metrics.raw_imported_records_count.toLocaleString() : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">OpenStreetMap nodes & ways</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Qualified Leads</span>
            <ShieldCheck size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {metrics ? metrics.qualified_leads_count.toLocaleString() : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Passed qualification rules</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Storage Footprint</span>
            <Database size={16} className="text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {metrics ? formatBytes(metrics.estimated_storage_bytes) : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Local database footprint</div>
        </div>
      </div>

      {/* Downloaded Areas Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <MapPin size={18} className="text-emerald-400" />
              Locally Stored City Extracts
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Downloaded geographic extracts available for instant zero-API-cost discovery
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {areas.length} {areas.length === 1 ? 'city extract' : 'city extracts'}
          </span>
        </div>

        {areas.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Download size={22} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No Offline Areas Downloaded Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Download your first city extract to enable instant, zero-cost restaurant discovery without external API calls.
            </p>
            <button
              onClick={() => setShowDownloadModal(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition"
            >
              Download City Extract
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-3 px-4">City / Locality</th>
                  <th className="py-3 px-4">District & State</th>
                  <th className="py-3 px-4">Records</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SHA-256 Checksum</th>
                  <th className="py-3 px-4">Status & Attribution</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {areas.map(area => (
                  <tr key={area.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                      <Building size={14} className="text-emerald-400" />
                      {area.city_name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {area.district_name}, {area.state_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-medium">
                      {area.records_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {formatBytes(area.bytes_downloaded)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      <span title={area.checksum}>
                        {area.checksum ? `${area.checksum.substring(0, 10)}...` : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${
                            area.status === 'ready'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : area.status === 'downloading'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {area.status === 'ready' && <CheckCircle2 size={10} />}
                          {area.status.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          {area.attribution}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRefreshArea(area.id)}
                          disabled={refreshingAreaId === area.id}
                          title="Check incremental OSM changes"
                          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition disabled:opacity-50"
                        >
                          <RefreshCw
                            size={14}
                            className={refreshingAreaId === area.id ? 'animate-spin text-emerald-400' : ''}
                          />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAreaFilter(area.id);
                          }}
                          title="Search within this area"
                          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition"
                        >
                          <Search size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteArea(area.id)}
                          title="Delete area extract"
                          className="p-1.5 rounded-md hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instant Local Search & Leads Explorer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 md:p-5 border-b border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Search size={18} className="text-emerald-400" />
                Instant Offline Leads Explorer
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Query locally stored records without making external API calls
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search name, locality..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48"
                />
              </div>

              <select
                value={selectedAreaFilter}
                onChange={e => setSelectedAreaFilter(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Downloaded Areas</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.city_name} ({a.district_name})
                  </option>
                ))}
              </select>

              <select
                value={phoneFilter}
                onChange={e => setPhoneFilter(e.target.value as PhoneFilterOption)}
                className="py-1.5 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Phone Statuses</option>
                <option value="with_phone">With Phone Only</option>
                <option value="without_phone">Without Phone Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-8 text-center text-xs text-slate-400">Searching local database...</div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching records found in local storage. Try downloading a city extract above.
            </div>
          ) : (
            searchResults.map(rest => {
              const whatsAppRes = rest.phone_number ? buildWhatsAppUrl(rest.phone_number, { country: rest.country }) : null;
              const whatsAppUrl = whatsAppRes?.url;
              return (
                <div
                  key={rest.id}
                  className="p-4 hover:bg-slate-800/30 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{rest.business_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        {rest.category}
                      </span>
                      <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        OSM Local
                      </span>
                    </div>
                    <div className="text-slate-400 flex items-center gap-2">
                      <MapPin size={12} className="text-slate-500 shrink-0" />
                      <span>{rest.formatted_address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                      <span>Rating: <strong className="text-slate-400 font-normal">Unrated (OSM)</strong></span>
                      <span>•</span>
                      <span>Reviews: <strong className="text-slate-400 font-normal">N/A</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rest.phone_number ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded">
                          {rest.phone_number}
                        </span>
                        {whatsAppUrl && (
                          <a
                            href={whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition flex items-center gap-1"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        No phone listed
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Smart Storage & Cleanup Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Safe Cleanup Card */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <ShieldCheck size={18} />
              Safe Storage Cleanup (Default)
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Preserves all qualified leads, active campaign results, saved exports, and historical database records. Targets only orphaned, failed, or quarantined raw records that didn&apos;t meet qualification criteria.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Zero risk to qualified data</span>
            <button
              onClick={() => openCleanupPreview('safe')}
              className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition"
            >
              Preview Safe Cleanup
            </button>
          </div>
        </div>

        {/* Strict Cleanup Card */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <AlertTriangle size={18} />
              Strict Storage Cleanup (Opt-in)
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Reclaims maximum storage by permanently removing unverified raw OpenStreetMap source records while still strictly preserving all qualified leads and active campaign results in canonical storage.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-amber-500/80">Requires explicit confirmation</span>
            <button
              onClick={() => openCleanupPreview('strict')}
              className="px-3.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition"
            >
              Preview Strict Cleanup
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Download City Extract Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Download size={18} className="text-emerald-400" />
                Acquire City-Scoped OSM Extract
              </h3>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDownloadSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">State / UT</label>
                <select
                  value={selectedStateCode}
                  onChange={e => {
                    setSelectedStateCode(e.target.value);
                    const stateObj = INDIAN_STATES_AND_UTS.find(s => s.code === e.target.value);
                    if (stateObj && stateObj.districts.length > 0) {
                      setSelectedDistrictName(stateObj.districts[0].name);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {INDIAN_STATES_AND_UTS.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">District</label>
                <select
                  value={selectedDistrictName}
                  onChange={e => setSelectedDistrictName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {INDIAN_STATES_AND_UTS.find(s => s.code === selectedStateCode)?.districts.map(d => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.tier.replace('_', ' ').toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">City / Locality</label>
                <select
                  value={selectedCityName}
                  onChange={e => setSelectedCityName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {availableCities.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.isHeadquarters ? '(District HQ)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Info size={13} className="text-emerald-400" />
                  Source Attribution & Policy
                </div>
                <p className="text-[11px] leading-relaxed">
                  Downloads food-service POIs from OpenStreetMap under Open Data Commons Open Database License (ODbL 1.0). OSM POIs do not include consumer star ratings or review counts.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDownloadModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDownloading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      Download & Index
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Cleanup Preview & Execution Modal */}
      {cleanupModalPolicy && cleanupPreview && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                {cleanupModalPolicy === 'safe' ? (
                  <>
                    <ShieldCheck size={18} className="text-emerald-400" />
                    Safe Storage Cleanup Preview
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} className="text-amber-400" />
                    Strict Storage Cleanup Confirmation
                  </>
                )}
              </h3>
              <button
                onClick={() => setCleanupModalPolicy(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed">
                {cleanupPreview.summary_notes}
              </div>

              {/* Counts Preview Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-slate-300">
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-slate-500 text-[11px]">Records to Delete</div>
                  <div className="text-lg font-bold text-rose-400 font-mono mt-1">
                    {cleanupPreview.records_to_delete.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-slate-500 text-[11px]">Estimated Space Freed</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                    {formatBytes(cleanupPreview.estimated_bytes_freed)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-slate-500 text-[11px]">Qualified Leads Preserved</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                    {cleanupPreview.qualified_leads_preserved.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-slate-500 text-[11px]">Campaign Results Preserved</div>
                  <div className="text-lg font-bold text-blue-400 font-mono mt-1">
                    {cleanupPreview.active_campaign_records_preserved.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Strict Confirmation Checkbox */}
              {cleanupModalPolicy === 'strict' && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="strictCheck"
                    checked={strictConfirmed}
                    onChange={e => setStrictConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <label htmlFor="strictCheck" className="text-amber-200 text-xs cursor-pointer">
                    I understand that unverified raw OSM records will be permanently removed to reclaim storage, while qualified leads in canonical storage remain preserved.
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCleanupModalPolicy(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCleanup}
                  disabled={isCleaning || (cleanupModalPolicy === 'strict' && !strictConfirmed)}
                  className={`px-4 py-2 rounded-lg font-medium shadow-md transition disabled:opacity-50 flex items-center gap-2 ${
                    cleanupModalPolicy === 'safe'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {isCleaning ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Executing Cleanup...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Confirm & Execute {cleanupModalPolicy.toUpperCase()} Cleanup
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
