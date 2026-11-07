'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  MapPin,
  ListOrdered,
  UtensilsCrossed,
  GlobeX,
  Award,
  BookmarkCheck,
  FileDown,
  Database,
  ReceiptIndianRupee,
  Settings,
  HelpCircle,
  HardDrive,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
  { href: '/searches', label: 'New Search', icon: Search },
  { href: '/locations', label: 'Location Explorer', icon: MapPin },
  { href: '/scans', label: 'Scan Manager', icon: ListOrdered },
  { href: '/restaurants', label: 'All Restaurants', icon: UtensilsCrossed },
  { href: '/no-website', label: 'No-Website Leads', icon: GlobeX },
  { href: '/qualification', label: 'Lead Qualification', icon: Award },
  { href: '/lists', label: 'Saved Lists', icon: BookmarkCheck },
  { href: '/exports', label: 'Export Center', icon: FileDown },
  { href: '/providers', label: 'Data Sources', icon: Database },
  { href: '/data-manager', label: 'Offline Data Manager', icon: HardDrive },
  { href: '/usage', label: 'Usage & Costs', icon: ReceiptIndianRupee },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/docs', label: 'Documentation & Help', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Hamburger Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
            R
          </div>
          <span className="font-semibold text-sm tracking-wide">Restaurant Lead Finder</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Component */}
      <aside
        className={`fixed md:sticky top-0 h-screen z-50 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'left-0' : '-left-full md:left-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white shrink-0 shadow-lg shadow-emerald-950/50">
              UP
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm text-slate-100 tracking-tight leading-none">
                  Restaurant Lead Finder
                </span>
                <span className="text-[11px] text-emerald-400 font-medium mt-1">Uttar Pradesh Intel</span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={19}
                  className={`shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Footer User & State Status */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-200">System Ready</span>
                </div>
                <span className="text-[11px] text-slate-400">Target: 75 UP Districts</span>
              </div>
              <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                v1.0
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="System Ready" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
