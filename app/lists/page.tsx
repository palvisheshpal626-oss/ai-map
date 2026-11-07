'use client';

import React, { useEffect, useState } from 'react';
import { BookmarkCheck, Plus, ListOrdered, FileDown } from 'lucide-react';
import Link from 'next/link';
import { LeadList } from '@/lib/types';

export default function SavedListsPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/lists')
      .then(r => r.json())
      .then(data => {
        if (data.success) setLists(data.lists);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            LEAD ORGANIZATION
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
            Saved Lead Lists
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Organize high-value UP dining leads into actionable outreach campaigns.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lists.map(list => (
          <div
            key={list.id}
            className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base text-white">{list.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{list.description}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                {list.item_count || 0} leads
              </span>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Updated: {new Date(list.updated_at).toLocaleDateString()}
              </span>
              <Link
                href="/restaurants"
                className="text-emerald-400 hover:underline font-semibold"
              >
                Browse Leads &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
