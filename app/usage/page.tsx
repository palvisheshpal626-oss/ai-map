'use client';

import React from 'react';
import { ReceiptIndianRupee, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function UsageCostsPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="border-b border-slate-800 pb-6">
        <span className="text-xs font-semibold text-emerald-400">FINANCIAL SAFEGUARDS</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">Usage & Cost Protection</h1>
        <p className="text-slate-400 text-sm mt-1">
          Monitor API expenditures, daily quota ceilings, and spend estimation across scans.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <span className="text-xs text-slate-400">Daily Request Budget</span>
          <div className="text-2xl font-bold text-white mt-1">500 reqs / day</div>
          <span className="text-xs text-emerald-400 mt-2 block">Hard stop ceiling active</span>
        </div>
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <span className="text-xs text-slate-400">Estimated Cost per Query</span>
          <div className="text-2xl font-bold text-white mt-1">₹0.00 (OSM) / ₹2.50 (Google)</div>
          <span className="text-xs text-slate-500 mt-2 block">Transparent rate card</span>
        </div>
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <span className="text-xs text-slate-400">Worker Concurrency</span>
          <div className="text-2xl font-bold text-white mt-1">2 workers max</div>
          <span className="text-xs text-slate-400 mt-2 block">Rate limit protection</span>
        </div>
      </div>
    </div>
  );
}
