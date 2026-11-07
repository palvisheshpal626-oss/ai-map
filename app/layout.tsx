import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Restaurant Lead Finder — Uttar Pradesh Business Intelligence',
  description:
    'Discover real restaurant businesses across Uttar Pradesh with no official website to qualify high-value web development leads.',
};

import React, { Suspense } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen flex flex-col md:flex-row antialiased selection:bg-emerald-600/30 selection:text-emerald-300`}>
        <Suspense fallback={<div className="w-64 h-screen bg-slate-950 border-r border-slate-800" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen bg-slate-950">
          <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
            {children}
          </Suspense>
        </main>
      </body>
    </html>
  );
}
