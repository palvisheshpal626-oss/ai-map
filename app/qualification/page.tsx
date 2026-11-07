'use client';

import React from 'react';
import AllRestaurantsPage from '../restaurants/page';

export default function LeadQualificationPage() {
  return (
    <div className="space-y-4">
      <div className="px-6 md:px-8 pt-6">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          <strong>Lead Qualification View:</strong> Showing only restaurants scoring 60+ out of 100 on the explainable lead scoring matrix (combining customer review volume, rating, telephone availability, and missing website).
        </div>
      </div>
      <AllRestaurantsPage />
    </div>
  );
}
