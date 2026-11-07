'use client';

import React, { useEffect, useState } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Key } from 'lucide-react';

export default function ProvidersSettingsPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchProviders = async () => {
    const res = await fetch('/api/providers');
    const data = await res.json();
    if (data.success) setProviders(data.providers);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleTestConnection = async (providerId: string) => {
    setTestingId(providerId);
    setTestResult(null);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      setTestResult({ id: providerId, ...data.testResult });
    } catch (e) {
      console.error(e);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="border-b border-slate-800 pb-6">
        <span className="text-xs font-semibold text-emerald-400">INTELLIGENCE SOURCES</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">Data Sources & APIs</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review connected data providers, verify server-side credentials, and inspect capability matrices.
        </p>
      </div>

      <div className="space-y-4">
        {providers.map(p => (
          <div
            key={p.id}
            className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-white">{p.name}</h2>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      p.isConfigured
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {p.isConfigured ? 'ONLINE / CONFIGURED' : 'MISSING CREDENTIALS'}
                  </span>
                </div>
                <span className="text-xs text-slate-400 block mt-1">
                  Adapter ID: {p.id} • {p.capabilities.termsNotes}
                </span>
              </div>

              <button
                onClick={() => handleTestConnection(p.id)}
                disabled={testingId === p.id}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={14} className={testingId === p.id ? 'animate-spin' : ''} />
                {testingId === p.id ? 'Testing Connection...' : 'Test Connection'}
              </button>
            </div>

            {testResult && testResult.id === p.id && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>
                  {testResult.message}{' '}
                  {testResult.latencyMs ? `(${testResult.latencyMs}ms)` : ''}
                </span>
              </div>
            )}

            {/* Capability Checklist */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="text-slate-400">
                Ratings: <strong className="text-slate-200">{p.capabilities.supportsRatings ? 'Yes' : 'No'}</strong>
              </div>
              <div className="text-slate-400">
                Phone Numbers: <strong className="text-slate-200">{p.capabilities.supportsPhoneNumbers ? 'Yes' : 'No'}</strong>
              </div>
              <div className="text-slate-400">
                Websites: <strong className="text-slate-200">{p.capabilities.supportsWebsites ? 'Yes' : 'No'}</strong>
              </div>
              <div className="text-slate-400">
                Commercial Key: <strong className="text-slate-200">{p.capabilities.requiresCommercialKey ? 'Required' : 'None'}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
