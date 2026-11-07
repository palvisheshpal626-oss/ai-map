'use client';

import React from 'react';
import AllRestaurantsPage from '../restaurants/page';

export default function NoWebsiteLeadsPage() {
  return (
    <div className="space-y-4">
      <div className="px-6 md:px-8 pt-6">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <strong>Filtered View:</strong> Showing only restaurants across Uttar Pradesh with no official website listed or verified as absent. These are high-converting leads for website development services.
        </div>
      </div>
      <AllRestaurantsPage />
    </div>
  );
}
