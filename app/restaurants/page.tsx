'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UtensilsCrossed,
  Search,
  Filter,
  FileDown,
  PhoneCall,
  Mail,
  Globe,
  GlobeX,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  BookmarkPlus,
  RefreshCw,
  MapPin,
  Eye,
  X,
  Copy,
  Check,
  Layers,
  ChevronLeft,
  ChevronRight,
  Star,
  Compass,
  Award,
  Crown,
  Building2,
  Sparkles,
  Database,
  Radio,
  AlertTriangle,
  Clock,
  MessageCircle,
  MessageSquare,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Send,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import Link from 'next/link';
import { Restaurant, PhoneFilterOption, OpportunityCategoryCode, WhatsAppFilterOption } from '@/lib/types';
import {
  validateVerificationIntegrity,
  isVerifiedAvailable,
  isVerifiedUnavailable,
  isUnverified,
  isInvalidNumber,
} from '@/lib/whatsapp/verifier';
import { INDIAN_STATES_AND_UTS } from '@/lib/locations/india';
import { FOOD_SERVICE_CATEGORIES } from '@/lib/categories/food-service';
import {
  getGoogleMapsUrl,
  getCoordinateMapsUrl,
  isValidCoordinate,
  constructFullAddress,
} from '@/lib/utils/maps';
import { isValidPhoneNumber } from '@/lib/deduplication/deduplicator';
import { classifyHospitalityTier } from '@/lib/classification/business-tier';
import {
  normalizeWhatsAppPhone,
  buildWhatsAppUrl,
  getDefaultWhatsAppDraft,
  getOpportunityWhatsAppDraft,
  openWhatsAppChat,
  WHATSAPP_TAB_NAME,
  WhatsAppTabMode,
} from '@/lib/utils/whatsapp';

function RestaurantsContent() {
  const searchParams = useSearchParams();
  const initialRunId = searchParams.get('run_id') || searchParams.get('job_id') || searchParams.get('search_id');
  const initialView = searchParams.get('view') === 'saved' ? 'saved' : 'live';

  // View Mode: 'live' (Discovered records / Active Campaign) vs 'saved' (Historical Database)
  const [activeTab, setActiveTab] = useState<'live' | 'saved'>(initialView);
  const [activeRunId, setActiveRunId] = useState<string | null>(initialRunId);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'running' | 'completed' | 'empty' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Auto-Refresh & Background Worker Polling
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeScanJob, setActiveScanJob] = useState<{
    id: string;
    name: string;
    status: string;
    discovered: number;
    completedTasks: number;
    totalTasks: number;
  } | null>(null);

  // Result Table Filters
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [businessType, setBusinessType] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState<PhoneFilterOption>('all');
  const [whatsAppFilter, setWhatsAppFilter] = useState<WhatsAppFilterOption>('all');
  const [qualificationFilter, setQualificationFilter] = useState<'all' | 'qualified' | 'disqualified' | 'unverified'>('all');
  const [opportunityFilter, setOpportunityFilter] = useState<string>('all');

  // WhatsApp Tab Navigation Mode: 'reuse' (re-uses existing WhatsApp Web tab) vs 'new_tab' (opens a new tab each click)
  const [whatsAppTabMode, setWhatsAppTabMode] = useState<WhatsAppTabMode>('reuse');

  // WhatsApp Message Preparation Modal
  const [whatsAppModal, setWhatsAppModal] = useState<{
    isOpen: boolean;
    business: Restaurant;
    businessName: string;
    phone: string;
    country?: string;
    draftText: string;
    selectedCategory: OpportunityCategoryCode;
  } | null>(null);

  const openWhatsAppDraft = (business: Restaurant) => {
    const norm = normalizeWhatsAppPhone(business.phone_number, business.country);
    if (!norm || !norm.isValid) return;
    const catCode = (business.opportunity?.categoryCode || (business.website_url ? 'B' : 'A')) as OpportunityCategoryCode;
    setWhatsAppModal({
      isOpen: true,
      business,
      businessName: business.business_name || 'Business',
      phone: business.phone_number || '',
      country: business.country,
      draftText: getOpportunityWhatsAppDraft(business, catCode),
      selectedCategory: catCode,
    });
  };

  const handleDirectWhatsAppClick = (e: React.MouseEvent, business: Restaurant) => {
    e.preventDefault();
    e.stopPropagation();
    const res = buildWhatsAppUrl(business.phone_number || '', { country: business.country });
    if (!res.url) {
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[WhatsApp Direct Chat]', {
        businessName: business.business_name,
        phone: business.phone_number,
        url: res.url,
        tabMode: whatsAppTabMode,
        targetTab: whatsAppTabMode === 'reuse' ? WHATSAPP_TAB_NAME : '_blank',
      });
    }
    openWhatsAppChat(res.url, whatsAppTabMode);
  };

  const handleOpenPreparedWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!whatsAppModal) return;
    const res = buildWhatsAppUrl(whatsAppModal.phone, { message: whatsAppModal.draftText, country: whatsAppModal.country });
    if (!res.url) return;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[WhatsApp Direct Chat]', {
        businessName: whatsAppModal.businessName,
        phone: whatsAppModal.phone,
        url: res.url,
        tabMode: whatsAppTabMode,
        targetTab: whatsAppTabMode === 'reuse' ? WHATSAPP_TAB_NAME : '_blank',
      });
    }
    openWhatsAppChat(res.url, whatsAppTabMode);
    setWhatsAppModal(null);
  };

  // WhatsApp Manual Verification Modal
  const [whatsAppVerifyModal, setWhatsAppVerifyModal] = useState<{
    isOpen: boolean;
    restaurant: Restaurant;
    targetStatus: 'whatsapp_available' | 'whatsapp_unavailable' | 'whatsapp_unknown';
    notes: string;
    confirmed: boolean;
    isSubmitting: boolean;
    error: string | null;
  } | null>(null);

  const openVerifyModal = (
    restaurant: Restaurant,
    targetStatus: 'whatsapp_available' | 'whatsapp_unavailable' | 'whatsapp_unknown' = 'whatsapp_available'
  ) => {
    setWhatsAppVerifyModal({
      isOpen: true,
      restaurant,
      targetStatus,
      notes: restaurant.whatsapp_verification_notes || '',
      confirmed: false,
      isSubmitting: false,
      error: null,
    });
  };

  const handleSaveVerification = async () => {
    if (!whatsAppVerifyModal) return;
    const { restaurant, targetStatus, notes, confirmed } = whatsAppVerifyModal;

    if ((targetStatus === 'whatsapp_available' || targetStatus === 'whatsapp_unavailable') && !confirmed) {
      setWhatsAppVerifyModal(prev => prev ? { ...prev, error: 'Please check the confirmation box to confirm you have personally checked this number.' } : null);
      return;
    }

    setWhatsAppVerifyModal(prev => prev ? { ...prev, isSubmitting: true, error: null } : null);

    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          verificationMethod: 'manual_user_check',
          verifiedBy: 'manual_operator',
          notes: notes.trim() || undefined,
          userConfirmed: confirmed,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update verification status');
      }

      const updated = data.restaurant as Restaurant;

      // Optimistically update restaurants list and inspectRecord
      setRestaurants(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
      if (inspectRecord && inspectRecord.id === updated.id) {
        setInspectRecord(prev => prev ? { ...prev, ...updated } : null);
      }

      setWhatsAppVerifyModal(null);
    } catch (err: any) {
      setWhatsAppVerifyModal(prev => prev ? { ...prev, isSubmitting: false, error: err.message || 'Error saving verification' } : null);
    }
  };

  // Selection & Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [inspectRecord, setInspectRecord] = useState<Restaurant | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [leadLists, setLeadLists] = useState<{ id: string; name: string }[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [listSuccessMsg, setListSuccessMsg] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Column Visibility Controls
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    tier: true,
    opportunity: true,
    category: true,
    rating: true,
    phone: true,
    website: true,
    address: true,
    city: true,
    state: true,
    coords: true,
    source: true,
    score: true,
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // Load Business Records
  const loadRestaurants = async (targetId: string | null = activeRunId, tab: 'live' | 'saved' = activeTab) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (targetId) {
        params.set('job_id', targetId);
      } else if (tab === 'live') {
        params.set('view', 'live');
      } else {
        params.set('view', 'saved');
      }

      const res = await fetch(`/api/restaurants?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        const list = Array.isArray(data.restaurants) ? data.restaurants : [];
        setRestaurants(list);
        setSearchStatus(list.length > 0 ? 'completed' : 'empty');
      } else {
        setErrorMessage(data.error || 'Failed to retrieve business records.');
        setSearchStatus('error');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error loading businesses');
      setSearchStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Initial load when targetId or tab changes
  useEffect(() => {
    loadRestaurants(activeRunId, activeTab);
  }, [activeRunId, activeTab]);

  // Live Auto-Refresh polling (polls every 3 seconds for new records persisted by background worker)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        // Check for active scan jobs
        const scansRes = await fetch('/api/scans', { cache: 'no-store' });
        const scansData = await scansRes.json();
        let runningFound = false;

        if (scansData.success && Array.isArray(scansData.jobs)) {
          const running = scansData.jobs.find((j: any) => j.status === 'running' || j.status === 'queued');
          if (running) {
            runningFound = true;
            setActiveScanJob({
              id: running.id,
              name: running.name,
              status: running.status,
              discovered: running.progress_counters?.discovered_count || 0,
              completedTasks: running.progress_counters?.completed_tasks || 0,
              totalTasks: running.progress_counters?.total_tasks || 0,
            });
          } else {
            setActiveScanJob(null);
          }
        }

        // Pull fresh records if a scan is active or if viewing a specific run
        if (runningFound || activeRunId) {
          const params = new URLSearchParams();
          if (activeRunId) {
            params.set('job_id', activeRunId);
          } else if (activeTab === 'live') {
            params.set('view', 'live');
          } else {
            params.set('view', 'saved');
          }

          const r = await fetch(`/api/restaurants?${params.toString()}`, { cache: 'no-store' });
          const d = await r.json();
          if (d.success && Array.isArray(d.restaurants)) {
            setRestaurants(d.restaurants);
            setSearchStatus(d.restaurants.length > 0 ? 'completed' : 'empty');
          }
        }
      } catch {
        // Silently catch background polling glitches
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh, activeRunId, activeTab]);

  // Load Lead Lists for Save Modal
  useEffect(() => {
    fetch('/api/lists', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.lists) {
          setLeadLists(d.lists);
          if (d.lists.length > 0) setSelectedListId(d.lists[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleTabChange = (tab: 'live' | 'saved') => {
    setActiveTab(tab);
    setErrorMessage(null);
    setCurrentPage(1);
    loadRestaurants(activeRunId, tab);
  };

  const resetAllFilters = () => {
    setSearch('');
    setStateFilter('');
    setCityFilter('');
    setCategoryFilter('');
    setBusinessType('all');
    setRatingFilter('');
    setPhoneFilter('all');
    setWhatsAppFilter('all');
    setQualificationFilter('all');
    setOpportunityFilter('all');
    setCurrentPage(1);
  };

  // Filtered rows based on user criteria
  const filteredRows = useMemo(() => {
    return restaurants.filter(r => {
      // 1. Keyword search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = (r.business_name || '').toLowerCase().includes(q);
        const matchesAddr = (r.formatted_address || '').toLowerCase().includes(q);
        const matchesBrand = (r.brand_name || '').toLowerCase().includes(q);
        const matchesPhone = (r.phone_number || '').includes(q);
        const matchesCity = (r.city || '').toLowerCase().includes(q) || (r.district || '').toLowerCase().includes(q);
        const matchesCat = (r.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesAddr && !matchesBrand && !matchesPhone && !matchesCity && !matchesCat) {
          return false;
        }
      }

      // 2. State filter
      if (stateFilter && (r.state || '').toLowerCase() !== stateFilter.toLowerCase()) {
        return false;
      }

      // 3. City filter
      if (cityFilter.trim()) {
        const c = cityFilter.trim().toLowerCase();
        const match =
          (r.city || '').toLowerCase().includes(c) ||
          (r.district || '').toLowerCase().includes(c) ||
          (r.locality || '').toLowerCase().includes(c);
        if (!match) return false;
      }

      // 4. Category filter
      if (categoryFilter && (r.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // 5. Rating filter
      if (ratingFilter) {
        if (ratingFilter === 'unrated') {
          if (r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating))) return false;
        } else {
          const minR = parseFloat(ratingFilter);
          if (r.rating === null || r.rating === undefined || isNaN(Number(r.rating)) || Number(r.rating) < minR) {
            return false;
          }
        }
      }

      // 6. Phone filter
      if (phoneFilter === 'with_phone') {
        if (!isValidPhoneNumber(r.phone_number)) return false;
      } else if (phoneFilter === 'without_phone') {
        if (isValidPhoneNumber(r.phone_number)) return false;
      }

      // 6b. WhatsApp Availability Filter
      if (whatsAppFilter !== 'all') {
        const rawPhone = r.phone_number;
        const isPhoneValid = Boolean(rawPhone && isValidPhoneNumber(rawPhone));
        const integrity = validateVerificationIntegrity(r, r.country);
        const effectiveStatus = integrity.status;

        if (whatsAppFilter === 'whatsapp_available') {
          if (!isVerifiedAvailable(effectiveStatus) || !isPhoneValid || (!r.normalized_phone && !r.international_phone)) {
            return false;
          }
        } else if (whatsAppFilter === 'whatsapp_unverified') {
          if (!isPhoneValid || !isUnverified(effectiveStatus)) {
            return false;
          }
        } else if (whatsAppFilter === 'whatsapp_unavailable') {
          if (!isVerifiedUnavailable(effectiveStatus)) {
            return false;
          }
        } else if (whatsAppFilter === 'invalid_number') {
          if (isPhoneValid && !isInvalidNumber(effectiveStatus)) {
            return false;
          }
        }
      }

      // 7. Business type
      if (businessType && businessType !== 'all') {
        const tier = classifyHospitalityTier(r);
        const isPremiumTier = tier.tier === 'luxury' || tier.tier === 'premium' || tier.isEstablishedChain;
        if (businessType === 'all_premium' && !isPremiumTier) return false;
        if (businessType === 'hotels' && tier.categoryGroup !== 'hotels') return false;
        if (businessType === 'fine_dining' && tier.categoryGroup !== 'fine_dining') return false;
        if (businessType === 'chains' && !tier.isEstablishedChain) return false;
      }

      // 8. Strict Qualification Status
      if (qualificationFilter !== 'all') {
        const qStatus = r.qualification_status || 'qualified';
        if (qualificationFilter === 'disqualified') {
          if (qStatus !== 'disqualified') return false;
        } else if (qStatus !== qualificationFilter) {
          return false;
        }
      }

      // 9. Opportunity Category Filter
      if (opportunityFilter && opportunityFilter !== 'all') {
        const catCode = r.opportunity?.categoryCode || (r.website_url ? 'B' : 'A');
        if (catCode !== opportunityFilter) return false;
      }

      return true;
    });
  }, [restaurants, search, stateFilter, cityFilter, categoryFilter, ratingFilter, phoneFilter, whatsAppFilter, businessType, qualificationFilter, opportunityFilter]);

  const whatsAppCounts = useMemo(() => {
    let available = 0;
    let unverified = 0;
    let unavailable = 0;
    let invalid = 0;

    for (const r of restaurants) {
      const isPhoneValid = Boolean(r.phone_number && isValidPhoneNumber(r.phone_number));
      const integrity = validateVerificationIntegrity(r, r.country);
      const effectiveStatus = integrity.status;

      if (!isPhoneValid || isInvalidNumber(effectiveStatus)) {
        invalid++;
      } else if (isVerifiedAvailable(effectiveStatus)) {
        available++;
      } else if (isVerifiedUnavailable(effectiveStatus)) {
        unavailable++;
      } else {
        unverified++;
      }
    }

    return { available, unverified, unavailable, invalid };
  }, [restaurants]);

  // Pagination slices
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAllVisible = () => {
    if (selectedIds.size === paginatedRows.length && paginatedRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRows.map(r => r.id)));
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          restaurantIds: selectedIds.size > 0 ? Array.from(selectedIds) : filteredRows.map(r => r.id),
          jobId: activeRunId,
          view: activeTab,
          phoneFilter,
        }),
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hospitality-leads-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Export failed', e);
      alert('Failed to generate export file');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToList = async () => {
    if (!selectedListId || selectedIds.size === 0) return;
    try {
      await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_items',
          listId: selectedListId,
          restaurantIds: Array.from(selectedIds),
        }),
      });
      setListSuccessMsg(`Saved ${selectedIds.size} leads to list!`);
      setTimeout(() => {
        setListSuccessMsg(null);
        setShowListModal(false);
      }, 1500);
    } catch {
      alert('Failed to save to list');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Radio size={14} className="text-emerald-400 animate-pulse" />
            <span>LIVE BUSINESS DISCOVERY ENGINE & PIPELINE</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
            Business Discovery & Lead Finder
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time discovered hospitality establishments across India. Background scans continuously stream and auto-save authentic leads to the database.
          </p>
        </div>

        {/* View Switcher Tabs & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs: Live Discovered vs Saved History */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => handleTabChange('live')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'live'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio size={12} className={activeTab === 'live' ? 'animate-pulse' : ''} />
              Live Discovered
            </button>
            <button
              onClick={() => handleTabChange('saved')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-slate-800 text-emerald-300 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database size={12} />
              Saved History
            </button>
          </div>

          {/* Quick Links to Scan Workflow */}
          <Link
            href="/searches"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-colors"
          >
            <Sparkles size={13} />
            New Scan Campaign
          </Link>
          <Link
            href="/scans"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Compass size={13} />
            Scan Jobs Manager
          </Link>

          {/* Live Auto-Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              autoRefresh
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title={autoRefresh ? 'Live Auto-Refresh Active (Polling every 3s)' : 'Live Auto-Refresh Paused'}
          >
            <Radio size={12} className={autoRefresh ? 'animate-pulse text-emerald-400' : 'text-slate-500'} />
            <span>{autoRefresh ? 'Live Sync' : 'Sync Off'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => loadRestaurants(activeRunId, activeTab)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors disabled:opacity-40"
            title="Refresh current business list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* WhatsApp Tab Navigation Mode Control */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            <span className="text-[10px] text-slate-500 font-bold px-1.5 uppercase hidden sm:inline">WA Tab:</span>
            <button
              type="button"
              onClick={() => setWhatsAppTabMode('reuse')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                whatsAppTabMode === 'reuse'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Reuses a single dedicated WhatsApp tab so consecutive clicks switch chats without opening new tabs or requiring WhatsApp to be closed"
            >
              <RefreshCw size={11} className={whatsAppTabMode === 'reuse' ? 'text-white' : 'text-slate-500'} />
              <span>Reuse Tab</span>
            </button>
            <button
              type="button"
              onClick={() => setWhatsAppTabMode('new_tab')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                whatsAppTabMode === 'new_tab'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Opens a fresh new browser tab for each WhatsApp chat"
            >
              <span>New Tab</span>
            </button>
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowListModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5"
            >
              <BookmarkPlus size={14} />
              Save to List ({selectedIds.size})
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5"
            >
              <Layers size={14} />
              Columns
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-xl z-30 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Toggle Columns
                </span>
                {Object.keys(visibleColumns).map(col => (
                  <label key={col} className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-800/60 p-1.5 rounded cursor-pointer capitalize">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() => setVisibleColumns({ ...visibleColumns, [col]: !visibleColumns[col] })}
                      className="rounded accent-emerald-500"
                    />
                    <span>{col}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting || restaurants.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <FileDown size={14} />
            CSV
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={isExporting || restaurants.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <FileDown size={14} />
            Excel
          </button>
        </div>
      </div>

      {/* Active Background Scan Notification Banner */}
      {activeScanJob && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-200 shadow-lg">
          <div className="flex items-center gap-3">
            <Radio size={18} className="text-emerald-400 animate-pulse shrink-0" />
            <div>
              <span className="font-bold text-white text-sm block">
                Active Scan Campaign in Progress: {activeScanJob.name}
              </span>
              <p className="text-slate-300 text-xs">
                Tasks Completed: <strong>{activeScanJob.completedTasks} / {activeScanJob.totalTasks}</strong> • Discovered: <strong className="text-emerald-300">{activeScanJob.discovered} records</strong> • Auto-saving to database and streaming live
              </p>
            </div>
          </div>
          <Link
            href="/scans"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Compass size={13} />
            Open Scan Manager
          </Link>
        </div>
      )}

      {/* Campaign-Specific View Notice */}
      {activeRunId && (
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Viewing Campaign Results:</span>
            <span className="font-mono text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{activeRunId}</span>
            <span className="text-slate-500">•</span>
            <span>{restaurants.length} records discovered</span>
          </div>
          <button
            onClick={() => {
              setActiveRunId(null);
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', '/restaurants');
              }
              loadRestaurants(null, activeTab);
            }}
            className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold text-xs"
          >
            View All Discovered Records →
          </button>
        </div>
      )}

      {/* Saved Database Status Banner */}
      {activeTab === 'saved' && (
        <div className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl text-xs flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-emerald-400" />
            <span>Viewing <strong>Historical Records</strong> persisted in Supabase database (<span className="font-mono text-slate-200">{restaurants.length} records</span>).</span>
          </div>
          <button
            onClick={() => loadRestaurants(activeRunId, 'saved')}
            className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      )}

      {/* Real-Time Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">Total Discovered</span>
          <span className="text-xl font-bold text-white">{restaurants.length}</span>
          <span className="text-[10px] text-slate-500 block">Persisted records</span>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">Matching Filter</span>
          <span className="text-xl font-bold text-emerald-400">{filteredRows.length}</span>
          <span className="text-[10px] text-slate-500 block">In active table view</span>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">With Phone Number</span>
          <span className="text-xl font-bold text-emerald-400">
            {restaurants.filter(r => isValidPhoneNumber(r.phone_number)).length}
          </span>
          <span className="text-[10px] text-slate-500 block">Direct dial available</span>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">★ 4.0+ Stars Rated</span>
          <span className="text-xl font-bold text-amber-400">
            {restaurants.filter(r => r.rating !== null && Number(r.rating) >= 4.0).length}
          </span>
          <span className="text-[10px] text-slate-500 block">High quality ratings</span>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">Luxury & Chains</span>
          <span className="text-xl font-bold text-purple-400">
            {restaurants.filter(r => r.hospitality_tier === 'luxury' || r.is_established_chain).length}
          </span>
          <span className="text-[10px] text-slate-500 block">Hotels & brands</span>
        </div>
      </div>

      {/* Streamlined Search & Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Filter size={14} className="text-emerald-400" />
            Filter Discovered Records
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium inline-flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={11} />
              Reset Filters
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Search Keywords</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, brand, address, phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">State / Territory</label>
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Indian States & UTs</option>
              {INDIAN_STATES_AND_UTS.map(s => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">City / District</label>
            <input
              type="text"
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              placeholder="e.g. Lucknow, Noida, Mumbai..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Food Category</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Categories</option>
              {FOOD_SERVICE_CATEGORIES.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-2 border-t border-slate-800/60">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Minimum Rating</label>
            <select
              value={ratingFilter}
              onChange={e => setRatingFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="">All (Including Unrated)</option>
              <option value="4.0">★ 4.0+ Stars (Verified)</option>
              <option value="4.2">★ 4.2+ Stars (High Quality)</option>
              <option value="4.5">★ 4.5+ Stars (Top Tier)</option>
              <option value="4.7">★ 4.7+ Stars (Elite Luxury)</option>
              <option value="unrated">Unrated Records Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Phone Number Filter</label>
            <select
              value={phoneFilter}
              onChange={e => setPhoneFilter(e.target.value as PhoneFilterOption)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="all">All Leads (Any Phone)</option>
              <option value="with_phone">With Phone Number (Valid Only)</option>
              <option value="without_phone">Without Phone Number Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">WhatsApp Availability</label>
            <select
              value={whatsAppFilter}
              onChange={e => setWhatsAppFilter(e.target.value as WhatsAppFilterOption)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="all">All Numbers ({restaurants.length})</option>
              <option value="whatsapp_available">WhatsApp Available — Verified ({whatsAppCounts.available})</option>
              <option value="whatsapp_unverified">WhatsApp Unverified ({whatsAppCounts.unverified})</option>
              <option value="whatsapp_unavailable">WhatsApp Unavailable — Verified ({whatsAppCounts.unavailable})</option>
              <option value="invalid_number">Invalid Phone Number ({whatsAppCounts.invalid})</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Opportunity (A–I)</label>
            <select
              value={opportunityFilter}
              onChange={e => setOpportunityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-rose-500 font-medium"
            >
              <option value="all">All Opportunities</option>
              <option value="A">A: No Website (Prime Prospect)</option>
              <option value="B">B: Website Without Menu</option>
              <option value="C">C: PDF / Image Menu Only</option>
              <option value="D">D: Mobile Unresponsive</option>
              <option value="E">E: Broken Website</option>
              <option value="F">F: Social Media Only</option>
              <option value="G">G: Aggregator Only</option>
              <option value="I">I: QR Dine-In Opportunity</option>
              <option value="H">H: Modern Website</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Business Classification</label>
            <select
              value={businessType}
              onChange={e => setBusinessType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Establishments</option>
              <option value="all_premium">All Premium & Luxury</option>
              <option value="hotels">Luxury & Business Hotels</option>
              <option value="fine_dining">Fine Dining & Rooftops</option>
              <option value="chains">Established National Chains</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Qualification Status</label>
            <select
              value={qualificationFilter}
              onChange={e => setQualificationFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="all">All Records</option>
              <option value="qualified">Qualified Leads Only</option>
              <option value="unverified">Needs Review (Unverified Rating)</option>
              <option value="disqualified">Disqualified / Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert Display */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 shadow-md">
          <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block text-sm">Discovery Error</span>
            <p className="text-rose-200">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
          <RefreshCw size={28} className="animate-spin mx-auto text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-200">Retrieving Discovered Businesses...</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Connecting to database and synchronizing latest verified records.
          </p>
        </div>
      )}

      {/* Empty State: No businesses in database yet */}
      {!loading && restaurants.length === 0 && (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto text-emerald-400">
            <UtensilsCrossed size={26} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Discovered Businesses Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Launch a live scan campaign across Indian states and districts to automatically discover, verify, and save restaurant leads.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/searches"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition-colors"
            >
              <Sparkles size={13} />
              Launch New Scan Campaign
            </Link>
            <Link
              href="/scans"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Compass size={13} />
              Open Scan Jobs Manager
            </Link>
          </div>
        </div>
      )}

      {/* Filtered Empty State: Records exist in DB but none match active filter */}
      {!loading && restaurants.length > 0 && filteredRows.length === 0 && (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto text-slate-400">
            <Search size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-200">
            No businesses match the selected filters
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You have {restaurants.length} total discovered businesses in the database, but none match the current keywords, category, or rating filter.
          </p>
          <button
            onClick={resetAllFilters}
            className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} />
            Reset All Filters
          </button>
        </div>
      )}

      {/* Results Table (Displayed only when results exist) */}
      {!loading && filteredRows.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="p-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={paginatedRows.length > 0 && selectedIds.size === paginatedRows.length}
                      onChange={selectAllVisible}
                      className="rounded accent-emerald-500 cursor-pointer"
                      aria-label="Select all rows"
                    />
                  </th>
                  {visibleColumns.name && <th className="py-3 px-3">Business / Brand</th>}
                  {visibleColumns.tier && <th className="py-3 px-3">Tier</th>}
                  {visibleColumns.opportunity && <th className="py-3 px-3">Opportunity</th>}
                  {visibleColumns.category && <th className="py-3 px-3">Category</th>}
                  {visibleColumns.rating && <th className="py-3 px-3">Rating</th>}
                  {visibleColumns.phone && <th className="py-3 px-3">Phone</th>}
                  {visibleColumns.website && <th className="py-3 px-3">Website</th>}
                  {visibleColumns.address && <th className="py-3 px-3">Address</th>}
                  {visibleColumns.city && <th className="py-3 px-3">City</th>}
                  {visibleColumns.state && <th className="py-3 px-3">State</th>}
                  {visibleColumns.coords && <th className="py-3 px-3">GPS</th>}
                  {visibleColumns.score && <th className="py-3 px-3">Score</th>}
                  {visibleColumns.source && <th className="py-3 px-3">Source</th>}
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {paginatedRows.map(r => {
                  const isSelected = selectedIds.has(r.id);
                  const mapsUrl = getGoogleMapsUrl(r);
                  const hasValidCoords = isValidCoordinate(r.latitude, r.longitude);
                  const coordUrl = getCoordinateMapsUrl(r.latitude, r.longitude, r);
                  const displayAddress = constructFullAddress(r);

                  const isLuxury = r.hospitality_tier === 'luxury';
                  const isPremium = r.hospitality_tier === 'premium';
                  const isChain = r.is_established_chain;

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-emerald-950/15' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(r.id)}
                          className="rounded accent-emerald-500 cursor-pointer"
                          aria-label={`Select ${r.business_name}`}
                        />
                      </td>

                      {/* Business Name & Brand Badge */}
                      {visibleColumns.name && (
                        <td className="py-3 px-3 max-w-[220px]">
                          <div className="space-y-0.5">
                            <button
                              onClick={() => setInspectRecord(r)}
                              className="font-bold text-slate-100 hover:text-emerald-400 text-left truncate block w-full transition-colors"
                              title={r.business_name}
                            >
                              {r.business_name}
                            </button>
                            {r.brand_name && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                                <Crown size={10} className="shrink-0" />
                                {r.brand_name}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Tier / Classification */}
                      {visibleColumns.tier && (
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isLuxury ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                              <Crown size={10} />
                              Luxury
                            </span>
                          ) : isChain ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1">
                              <Building2 size={10} />
                              Chain
                            </span>
                          ) : isPremium ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
                              <Award size={10} />
                              Fine Dining
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              Standard
                            </span>
                          )}
                        </td>
                      )}

                      {/* Opportunity Badge */}
                      {visibleColumns.opportunity && (
                        <td className="py-3 px-3 whitespace-nowrap">
                          {(() => {
                            const opp = r.opportunity || (r.website_url ? { categoryCode: 'B', categoryLabel: 'No Menu', badgeColor: '#3B82F6' } : { categoryCode: 'A', categoryLabel: 'No Website', badgeColor: '#EF4444' });
                            return (
                              <span
                                style={{ borderColor: `${opp.badgeColor}40`, backgroundColor: `${opp.badgeColor}15`, color: opp.badgeColor }}
                                className="px-2 py-0.5 rounded border text-[10px] font-bold inline-flex items-center gap-1 shadow-sm"
                                title={opp.categoryLabel}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opp.badgeColor }} />
                                <span>{opp.categoryCode}: {opp.categoryLabel}</span>
                              </span>
                            );
                          })()}
                        </td>
                      )}

                      {/* Category */}
                      {visibleColumns.category && (
                        <td className="py-3 px-3 text-slate-400 max-w-[140px] truncate">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                            {r.category || 'Hospitality'}
                          </span>
                        </td>
                      )}

                      {/* Verified Rating */}
                      {visibleColumns.rating && (
                        <td className="py-3 px-3 whitespace-nowrap">
                          {r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating)) ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-extrabold">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              <span>{Number(r.rating).toFixed(1)}</span>
                              {r.review_count !== null && r.review_count !== undefined && (
                                <span className="text-slate-400 font-normal text-[10px]">
                                  ({Number(r.review_count).toLocaleString('en-IN')})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">
                              {r.source_provider === 'osm_overpass' ? 'Unrated (OSM)' : 'Rating unavailable'}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Phone */}
                      {visibleColumns.phone && (
                        <td className="py-3 px-3 whitespace-nowrap font-mono">
                          {r.phone_number ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`tel:${r.phone_number}`}
                                className="text-emerald-400 hover:underline font-semibold"
                              >
                                {r.phone_number}
                              </a>
                              <button
                                onClick={() => copyToClipboard(r.phone_number!, `tbl-phone-${r.id}`)}
                                className="text-slate-500 hover:text-slate-300 p-0.5"
                                title="Copy Phone"
                              >
                                {copiedField === `tbl-phone-${r.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              </button>
                              {normalizeWhatsAppPhone(r.phone_number, r.country).isValid ? (
                                <div className="flex items-center gap-1 pl-1">
                                  <a
                                    href={buildWhatsAppUrl(r.phone_number, { country: r.country }).url}
                                    target={whatsAppTabMode === 'reuse' ? WHATSAPP_TAB_NAME : '_blank'}
                                    rel="noopener noreferrer"
                                    onClick={e => handleDirectWhatsAppClick(e, r)}
                                    className={`px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 text-[10px] font-sans font-semibold shadow-sm ${
                                      isVerifiedAvailable(r.whatsapp_status)
                                        ? 'bg-emerald-900/90 text-emerald-300 hover:bg-emerald-800 border-emerald-700'
                                        : 'bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900 border-emerald-800/50 hover:text-emerald-200'
                                    }`}
                                    title={
                                      isVerifiedAvailable(r.whatsapp_status)
                                        ? `WhatsApp Available (Verified account) — Click to open chat for ${normalizeWhatsAppPhone(r.phone_number, r.country).formattedDisplay} (${whatsAppTabMode === 'reuse' ? 'reusing active WhatsApp tab' : 'new tab'})`
                                        : `Open WhatsApp Chat directly for ${normalizeWhatsAppPhone(r.phone_number, r.country).formattedDisplay} (WhatsApp account availability is unverified; ${whatsAppTabMode === 'reuse' ? 'reusing active WhatsApp tab' : 'new tab'})`
                                    }
                                  >
                                    <MessageCircle size={11} className="shrink-0" />
                                    <span>WhatsApp</span>
                                    {isVerifiedAvailable(r.whatsapp_status) ? (
                                      <span className="text-[9px] px-1 bg-emerald-600/60 text-white rounded font-mono font-bold" title="WhatsApp availability confirmed">✓</span>
                                    ) : isVerifiedUnavailable(r.whatsapp_status) ? (
                                      <span className="text-[9px] px-1 bg-rose-600/60 text-white rounded font-mono font-bold" title="Confirmed not on WhatsApp">✗</span>
                                    ) : (
                                      <span className="text-[9px] text-emerald-500/70 font-normal">(unverified)</span>
                                    )}
                                  </a>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openWhatsAppDraft(r);
                                    }}
                                    className="p-1 rounded bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-emerald-400 border border-slate-700/40 transition-colors"
                                    title="Draft WhatsApp message with business name prefilled"
                                  >
                                    <MessageSquare size={11} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openVerifyModal(r);
                                    }}
                                    className={`p-1 rounded border transition-colors flex items-center gap-0.5 text-[9px] font-sans font-semibold ${
                                      isVerifiedAvailable(r.whatsapp_status)
                                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900'
                                        : isVerifiedUnavailable(r.whatsapp_status)
                                        ? 'bg-rose-950/90 text-rose-300 border-rose-800/80 hover:bg-rose-900'
                                        : 'bg-slate-800/70 text-slate-300 border-slate-700/60 hover:bg-slate-700 hover:text-emerald-300'
                                    }`}
                                    title={
                                      isVerifiedAvailable(r.whatsapp_status)
                                        ? `WhatsApp Availability: Confirmed Available (${r.whatsapp_verification_method || 'manual'}). Click to manage or reset verification.`
                                        : isVerifiedUnavailable(r.whatsapp_status)
                                        ? 'WhatsApp Availability: Confirmed Unavailable. Click to manage or reset.'
                                        : 'Verify or update WhatsApp availability status for this lead'
                                    }
                                  >
                                    <ShieldCheck size={11} className={isVerifiedAvailable(r.whatsapp_status) ? 'text-emerald-400' : 'text-slate-400'} />
                                    <span className="hidden xl:inline">{isVerifiedAvailable(r.whatsapp_status) ? 'Verified' : 'Verify'}</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 pl-1">
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed flex items-center gap-1 text-[10px] font-sans"
                                    title={`WhatsApp unavailable: ${normalizeWhatsAppPhone(r.phone_number, r.country).error || 'Invalid phone number'}`}
                                  >
                                    <MessageCircle size={11} className="shrink-0 opacity-40" />
                                    <span>WhatsApp</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 italic">Unavailable</span>
                          )}
                        </td>
                      )}

                      {/* Website */}
                      {visibleColumns.website && (
                        <td className="py-3 px-3 max-w-[130px] truncate">
                          {r.website_url ? (
                            <a
                              href={r.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:underline inline-flex items-center gap-1 truncate"
                              title={r.website_url}
                            >
                              <Globe size={11} className="shrink-0" />
                              <span className="truncate">Visit</span>
                            </a>
                          ) : (
                            <span className="text-slate-600 text-[11px]">Not listed</span>
                          )}
                        </td>
                      )}

                      {/* Address with Google Maps Navigation */}
                      {visibleColumns.address && (
                        <td className="py-3 px-3 max-w-[200px]">
                          {mapsUrl && displayAddress && displayAddress.toLowerCase() !== 'india' ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Navigate to ${displayAddress} on Google Maps`}
                              className="text-slate-300 hover:text-emerald-400 hover:underline truncate block transition-colors"
                            >
                              {displayAddress}
                            </a>
                          ) : (
                            <span className="text-slate-400 truncate block">
                              {displayAddress || 'Address unavailable'}
                            </span>
                          )}
                        </td>
                      )}

                      {/* City */}
                      {visibleColumns.city && (
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          {r.city || r.district || '—'}
                        </td>
                      )}

                      {/* State */}
                      {visibleColumns.state && (
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {r.state || 'India'}
                        </td>
                      )}

                      {/* Coordinates (GPS) */}
                      {visibleColumns.coords && (
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                          {hasValidCoords && coordUrl ? (
                            <a
                              href={coordUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open exact GPS coordinates in Google Maps"
                              className="text-purple-400 hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <MapPin size={11} className="text-purple-400 shrink-0" />
                              <span>
                                {Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}
                              </span>
                            </a>
                          ) : (
                            <span className="text-slate-600 italic">Unavailable</span>
                          )}
                        </td>
                      )}

                      {/* Relevance Score */}
                      {visibleColumns.score && (
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200">
                              {r.relevance_score ?? r.lead_score}
                            </span>
                            <span className="text-[10px] text-slate-500">/100</span>
                          </div>
                        </td>
                      )}

                      {/* Discovery Source Engine */}
                      {visibleColumns.source && (
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              r.source_provider === 'google_places'
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {r.source_provider === 'google_places' ? 'Google Places' : 'OpenStreetMap'}
                          </span>
                        </td>
                      )}

                      {/* Actions Column */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Open ${r.business_name} in Google Maps`}
                              className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 transition-all inline-flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <MapPin size={12} className="text-emerald-400" />
                              <span>Map</span>
                            </a>
                          )}

                          <button
                            onClick={() => setInspectRecord(r)}
                            className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/60">
            <div>
              Showing <span className="font-semibold text-slate-200">{filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
              <span className="font-semibold text-slate-200">
                {Math.min(currentPage * pageSize, filteredRows.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-200">{filteredRows.length}</span> establishments
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
                aria-label="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
                aria-label="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Inspection Modal / Drawer */}
      {inspectRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Discovered Business Lead
                  </span>
                  {inspectRecord.hospitality_tier === 'luxury' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Luxury / 5-Star
                    </span>
                  )}
                  {inspectRecord.is_established_chain && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      National Chain
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  {inspectRecord.business_name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">
                    {inspectRecord.category} • {inspectRecord.district || inspectRecord.city}, {inspectRecord.state}
                  </span>
                  {inspectRecord.rating !== null && inspectRecord.rating !== undefined && !isNaN(Number(inspectRecord.rating)) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      {Number(inspectRecord.rating).toFixed(1)}
                      {inspectRecord.review_count !== null && (
                        <span className="text-slate-400 font-normal">
                          ({Number(inspectRecord.review_count).toLocaleString('en-IN')} reviews)
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setInspectRecord(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Close Inspection Modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Phone */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="text-slate-400 font-semibold block">Official Phone & WhatsApp</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-mono">
                    {inspectRecord.phone_number || 'Unavailable'}
                  </span>
                  {inspectRecord.phone_number && (
                    <button
                      onClick={() => copyToClipboard(inspectRecord.phone_number!, 'phone')}
                      className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      {copiedField === 'phone' ? <Check size={12} /> : <Copy size={12} />}
                      Copy
                    </button>
                  )}
                </div>
                {inspectRecord.phone_number && (
                  normalizeWhatsAppPhone(inspectRecord.phone_number, inspectRecord.country).isValid ? (
                    <>
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                        <a
                          href={buildWhatsAppUrl(inspectRecord.phone_number || '', { country: inspectRecord.country }).url}
                          target={whatsAppTabMode === 'reuse' ? WHATSAPP_TAB_NAME : '_blank'}
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.preventDefault();
                            const res = buildWhatsAppUrl(inspectRecord.phone_number || '', { country: inspectRecord.country });
                            if (!res.url) return;
                            if (process.env.NODE_ENV !== 'production') {
                              console.log('[WhatsApp Direct Chat]', {
                                businessName: inspectRecord.business_name,
                                phone: inspectRecord.phone_number,
                                url: res.url,
                                tabMode: whatsAppTabMode,
                                targetTab: whatsAppTabMode === 'reuse' ? WHATSAPP_TAB_NAME : '_blank',
                              });
                            }
                            openWhatsAppChat(res.url, whatsAppTabMode);
                          }}
                          className={`px-2.5 py-1 rounded font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors ${
                            isVerifiedAvailable(inspectRecord.whatsapp_status)
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100'
                          }`}
                          title={
                            isVerifiedAvailable(inspectRecord.whatsapp_status)
                              ? `WhatsApp Available (Verified account) — Click to open chat for ${normalizeWhatsAppPhone(inspectRecord.phone_number, inspectRecord.country).formattedDisplay} (${whatsAppTabMode === 'reuse' ? 'reusing active WhatsApp tab' : 'new tab'})`
                              : `Open WhatsApp Chat for ${normalizeWhatsAppPhone(inspectRecord.phone_number, inspectRecord.country).formattedDisplay} (WhatsApp account availability is unverified; ${whatsAppTabMode === 'reuse' ? 'reusing active WhatsApp tab' : 'new tab'})`
                          }
                        >
                          <MessageCircle size={13} />
                          <span>Open WhatsApp</span>
                          {isVerifiedAvailable(inspectRecord.whatsapp_status) ? (
                            <span className="text-[10px] px-1 bg-emerald-800 text-white rounded font-bold">✓ Verified</span>
                          ) : isVerifiedUnavailable(inspectRecord.whatsapp_status) ? (
                            <span className="text-[10px] px-1 bg-rose-800 text-white rounded font-bold">✗ Unavailable</span>
                          ) : (
                            <span className="text-[10px] text-emerald-200/70 font-normal">(Unverified)</span>
                          )}
                        </a>
                        <button
                          onClick={() => openWhatsAppDraft(inspectRecord)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700"
                          title="Draft WhatsApp message with business name prefilled"
                        >
                          <MessageSquare size={13} />
                          Prepare Message
                        </button>
                      </div>

                      {/* WhatsApp Verification Status & Manual Audit Actions Card */}
                      <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                            <ShieldCheck size={13} className={isVerifiedAvailable(inspectRecord.whatsapp_status) ? 'text-emerald-400' : 'text-slate-400'} />
                            WhatsApp Verification
                          </span>
                          {isVerifiedAvailable(inspectRecord.whatsapp_status) ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 size={10} /> Verified Available
                            </span>
                          ) : isVerifiedUnavailable(inspectRecord.whatsapp_status) ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold flex items-center gap-1">
                              <XCircle size={10} /> Confirmed Unavailable
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-medium flex items-center gap-1">
                              <Clock size={10} /> Unverified (Unknown)
                            </span>
                          )}
                        </div>

                        {inspectRecord.whatsapp_verified_at && (
                          <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Method:</span>
                              <span className="font-mono text-slate-200">{inspectRecord.whatsapp_verification_method || 'manual_user_check'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Verified Date:</span>
                              <span className="text-slate-300">{new Date(inspectRecord.whatsapp_verified_at).toLocaleDateString()}</span>
                            </div>
                            {inspectRecord.whatsapp_verified_phone && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Verified Phone:</span>
                                <span className="font-mono text-emerald-400">+{inspectRecord.whatsapp_verified_phone}</span>
                              </div>
                            )}
                            {inspectRecord.whatsapp_verification_notes && (
                              <div className="pt-1 text-[10px] text-slate-400 italic border-t border-slate-800">
                                &quot;{inspectRecord.whatsapp_verification_notes}&quot;
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => openVerifyModal(inspectRecord, 'whatsapp_available')}
                            className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Confirm that you personally verified this number in WhatsApp"
                          >
                            <ShieldCheck size={12} />
                            <span>Mark Verified</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openVerifyModal(inspectRecord, 'whatsapp_unavailable')}
                            className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Confirm that this number is not registered on WhatsApp"
                          >
                            <ShieldX size={12} />
                            <span>Mark Unavailable</span>
                          </button>
                          {(isVerifiedAvailable(inspectRecord.whatsapp_status) || isVerifiedUnavailable(inspectRecord.whatsapp_status)) && (
                            <button
                              type="button"
                              onClick={() => openVerifyModal(inspectRecord, 'whatsapp_unknown')}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                              title="Reset verification state back to unverified"
                            >
                              Reset to Unverified
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <span
                        className="px-2.5 py-1 rounded bg-slate-800/40 text-slate-500 text-xs flex items-center gap-1.5 border border-slate-800 cursor-not-allowed"
                        title={`WhatsApp unavailable: ${normalizeWhatsAppPhone(inspectRecord.phone_number, inspectRecord.country).error || 'Invalid phone number format'}`}
                      >
                        <MessageCircle size={13} className="opacity-40" />
                        WhatsApp Unavailable ({normalizeWhatsAppPhone(inspectRecord.phone_number, inspectRecord.country).error || 'Invalid Number'})
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* Website */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold block">Official Website</span>
                {inspectRecord.website_url ? (
                  <a
                    href={inspectRecord.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1 truncate"
                  >
                    {inspectRecord.website_url}
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="text-slate-500 italic">Not Listed</span>
                )}
              </div>

              {/* Brand & Tier */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold block">Brand Group</span>
                <span className="text-slate-200 font-semibold">
                  {inspectRecord.brand_name || 'Independent Business'}
                </span>
              </div>

              {/* Source & Run ID */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold block">Discovery Source</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-mono uppercase">
                    {inspectRecord.source_provider || 'OpenStreetMap'}
                  </span>
                  {inspectRecord.search_id && (
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      ({inspectRecord.search_id})
                    </span>
                  )}
                </div>
              </div>

              {/* Full Address */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-slate-400 font-semibold block">Full Address</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-200">{constructFullAddress(inspectRecord)}</span>
                  {getGoogleMapsUrl(inspectRecord) && (
                    <a
                      href={getGoogleMapsUrl(inspectRecord)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-slate-800 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 shrink-0"
                    >
                      <MapPin size={11} />
                      Open Maps
                    </a>
                  )}
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-slate-400 font-semibold block">GPS Coordinates</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-mono">
                    {inspectRecord.latitude && inspectRecord.longitude
                      ? `${inspectRecord.latitude}, ${inspectRecord.longitude}`
                      : 'Coordinates unavailable'}
                  </span>
                  {isValidCoordinate(inspectRecord.latitude, inspectRecord.longitude) && (
                    <a
                      href={getCoordinateMapsUrl(inspectRecord.latitude, inspectRecord.longitude, inspectRecord)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <Compass size={11} />
                      Navigate via GPS
                    </a>
                  )}
                </div>
              </div>

              {/* Candidate Audit Checks & Verification Trail */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold block">Candidate Audit Trail & Policy Checks</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      inspectRecord.qualification_status === 'qualified'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : inspectRecord.qualification_status === 'unverified'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {inspectRecord.qualification_status || 'qualified'}
                  </span>
                </div>

                {inspectRecord.audit_trail && inspectRecord.audit_trail.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {inspectRecord.audit_trail.map((chk, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg border text-[11px] flex items-start gap-2 ${
                          chk.status === 'passed'
                            ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                            : chk.status === 'unverified'
                            ? 'bg-amber-950/20 border-amber-900/40 text-amber-300'
                            : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                        }`}
                      >
                        {chk.status === 'passed' && <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />}
                        {chk.status === 'unverified' && <HelpCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />}
                        {chk.status === 'failed' && <XCircle size={13} className="text-rose-400 shrink-0 mt-0.5" />}
                        <div className="space-y-0.5">
                          <span className="font-semibold block">{chk.check_name}</span>
                          <p className="text-slate-300 text-[10px]">{chk.evidence}</p>
                          <span className="text-[9px] text-slate-500 font-mono block">Source: {chk.source_used}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 pt-1 text-[11px]">
                    {inspectRecord.qualification_reasons && inspectRecord.qualification_reasons.length > 0 && (
                      <div className="space-y-1">
                        {inspectRecord.qualification_reasons.map((r, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 size={12} />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {inspectRecord.disqualification_reason && (
                      <div className="flex items-center gap-1.5 text-rose-400 pt-1">
                        <XCircle size={12} />
                        <span>{inspectRecord.disqualification_reason}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                onClick={() => setInspectRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prepare WhatsApp Outreach Modal */}
      {whatsAppModal && whatsAppModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Prepare WhatsApp Outreach</h3>
                  <span className="text-xs text-slate-400">
                    {whatsAppModal.businessName} • {normalizeWhatsAppPhone(whatsAppModal.phone).formattedDisplay || whatsAppModal.phone}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppModal(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Opportunity Pitch Angle (Categories A–I)
                </label>
                <select
                  value={whatsAppModal.selectedCategory}
                  onChange={e => {
                    const cat = e.target.value as OpportunityCategoryCode;
                    const newDraft = getOpportunityWhatsAppDraft(whatsAppModal.business, cat);
                    setWhatsAppModal({
                      ...whatsAppModal,
                      selectedCategory: cat,
                      draftText: newDraft,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="A">Category A: No Website Pitch (Stop Aggregator Commissions)</option>
                  <option value="B">Category B: Website Without Menu Pitch (Show Dishes & Prices)</option>
                  <option value="C">Category C: PDF / Image Menu Pitch (Interactive Mobile Menu)</option>
                  <option value="D">Category D: Mobile Unresponsive Pitch (Mobile-First Overhaul)</option>
                  <option value="E">Category E: Broken Website Pitch (Emergency Rebuild)</option>
                  <option value="F">Category F: Social Media Only Pitch (Custom Link-in-Bio Ordering)</option>
                  <option value="G">Category G: Aggregator Only Pitch (0% Commission Direct Portal)</option>
                  <option value="I">Category I: QR Dine-In Pitch (Contactless Table Ordering)</option>
                  <option value="H">Category H: Modern Website Pitch (Loyalty & VIP Growth)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Message Content (Personalized with Business Name & City)
                </label>
                <textarea
                  value={whatsAppModal.draftText}
                  onChange={e => setWhatsAppModal({ ...whatsAppModal, draftText: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-sans resize-none leading-relaxed"
                  placeholder="Type your WhatsApp message..."
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Clicking &quot;Open in WhatsApp Web&quot; opens official WhatsApp Web directly to this restaurant&apos;s chat with your draft unsent. Manual user action only — never sends messages automatically.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsAppModal.draftText);
                  setCopiedField('modal-pitch');
                  setTimeout(() => setCopiedField(null), 2000);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 inline-flex items-center gap-1.5"
              >
                {copiedField === 'modal-pitch' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedField === 'modal-pitch' ? 'Copied Pitch!' : 'Copy Pitch'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWhatsAppModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOpenPreparedWhatsApp}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md shadow-emerald-950/50"
                >
                  <Send size={13} />
                  Open in WhatsApp Web
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Manual Verification Confirmation Modal */}
      {whatsAppVerifyModal && whatsAppVerifyModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                  whatsAppVerifyModal.targetStatus === 'whatsapp_available'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : whatsAppVerifyModal.targetStatus === 'whatsapp_unavailable'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {whatsAppVerifyModal.targetStatus === 'whatsapp_available'
                      ? 'Confirm WhatsApp Available'
                      : whatsAppVerifyModal.targetStatus === 'whatsapp_unavailable'
                      ? 'Confirm WhatsApp Unavailable'
                      : 'Reset WhatsApp Status'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {whatsAppVerifyModal.restaurant.business_name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppVerifyModal(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Target Status Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Verification Outcome</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setWhatsAppVerifyModal(prev => prev ? { ...prev, targetStatus: 'whatsapp_available' } : null)}
                  className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                    whatsAppVerifyModal.targetStatus === 'whatsapp_available'
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>Available</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWhatsAppVerifyModal(prev => prev ? { ...prev, targetStatus: 'whatsapp_unavailable' } : null)}
                  className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                    whatsAppVerifyModal.targetStatus === 'whatsapp_unavailable'
                      ? 'bg-rose-950 border-rose-500 text-rose-300 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <XCircle size={14} className="text-rose-400" />
                  <span>Unavailable</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWhatsAppVerifyModal(prev => prev ? { ...prev, targetStatus: 'whatsapp_unknown' } : null)}
                  className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                    whatsAppVerifyModal.targetStatus === 'whatsapp_unknown'
                      ? 'bg-slate-800 border-slate-500 text-slate-200 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Clock size={14} className="text-slate-400" />
                  <span>Unverified</span>
                </button>
              </div>
            </div>

            {/* Phone details */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Phone Number:</span>
                <span className="font-semibold text-white">{whatsAppVerifyModal.restaurant.phone_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Normalized WhatsApp Phone:</span>
                <span className="font-mono text-emerald-400">
                  +{normalizeWhatsAppPhone(whatsAppVerifyModal.restaurant.phone_number, whatsAppVerifyModal.restaurant.country).normalizedPhone || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Country:</span>
                <span className="text-slate-300">{whatsAppVerifyModal.restaurant.country || 'India'}</span>
              </div>
            </div>

            {/* Notes input */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">Verification Notes (Optional)</label>
              <textarea
                value={whatsAppVerifyModal.notes}
                onChange={e => setWhatsAppVerifyModal(prev => prev ? { ...prev, notes: e.target.value } : null)}
                placeholder="e.g. Verified via WhatsApp Business chat; confirmed active ordering channel."
                className="w-full h-20 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none font-sans"
              />
            </div>

            {/* Explicit Confirmation Checkbox (Requirement 3: Require explicit user confirmation) */}
            {whatsAppVerifyModal.targetStatus !== 'whatsapp_unknown' && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={whatsAppVerifyModal.confirmed}
                  onChange={e => setWhatsAppVerifyModal(prev => prev ? { ...prev, confirmed: e.target.checked, error: null } : null)}
                  className="mt-0.5 rounded border-emerald-700 bg-slate-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-emerald-200 leading-relaxed font-medium">
                  I confirm that I have personally checked this phone number in WhatsApp and verified its availability status.
                </span>
              </label>
            )}

            {/* Error Message */}
            {whatsAppVerifyModal.error && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{whatsAppVerifyModal.error}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setWhatsAppVerifyModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                disabled={whatsAppVerifyModal.isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVerification}
                disabled={whatsAppVerifyModal.isSubmitting || (whatsAppVerifyModal.targetStatus !== 'whatsapp_unknown' && !whatsAppVerifyModal.confirmed)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition-all flex items-center gap-1.5 ${
                  whatsAppVerifyModal.isSubmitting || (whatsAppVerifyModal.targetStatus !== 'whatsapp_unknown' && !whatsAppVerifyModal.confirmed)
                    ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                    : whatsAppVerifyModal.targetStatus === 'whatsapp_available'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : whatsAppVerifyModal.targetStatus === 'whatsapp_unavailable'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                <ShieldCheck size={14} />
                <span>{whatsAppVerifyModal.isSubmitting ? 'Saving...' : 'Save Verification'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save to List Modal */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Save {selectedIds.size} Leads to List</h3>
            <p className="text-xs text-slate-400">
              Select an existing campaign list to add these hospitality leads:
            </p>

            {listSuccessMsg ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={16} />
                {listSuccessMsg}
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedListId}
                  onChange={e => setSelectedListId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {leadLists.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowListModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveToList}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                  >
                    Confirm Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AllRestaurantsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading discovery view...</div>}>
      <RestaurantsContent />
    </Suspense>
  );
}
