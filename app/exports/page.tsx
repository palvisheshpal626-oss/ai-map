'use client';

import React, { useState } from 'react';
import { FileDown, Download, CheckCircle2 } from 'lucide-react';

export default function ExportCenterPage() {
  const [downloading, setDownloading] = useState(false);

  const handleQuickExport = async (format: 'csv' | 'xlsx') => {
    setDownloading(true);
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uttar-pradesh-restaurant-leads.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      alert('Export failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="border-b border-slate-800 pb-6">
        <span className="text-xs font-semibold text-emerald-400">DATA DELIVERABLES</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">Export Center</h1>
        <p className="text-slate-400 text-sm mt-1">
          Export verified dining leads formatted for cold outreach, CRM importing, or Excel spreadsheets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Export Card */}
        <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              CSV
            </div>
            <div>
              <h2 className="font-bold text-base text-white">UTF-8 Encoded CSV</h2>
              <span className="text-xs text-slate-400">Universal CRM / Spreadsheet format</span>
            </div>
          </div>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Formula injection sanitized (CWE-1236 protection)</li>
            <li>UTF-8 Byte Order Mark (BOM) for Indian character support</li>
            <li>Includes Lead Scores, Review Counts, and Website Statuses</li>
          </ul>
          <button
            onClick={() => handleQuickExport('csv')}
            disabled={downloading}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
          >
            <Download size={14} />
            Download Complete CSV
          </button>
        </div>

        {/* Excel Export Card */}
        <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              XLSX
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Formatted Excel Workbook</h2>
              <span className="text-xs text-slate-400">Styled workbook for direct analysis</span>
            </div>
          </div>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Explicit Text formatting on Phone numbers (preserves leading zeroes)</li>
            <li>Styled dark-theme headers and auto-fit column widths</li>
            <li>Pre-frozen top row for smooth scrolling</li>
          </ul>
          <button
            onClick={() => handleQuickExport('xlsx')}
            disabled={downloading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
          >
            <Download size={14} />
            Download Complete Excel (.xlsx)
          </button>
        </div>
      </div>
    </div>
  );
}
