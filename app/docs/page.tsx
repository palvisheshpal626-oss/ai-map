'use client';

import React from 'react';
import { HelpCircle, BookOpen, ExternalLink } from 'lucide-react';

export default function DocumentationPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
      <div className="border-b border-slate-800 pb-6">
        <span className="text-xs font-semibold text-emerald-400">OPERATIONAL GUIDELINES</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">Documentation & Help</h1>
        <p className="text-slate-400 text-sm mt-1">
          Reference manual for discovering restaurant leads across Uttar Pradesh, India.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 text-xs text-slate-300 leading-relaxed">
        <h2 className="font-bold text-sm text-white">Workflow Guide</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li><strong>Geographic Selection:</strong> Choose from Uttar Pradesh's 75 districts or select specific commercial localities (e.g. Hazratganj in Lucknow, Sector 18 in Noida).</li>
          <li><strong>Lead Qualification:</strong> Establish minimum rating and review volume. The scoring engine awards up to 100 points, prioritizing dining places without an active website.</li>
          <li><strong>Website Auditing:</strong> The built-in verifier executes safe HTTP HEAD requests with strict SSRF filtering to test if listed domains are active or dead.</li>
          <li><strong>Exporting:</strong> Download clean CSV or formatted Excel workbooks with formula injection prevention and phone number preservation.</li>
        </ol>
      </div>
    </div>
  );
}
