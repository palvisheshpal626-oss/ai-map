'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  MapPin,
  PhoneCall,
  Globe,
  GlobeX,
  Star,
  ExternalLink,
  ShieldCheck,
  Award,
  Clock,
  ArrowLeft,
  CheckCircle2,
  BookmarkCheck,
  Send,
} from 'lucide-react';
import { Restaurant } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/restaurants/${resolvedParams.id}`);
      const data = await res.json();
      if (data.success) {
        setRestaurant(data.restaurant);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [resolvedParams.id]);

  const handleVerifyWebsite = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/restaurants/${resolvedParams.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setVerificationResult(data.verification);
        setRestaurant(data.restaurant);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading business profile...</div>;
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-white">Restaurant Not Found</h2>
        <Link href="/restaurants" className="text-emerald-400 hover:underline">
          &larr; Return to Restaurants Table
        </Link>
      </div>
    );
  }

  const breakdown = restaurant.lead_score_breakdown || {};

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Back button */}
      <Link
        href="/restaurants"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to All Restaurants
      </Link>

      {/* Main Business Profile Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                {restaurant.category}
              </span>
              <span className="text-xs text-slate-400">• {restaurant.district}, UP</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
              {restaurant.business_name}
            </h1>
            <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
              <MapPin size={16} className="text-slate-500 shrink-0" />
              {restaurant.formatted_address}
            </p>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Lead Priority Score</span>
              <div className="text-4xl font-black text-emerald-400 mt-0.5">
                {restaurant.lead_score}
                <span className="text-lg font-normal text-slate-500">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {restaurant.phone_number ? (
            <a
              href={`tel:${restaurant.phone_number}`}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              <PhoneCall size={14} />
              Call {restaurant.phone_number}
            </a>
          ) : (
            <span className="px-4 py-2 rounded-xl bg-slate-800/60 text-slate-500 font-medium text-xs">
              No Phone Available
            </span>
          )}

          {restaurant.website_url ? (
            <a
              href={restaurant.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-2"
            >
              <ExternalLink size={14} />
              Visit Listed Site
            </a>
          ) : (
            <button
              onClick={handleVerifyWebsite}
              disabled={verifying}
              className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-medium text-xs flex items-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              {verifying ? 'Auditing Domain...' : 'Run Website Absence Verification'}
            </button>
          )}

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${restaurant.business_name} ${restaurant.formatted_address}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center gap-2 border border-slate-700"
          >
            <MapPin size={14} />
            View on Map
          </a>
        </div>

        {/* Verification Result Notification */}
        {verificationResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs space-y-1">
            <span className="font-bold text-emerald-400 block flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Website Check Completed
            </span>
            <span className="text-slate-300 block">
              Status: <strong>{verificationResult.status}</strong>
            </span>
            <span className="text-slate-400 block">Evidence: {verificationResult.evidence}</span>
          </div>
        )}

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
          {/* Explainable Lead Score Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Award size={18} className="text-emerald-400" />
              Transparent Scoring Breakdown
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Rating Points (Max 25):</span>
                <strong className="font-mono">{breakdown.ratingScore || 0} pts</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Review Volume Points (Max 30):</span>
                <strong className="font-mono">{breakdown.reviewScore || 0} pts</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>No Website / Absence Points (Max 20):</span>
                <strong className="font-mono text-emerald-400">
                  {breakdown.websiteScore || 0} pts
                </strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Direct Calling Phone Points (Max 15):</span>
                <strong className="font-mono">{breakdown.phoneScore || 0} pts</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Data Completeness (Max 10):</span>
                <strong className="font-mono">{breakdown.completenessScore || 0} pts</strong>
              </div>
            </div>
          </div>

          {/* Business & Website Intelligence */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Globe size={18} className="text-blue-400" />
              Web Presence Status
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Current Classified Status</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {restaurant.website_status.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Customer Rating & Reviews</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {restaurant.rating ? `${restaurant.rating} / 5.0` : 'Unrated'} (
                  {restaurant.review_count} customer reviews)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">First Discovered At</span>
                <span className="font-mono text-slate-400 mt-0.5 block">
                  {new Date(restaurant.first_discovered_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
