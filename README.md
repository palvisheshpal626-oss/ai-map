# Restaurant Lead Finder — Production Platform

A business intelligence, local business discovery, and lead qualification web application specifically architected for discovering restaurants across **Uttar Pradesh, India**, that lack a website or have verified absence of an official domain, enabling website developers and agencies to secure high-converting leads.

---

## 🏛 System Architecture & Stack

- **Framework**: Next.js (App Router, Turbopack, TypeScript strict mode)
- **Styling & Components**: Tailwind CSS, Lucide icons, responsive drawer navigation
- **Database & Migration Engine**: Supabase (PostgreSQL schema with 15 normalized tables, RLS, indexes)
- **Data Providers**:
  - **Google Places API** adapter (commercial, official place endpoints, server-side secret handling)
  - **OpenStreetMap Overpass API** adapter (open data, no commercial key required, covers restaurants/cafes/dhabas across UP)
- **Background Worker Engine**: Checkpointed durable scan jobs with pause, resume, cancel, and quota protection
- **Scoring Engine**: 0–100 explainable lead qualification matrix (Ratings, Reviews, Absence of Website, Phone Presence, Address Completeness)
- **Website Verifier**: Safe, SSRF-protected HTTP verification with RFC1918 & cloud metadata protection
- **Data Export**: UTF-8 CSV with Byte Order Mark (BOM) & formula injection protection (CWE-1236), and ExcelJS `.xlsx` workbook generator with explicit text phone number formatting.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v20+ / v22+
- npm v10+

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your credentials:
```env
# Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Supabase Credentials (for remote persistence)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Google Places API Key (If omitted, system transparently operates on OpenStreetMap Overpass adapter)
GOOGLE_PLACES_API_KEY=
```

### 3. Running Locally
```bash
# Start development server
npm run dev

# Run automated unit & integration test suite
npm test

# Build production bundle
npm run build
```

---

## 📁 Project Structure

```
├── app/
│   ├── (overview)/page.tsx           # Dashboard with real metrics
│   ├── searches/page.tsx             # Multi-step search wizard
│   ├── locations/page.tsx            # 75 UP districts & localities explorer
│   ├── scans/page.tsx                # Durable scan job manager
│   ├── restaurants/page.tsx          # Leads data grid
│   ├── restaurants/[id]/page.tsx     # Restaurant detail & scoring breakdown
│   ├── no-website/page.tsx           # Pre-filtered missing website leads
│   ├── qualification/page.tsx        # Top scored prospects (60+)
│   ├── lists/page.tsx                # Saved lead lists
│   ├── exports/page.tsx              # CSV & Excel deliverables
│   ├── providers/page.tsx            # Data provider status & connection tests
│   ├── usage/page.tsx                # API request & budget limits
│   ├── settings/page.tsx             # Lead scoring weight configurations
│   ├── docs/page.tsx                 # Operating documentation
│   └── api/                          # REST endpoints for scans, stats, exports, & providers
├── components/
│   └── layout/sidebar.tsx            # 13-route collapsible responsive navigation
├── lib/
│   ├── types/index.ts                # TypeScript domain types
│   ├── locations/uttar-pradesh.ts    # 75 UP administrative districts registry
│   ├── scoring/lead-scorer.ts        # 0-100 explainable lead scoring engine
│   ├── deduplication/deduplicator.ts # Deterministic phone & address deduplicator
│   ├── websites/verifier.ts          # SSRF-protected website verifier
│   ├── providers/                    # Google Places & OSM Overpass adapters
│   ├── workers/scan-worker.ts        # Durable background scanning engine
│   ├── exports/exporter.ts           # CSV & Excel generation engine
│   └── store/memory-store.ts         # In-memory & persistence store
└── supabase/
    └── migrations/                   # PostgreSQL schema migrations
```

---

## 🛡️ Security & Safeguards

- **No Data Fabrication**: Live provider responses, actual addresses, real phone numbers. Missing data is never silently substituted with synthetic demo data.
- **SSRF Protection**: Website checks reject loopbacks (`127.0.0.1`, `localhost`, `[::1]`), cloud metadata IPs (`169.254.169.254`), and RFC 1918 ranges (`10.x`, `172.16.x-31.x`, `192.168.x`).
- **Spreadsheet Formula Injection**: All CSV and Excel cells starting with dangerous characters (`=`, `+`, `-`, `@`, `\t`) are prefixed with `'` to enforce safe plain text rendering.
- **Quota Safeguards**: Concurrency throttles and configurable daily request ceilings prevent unexpected commercial API charges.
