'use client';

import React, { useEffect, useState } from 'react';
import {
  ListOrdered,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  MapPin,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileText,
  X,
  Eye,
  HelpCircle,
  Building,
} from 'lucide-react';
import Link from 'next/link';
import { ScanJob, CandidateAuditRecord } from '@/lib/types';

export default function ScanManagerPage() {
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCityQueues, setExpandedCityQueues] = useState<Set<string>>(new Set());

  // Candidate Audit Modal state
  const [auditModal, setAuditModal] = useState<{
    jobId: string;
    jobName: string;
    audits: CandidateAuditRecord[];
    filter: 'all' | 'qualified' | 'rejected' | 'unverified';
    loading: boolean;
  } | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/scans');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (jobId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      await fetch(`/api/scans/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCityQueue = (jobId: string) => {
    const next = new Set(expandedCityQueues);
    if (next.has(jobId)) next.delete(jobId);
    else next.add(jobId);
    setExpandedCityQueues(next);
  };

  const openAuditModal = async (job: ScanJob) => {
    setAuditModal({
      jobId: job.id,
      jobName: job.name,
      audits: [],
      filter: 'all',
      loading: true,
    });
    try {
      const res = await fetch(`/api/scans/${job.id}`);
      const data = await res.json();
      if (data.success && data.audits) {
        setAuditModal(prev => prev ? { ...prev, audits: data.audits, loading: false } : null);
      } else {
        setAuditModal(prev => prev ? { ...prev, loading: false } : null);
      }
    } catch {
      setAuditModal(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            HIERARCHICAL DISTRICT-FIRST WORKER
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
            Scan Jobs Manager
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor real-time district coverage, city-by-city queue progress, candidate audits, and lead qualification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Refresh Status
          </button>
          <Link
            href="/searches"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            New Scan Campaign
          </Link>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-5">
        {jobs.length === 0 && !loading && (
          <div className="p-12 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl">
            <Clock size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-200">No scan campaigns run yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Start your first district campaign across Uttar Pradesh to discover restaurants without websites.
            </p>
            <Link
              href="/searches"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
            >
              Configure Scan
            </Link>
          </div>
        )}

        {jobs.map(job => {
          const totalTasks = job.progress_counters.total_tasks || 1;
          const completedTasks = job.progress_counters.completed_tasks || 0;
          const percent = Math.min(100, Math.round((completedTasks / totalTasks) * 100));
          const isQueueExpanded = expandedCityQueues.has(job.id);

          return (
            <div
              key={job.id}
              className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-white">{job.name}</h2>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        job.status === 'running'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse'
                          : job.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : job.status === 'completed_with_warnings'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : job.status === 'paused'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : job.status === 'queued'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      via {job.provider_id === 'google_places' ? 'Google Places API (New)' : 'OpenStreetMap (Nominatim & Direct Map 0.6)'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 block mt-1">
                    Job ID: {job.id} • Started: {new Date(job.created_at).toLocaleTimeString()}{job.updated_at ? ` • Updated: ${new Date(job.updated_at).toLocaleTimeString()}` : ''}
                  </span>
                  {job.error_summary && (
                    <div className="mt-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-400" />
                      <span>{job.error_summary}</span>
                    </div>
                  )}
                </div>

                {/* Control Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openAuditModal(job)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                    title="Inspect individual candidate audit checks"
                  >
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Audit Log
                  </button>
                  {job.status === 'queued' && (
                    <>
                      <button
                        onClick={() => handleAction(job.id, 'resume')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Play size={14} />
                        Start Scan
                      </button>
                      <button
                        onClick={() => handleAction(job.id, 'cancel')}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <XCircle size={14} />
                        Cancel
                      </button>
                    </>
                  )}
                  {job.status === 'running' && (
                    <button
                      onClick={() => handleAction(job.id, 'pause')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Pause size={14} />
                      Pause
                    </button>
                  )}
                  {job.status === 'paused' && (
                    <button
                      onClick={() => handleAction(job.id, 'resume')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Play size={14} />
                      Resume
                    </button>
                  )}
                  {(job.status === 'running' || job.status === 'paused') && (
                    <button
                      onClick={() => handleAction(job.id, 'cancel')}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <XCircle size={14} />
                      Cancel
                    </button>
                  )}
                  <Link
                    href={`/restaurants?job_id=${job.id}`}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                  >
                    View Discovered &rarr;
                  </Link>
                </div>
              </div>

              {/* District Coverage & Real-Time Scanning Status */}
              {job.coverage_summary && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-emerald-400" />
                      <span className="font-bold text-slate-200">
                        Target District: {job.coverage_summary.district}, {job.coverage_summary.state}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {job.coverage_summary.coverage_status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-emerald-400">
                      {job.coverage_summary.completed_cities + job.coverage_summary.partially_covered_cities} / {job.coverage_summary.total_cities} cities covered ({job.coverage_summary.coverage_percentage}%)
                    </span>
                  </div>

                  {/* Active City & Lead Verification Progress Indicator */}
                  {job.status === 'running' && (job.current_city || job.current_candidate) && (
                    <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
                      {job.current_city && (
                        <div className="flex items-center gap-1.5 text-blue-300 bg-blue-950/50 border border-blue-900/50 px-2.5 py-1 rounded-md">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                          <span>Processing City: <strong>{typeof job.current_city === 'object' ? job.current_city.name : job.current_city}</strong></span>
                        </div>
                      )}
                      {job.current_candidate && (
                        <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/50 border border-emerald-900/50 px-2.5 py-1 rounded-md">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Verifying Candidate: <strong>{typeof job.current_candidate === 'object' ? job.current_candidate.name : job.current_candidate}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Campaign Engine & Diagnostic Status Panel */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Engine Diagnostics:</span>
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-900 text-emerald-400 border border-emerald-900/40">
                      {job.provider_id === 'osm_overpass' ? 'OpenStreetMap (Nominatim & Direct Map 0.6)' : 'Google Places API'}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">Authentic Public Data (No Mock/Synthetics)</span>
                  </div>
                  {job.last_error && (
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-rose-950 text-rose-400 border border-rose-900/50 truncate max-w-xs" title={job.last_error}>
                      Warning: {job.last_error}
                    </span>
                  )}
                </div>

                {job.progress_counters.fetched_count === 0 && completedTasks > 0 && (
                  <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-900/40 text-amber-300 text-[11px] flex items-center gap-2">
                    <AlertTriangle size={13} className="shrink-0 text-amber-400" />
                    <span>
                      Verified 0 food businesses mapped in OpenStreetMap for target locality. Discovered 0 records truthfully reported without synthetic injection.
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">
                    Tasks Progress: {completedTasks} / {totalTasks} units completed
                  </span>
                  <span className="font-mono font-bold text-slate-300">{percent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      job.status === 'completed'
                        ? 'bg-emerald-500'
                        : job.status === 'paused'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">Fetched</span>
                  <span className="text-sm font-bold text-slate-200 mt-0.5 block">
                    {job.progress_counters.fetched_count ?? job.progress_counters.discovered_count} raw
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">Discovered</span>
                  <span className="text-sm font-bold text-sky-400 mt-0.5 block">
                    {job.progress_counters.discovered_count} records
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">Qualified Leads</span>
                  <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                    {job.progress_counters.qualified_count} leads
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">Filtered / Rejected</span>
                  <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                    {job.progress_counters.rejected_count ?? 0} skipped
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">Deduplicated</span>
                  <span className="text-sm font-bold text-slate-400 mt-0.5 block">
                    {job.progress_counters.duplicate_count} merged
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">Estimated Cost</span>
                  <span className="text-sm font-bold text-violet-400 mt-0.5 block">
                    ₹{(job.usage_counters?.estimated_cost_inr || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Rejection Breakdown */}
              {job.progress_counters.rejection_breakdown && Object.keys(job.progress_counters.rejection_breakdown).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                  <span className="text-slate-500 font-medium">Rejections:</span>
                  {Object.entries(job.progress_counters.rejection_breakdown).map(([reason, count]) => (
                    <span
                      key={reason}
                      className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono text-[10px]"
                    >
                      {reason.replace(/_/g, ' ')}: <strong className="text-amber-400">{String(count)}</strong>
                    </span>
                  ))}
                </div>
              )}

              {/* City Queue Breakdown Accordion */}
              {job.city_queue && job.city_queue.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => toggleCityQueue(job.id)}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    {isQueueExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>City-by-City Queue Progression ({job.city_queue.length} cities & towns)</span>
                  </button>

                  {isQueueExpanded && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {job.city_queue.map(city => (
                        <div
                          key={city.id}
                          className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200 truncate">{city.city_name}</span>
                            <span
                              className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                                city.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : city.status === 'in_progress'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                                  : city.status === 'partially_covered'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : city.status === 'failed'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {city.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Qualified: <strong className="text-emerald-400">{city.candidates_qualified || 0}</strong></span>
                            <span>Rejected: <strong className="text-amber-400">{city.candidates_rejected || 0}</strong></span>
                            <span>Cells: {city.total_cells || 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Candidate Audit Modal */}
      {auditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Candidate Audit Trail</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Job: {auditModal.jobName} ({auditModal.audits.length} candidates evaluated)
                </p>
              </div>
              <button
                onClick={() => setAuditModal(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 text-xs">
              {(['all', 'qualified', 'rejected', 'unverified'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAuditModal({ ...auditModal, filter: tab })}
                  className={`px-3 py-1.5 rounded-lg font-semibold uppercase text-[11px] transition-colors ${
                    auditModal.filter === tab
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {auditModal.loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading audit trail...</div>
            ) : auditModal.audits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No candidate audits recorded for this job yet.</div>
            ) : (
              <div className="space-y-3">
                {auditModal.audits
                  .filter(a => auditModal.filter === 'all' || a.decision === auditModal.filter)
                  .map(audit => (
                    <div
                      key={audit.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-200 text-sm">{audit.candidate_name || audit.business_name || 'Candidate'}</span>
                          <span className="text-slate-400 text-xs block">
                            {audit.category || 'Hospitality'} • {audit.city_name}, {audit.district_name}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            audit.decision === 'qualified'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : audit.decision === 'unverified'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {audit.decision}
                        </span>
                      </div>

                      {(audit.primary_reason || audit.rejection_reason) && (
                        <p className="text-slate-300 text-[11px] bg-slate-900 p-2 rounded-lg border border-slate-800/60">
                          {audit.primary_reason || audit.rejection_reason}
                        </p>
                      )}

                      {/* Detailed 7-Check breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        {audit.checks.map((chk, i) => (
                          <div
                            key={i}
                            className={`p-1.5 rounded-lg border flex items-center justify-between text-[10px] ${
                              chk.status === 'passed'
                                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                                : chk.status === 'unverified'
                                ? 'bg-amber-950/20 border-amber-900/40 text-amber-300'
                                : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                            }`}
                          >
                            <span className="font-semibold truncate max-w-[180px]">{chk.check_name}</span>
                            <span className="uppercase font-mono text-[9px]">{chk.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setAuditModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
