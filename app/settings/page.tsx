'use client';

import React from 'react';
import { Settings, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
      <div className="border-b border-slate-800 pb-6">
        <span className="text-xs font-semibold text-emerald-400">APPLICATION PREFERENCES</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure lead scoring weights, search presets, and security policies.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 text-xs text-slate-300">
        <h2 className="font-bold text-sm text-white">Default Lead Scoring Weights (0-100)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>Customer Review Volume: <strong>30 pts</strong></div>
          <div>Rating Threshold: <strong>25 pts</strong></div>
          <div>Missing Website Presence: <strong>20 pts</strong></div>
          <div>Phone Number Listed: <strong>15 pts</strong></div>
          <div>Geospatial & Address Completeness: <strong>10 pts</strong></div>
        </div>
      </div>
    </div>
  );
}
