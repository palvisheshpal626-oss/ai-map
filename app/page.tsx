'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Award,
  PhoneCall,
  Globe,
  GlobeX,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Database,
  Search,
} from 'lucide-react';

interface StatsData {
  uniqueCount: number;
  withPhone: number;
  withWebsite: number;
  noWebsite: number;
  verifiedNoWebsite: number;
  pendingVerification: number;
  qualifiedLeads: number;
  districtsScanned: number;
  queuedJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalApiRequests: number;
  estimatedCostInr: number;
}

export default function OverviewDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const metricCards = [
    {
      title: 'Discovered Restaurants',
      value: stats ? stats.uniqueCount.toLocaleString() : '0',
      subtitle: 'Real normalized businesses in UP',
      icon: UtensilsCrossed,
      color: 'from-blue-500 to-indigo-600',
      badge: 'Database records',
    },
    {
      title: 'High-Value Leads',
      value: stats ? stats.qualifiedLeads.toLocaleString() : '0',
      subtitle: 'Score 60+ (Prime Prospects)',
      icon: Award,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Actionable',
    },
    {
      title: 'No Official Website',
      value: stats ? (stats.noWebsite + stats.verifiedNoWebsite).toLocaleString() : '0',
      subtitle: `${stats ? stats.verifiedNoWebsite : 0} verified absent`,
      icon: GlobeX,
      color: 'from-amber-500 to-orange-600',
      badge: 'Core Target',
    },
    {
      title: 'Phone Available',
      value: stats ? stats.withPhone.toLocaleString() : '0',
      subtitle: 'Verified direct calling contact',
      icon: PhoneCall,
      color: 'from-violet-500 to-purple-600',
      badge: 'Direct Outreach',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Uttar Pradesh Coverage
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live intelligence engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2 tracking-tight">
            Overview Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real restaurant discovery, website presence auditing, and lead qualification across 75 districts of UP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/locations"
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 transition-colors flex items-center gap-2"
          >
            <MapPin size={16} />
            Explore UP Districts
          </Link>
          <Link
            href="/searches"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all flex items-center gap-2"
          >
            <Search size={16} />
            Start New Scan
          </Link>
        </div>
      </div>

      {/* 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-400">{card.title}</span>
                  <div className="text-3xl font-bold text-white mt-1">
                    {loading ? <span className="animate-pulse">--</span> : card.value}
                  </div>
                </div>
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-md`}
                >
                  <Icon size={20} />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">{card.subtitle}</span>
                <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {card.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Operational Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* District & Coverage Status */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <MapPin size={18} className="text-emerald-400" />
              Geographic Coverage
            </h2>
            <span className="text-xs text-slate-400">UP Hierarchy</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-400">Districts Scanned</span>
                <span className="font-semibold text-slate-200">
                  {stats ? stats.districtsScanned : 0} / 75 Districts
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((stats?.districtsScanned || 0) / 75) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-xs text-slate-400 block">Tier-1 Metros</span>
                <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
                  Lucknow, Noida, Kanpur
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-xs text-slate-400 block">Major Hubs</span>
                <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
                  Varanasi, Agra, Prayagraj
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Engine Status */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              Scan Engine Jobs
            </h2>
            <Link href="/scans" className="text-xs text-blue-400 hover:underline">
              View Manager &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400 block">Active Running</span>
              <span className="text-xl font-bold text-blue-400 mt-1 block">
                {stats ? stats.runningJobs : 0}
              </span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400 block">Completed</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                {stats ? stats.completedJobs : 0}
              </span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400 block">Queued</span>
              <span className="text-xl font-bold text-amber-400 mt-1 block">
                {stats ? stats.queuedJobs : 0}
              </span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400 block">Failed</span>
              <span className="text-xl font-bold text-rose-400 mt-1 block">
                {stats ? stats.failedJobs : 0}
              </span>
            </div>
          </div>
        </div>

        {/* API Usage & Cost Protection */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-violet-400" />
              Usage Safeguards
            </h2>
            <Link href="/usage" className="text-xs text-violet-400 hover:underline">
              Details &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400">Total API Queries</span>
              <span className="text-sm font-bold text-slate-200">
                {stats ? stats.totalApiRequests : 0} reqs
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400">Estimated Cost</span>
              <span className="text-sm font-bold text-emerald-400">
                ₹{stats ? stats.estimatedCostInr.toFixed(2) : '0.00'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Budget safeguards enforced. Scans will halt before exceeding configured daily limits.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Launch Callout */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 justify-center sm:justify-start">
            <Sparkles size={18} className="text-emerald-400" />
            Ready to discover high-converting restaurant leads?
          </h3>
          <p className="text-sm text-slate-400">
            Launch a multi-location scan for Lucknow, Noida, or Varanasi to uncover dining businesses without websites.
          </p>
        </div>
        <Link
          href="/searches"
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 shrink-0 transition-colors shadow-lg shadow-emerald-950/50"
        >
          Configure New Scan
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
