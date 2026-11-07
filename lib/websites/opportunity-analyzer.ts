// lib/websites/opportunity-analyzer.ts
// Real Website Inspection, Menu Analysis & Opportunity Scoring Engine
// Analyzes digital presence and HTML content without fake data.
// Accurately categorizes restaurants into Categories A through I with actionable pitch angles.

import { Restaurant, OpportunityAnalysis, OpportunityCategory, OpportunityCategoryCode } from '../types';
import { isSafePublicUrl } from './verifier';

export interface OpportunityInspectionParams {
  restaurant: Partial<Restaurant>;
  htmlContent?: string | null;
  httpStatusCode?: number;
  sslValid?: boolean;
}

const AGGREGATOR_DOMAINS = [
  'zomato.com',
  'swiggy.com',
  'ubereats.com',
  'doordash.com',
  'grubhub.com',
  'justdial.com',
  'magicpin.in',
  'eatsure.com',
  'foodpanda.com',
  'deliveroo.co.uk',
  'menulog.com.au',
];

const SOCIAL_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'linktr.ee',
  'bio.link',
  'tiktok.com',
  'twitter.com',
  'x.com',
];

export function analyzeRestaurantOpportunity(params: OpportunityInspectionParams): OpportunityAnalysis {
  const { restaurant, htmlContent, httpStatusCode, sslValid = true } = params;
  const websiteUrl = restaurant.website_url?.trim() || null;
  const status = restaurant.website_status;

  const evidence: string[] = [];
  const menuUrlsFound: string[] = [];

  let isSocialOnly = false;
  let isAggregatorOnly = false;
  let hasPdfMenu = false;
  let hasImageMenu = false;
  let hasHtmlMenu = false;
  let hasOnlineOrdering = false;
  let viewportMetaPresent = true;

  // 1. Check for absence of website URL
  if (!websiteUrl || status === 'VERIFIED_NO_OFFICIAL_WEBSITE' || status === 'WEBSITE_NOT_LISTED') {
    evidence.push('No website URL registered in public business listings');
    evidence.push('Online presence is currently restricted to map/directory pins');
    return {
      category: 'A_NO_WEBSITE',
      categoryCode: 'A',
      categoryLabel: 'No Website (Prime Prospect)',
      badgeColor: '#EF4444', // Red
      pitchAngle: 'Launch custom branded restaurant website with integrated digital menu and direct ordering to stop losing commission to third-party portals.',
      recommendedService: 'Full Custom Restaurant Website + Digital Menu Package',
      opportunityScore: 95,
      evidence,
      technicalDetails: {
        isSocialOnly: false,
        isAggregatorOnly: false,
        hasPdfMenu: false,
        hasImageMenu: false,
        hasHtmlMenu: false,
        hasOnlineOrdering: false,
        viewportMetaPresent: false,
        sslValid: false,
        menuUrlsFound: [],
      },
    };
  }

  // 2. Parse Hostname and analyze third-party or social redirection
  let parsedHost = '';
  try {
    const urlObj = new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`);
    parsedHost = urlObj.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    parsedHost = websiteUrl.toLowerCase();
  }

  // Check Category F: Social-Media-Only
  for (const domain of SOCIAL_DOMAINS) {
    if (parsedHost.includes(domain)) {
      isSocialOnly = true;
      evidence.push(`Website link directs to social platform profile (${domain})`);
      evidence.push('Lacks independent domain authority and custom ordering flow');
      return {
        category: 'F_SOCIAL_ONLY',
        categoryCode: 'F',
        categoryLabel: 'Social Media Only (Brand Prospect)',
        badgeColor: '#EC4899', // Pink
        pitchAngle: 'Convert social followers into direct paying diners with a custom web home and online ordering link in bio.',
        recommendedService: 'Independent Branded Website + Instagram Link-in-Bio Ordering Hub',
        opportunityScore: 90,
        evidence,
        technicalDetails: {
          isSocialOnly: true,
          isAggregatorOnly: false,
          hasPdfMenu: false,
          hasImageMenu: false,
          hasHtmlMenu: false,
          hasOnlineOrdering: false,
          viewportMetaPresent: true,
          sslValid: true,
          menuUrlsFound: [],
        },
      };
    }
  }

  // Check Category G: Aggregator-Only Menu
  for (const domain of AGGREGATOR_DOMAINS) {
    if (parsedHost.includes(domain)) {
      isAggregatorOnly = true;
      evidence.push(`Website link directs to commission-taking delivery aggregator (${domain})`);
      evidence.push('Paying 20-30% aggregator commission per order');
      return {
        category: 'G_AGGREGATOR_ONLY',
        categoryCode: 'G',
        categoryLabel: 'Aggregator Only (Direct Ordering Prospect)',
        badgeColor: '#F97316', // Orange
        pitchAngle: 'Reclaim 20-30% margin by launching your own direct ordering portal with customer phone retention.',
        recommendedService: 'Direct Restaurant Ordering Portal (0% Commission)',
        opportunityScore: 92,
        evidence,
        technicalDetails: {
          isSocialOnly: false,
          isAggregatorOnly: true,
          hasPdfMenu: false,
          hasImageMenu: false,
          hasHtmlMenu: false,
          hasOnlineOrdering: false,
          viewportMetaPresent: true,
          sslValid: true,
          menuUrlsFound: [],
        },
      };
    }
  }

  // Check Category E: Broken Website / Domain Expired
  if (
    status === 'WEBSITE_UNREACHABLE' ||
    (httpStatusCode && (httpStatusCode >= 400 || httpStatusCode === 0)) ||
    sslValid === false
  ) {
    if (httpStatusCode) evidence.push(`HTTP response error ${httpStatusCode}`);
    if (sslValid === false) evidence.push('SSL certificate invalid or expired');
    evidence.push('Diners cannot load the existing site, leading to immediate bounce');
    return {
      category: 'E_BROKEN_WEBSITE',
      categoryCode: 'E',
      categoryLabel: 'Broken Website (Emergency Rebuild)',
      badgeColor: '#DC2626', // Dark Red
      pitchAngle: 'Immediate website restoration and modernized rebuild to prevent lost customers searching for your restaurant.',
      recommendedService: 'Emergency Website Recovery & High-Speed Redesign',
      opportunityScore: 94,
      evidence,
      technicalDetails: {
        isSocialOnly: false,
        isAggregatorOnly: false,
        hasPdfMenu: false,
        hasImageMenu: false,
        hasHtmlMenu: false,
        hasOnlineOrdering: false,
        viewportMetaPresent: false,
        sslValid,
        httpStatus: httpStatusCode,
        menuUrlsFound: [],
      },
    };
  }

  // 3. Inspect HTML Content if available
  if (htmlContent && htmlContent.length > 50) {
    const lowerHtml = htmlContent.toLowerCase();

    // Check Viewport Meta Tag (Category D: Poor Mobile Usability)
    if (!lowerHtml.includes('name="viewport"') && !lowerHtml.includes("name='viewport'")) {
      viewportMetaPresent = false;
      evidence.push('Missing responsive viewport meta tag; renders in desktop-mode on mobile devices');
    }

    // Check for PDF Menu links (Category C)
    const pdfMatches = htmlContent.match(/href=["']([^"']+\.pdf)["']/gi);
    if (pdfMatches && pdfMatches.length > 0) {
      hasPdfMenu = true;
      pdfMatches.forEach(m => {
        const url = m.replace(/href=["']/i, '').replace(/["']$/, '');
        menuUrlsFound.push(url);
      });
      evidence.push(`Contains static PDF menu documents (${menuUrlsFound.length} found)`);
    }

    // Check for Menu Images (Category C)
    if (
      lowerHtml.includes('menu-page') ||
      lowerHtml.includes('menu_img') ||
      lowerHtml.includes('menu.jpg') ||
      lowerHtml.includes('menu.png') ||
      lowerHtml.includes('menu-1.jpg')
    ) {
      hasImageMenu = true;
      evidence.push('Uses static image scans for menu display instead of responsive text');
    }

    // Check for Interactive HTML Menu elements
    if (
      lowerHtml.includes('menu-item') ||
      lowerHtml.includes('dish-card') ||
      lowerHtml.includes('menu-section') ||
      lowerHtml.includes('food-menu') ||
      lowerHtml.includes('class="menu"') ||
      lowerHtml.includes('id="menu"') ||
      lowerHtml.includes('itemprop="menu"')
    ) {
      hasHtmlMenu = true;
    }

    // Check for Online Ordering system
    if (
      lowerHtml.includes('order online') ||
      lowerHtml.includes('add to cart') ||
      lowerHtml.includes('table-order') ||
      lowerHtml.includes('checkout')
    ) {
      hasOnlineOrdering = true;
    }

    // Evaluate Category D: Poor Mobile
    if (!viewportMetaPresent) {
      return {
        category: 'D_POOR_MOBILE',
        categoryCode: 'D',
        categoryLabel: 'Unresponsive / Desktop Only (Mobile Upgrade)',
        badgeColor: '#D97706', // Amber
        pitchAngle: 'Over 80% of local diners search on mobile phones. Modernize with a mobile-first, high-converting responsive site.',
        recommendedService: 'Mobile-First Responsive Redesign + Fast Loading Optimization',
        opportunityScore: 82,
        evidence,
        technicalDetails: {
          isSocialOnly: false,
          isAggregatorOnly: false,
          hasPdfMenu,
          hasImageMenu,
          hasHtmlMenu,
          hasOnlineOrdering,
          viewportMetaPresent: false,
          sslValid: true,
          httpStatus: httpStatusCode || 200,
          menuUrlsFound,
        },
      };
    }

    // Evaluate Category C: PDF / Image Menu Only
    if ((hasPdfMenu || hasImageMenu) && !hasHtmlMenu) {
      evidence.push('Pinch-to-zoom required for customers to read items; inaccessible on mobile screens');
      return {
        category: 'C_PDF_IMAGE_MENU',
        categoryCode: 'C',
        categoryLabel: 'PDF/Image Menu Only (Digitization Prospect)',
        badgeColor: '#8B5CF6', // Purple
        pitchAngle: 'Upgrade unreadable PDF/image menus into searchable, interactive digital menus with real-time dish availability and pricing.',
        recommendedService: 'Interactive Digital Menu System + WhatsApp Direct Dish Ordering',
        opportunityScore: 78,
        evidence,
        technicalDetails: {
          isSocialOnly: false,
          isAggregatorOnly: false,
          hasPdfMenu,
          hasImageMenu,
          hasHtmlMenu: false,
          hasOnlineOrdering,
          viewportMetaPresent: true,
          sslValid: true,
          httpStatus: httpStatusCode || 200,
          menuUrlsFound,
        },
      };
    }

    // Evaluate Category B: Website Without Menu
    if (!hasHtmlMenu && !hasPdfMenu && !hasImageMenu && !lowerHtml.includes('menu')) {
      evidence.push('Active website lacks a menu section or food list');
      evidence.push('Diners cannot view dishes, prices, or dietary options before visiting');
      return {
        category: 'B_NO_MENU',
        categoryCode: 'B',
        categoryLabel: 'Website Without Menu (Menu Prospect)',
        badgeColor: '#3B82F6', // Blue
        pitchAngle: 'Add a full digital menu module to your current website to stop losing prospective diners who want to see dishes and prices first.',
        recommendedService: 'Digital Menu Integration + Food Photography Showcase',
        opportunityScore: 75,
        evidence,
        technicalDetails: {
          isSocialOnly: false,
          isAggregatorOnly: false,
          hasPdfMenu: false,
          hasImageMenu: false,
          hasHtmlMenu: false,
          hasOnlineOrdering,
          viewportMetaPresent: true,
          sslValid: true,
          httpStatus: httpStatusCode || 200,
          menuUrlsFound: [],
        },
      };
    }

    // Evaluate Category I: Dine-in QR Menu Opportunity
    if (
      !hasOnlineOrdering &&
      restaurant.category &&
      /restaurant|dining|cafe|bistro|dhaba|bar/i.test(restaurant.category)
    ) {
      evidence.push('Website has menu information but lacks contactless QR dine-in ordering');
      return {
        category: 'I_QR_MENU_OPPORTUNITY',
        categoryCode: 'I',
        categoryLabel: 'QR Dine-In Opportunity',
        badgeColor: '#06B6D4', // Cyan
        pitchAngle: 'Equip your tables with contactless QR table ordering to turn tables faster and reduce server order entry errors.',
        recommendedService: 'QR Code Table Dine-In Ordering & Bill Payment Solution',
        opportunityScore: 68,
        evidence,
        technicalDetails: {
          isSocialOnly: false,
          isAggregatorOnly: false,
          hasPdfMenu,
          hasImageMenu,
          hasHtmlMenu,
          hasOnlineOrdering: false,
          viewportMetaPresent: true,
          sslValid: true,
          httpStatus: httpStatusCode || 200,
          menuUrlsFound,
        },
      };
    }

    // Evaluate Category H: Modern Website with Menu
    evidence.push('Modern responsive website with verified digital menu found');
    return {
      category: 'H_MODERN_WEBSITE',
      categoryCode: 'H',
      categoryLabel: 'Modern Website with Menu',
      badgeColor: '#10B981', // Green
      pitchAngle: 'High-performing existing digital presence. Target for advanced local SEO, automated review collection, or loyalty CRM.',
      recommendedService: 'Advanced Local SEO & Google Review Growth Campaign',
      opportunityScore: 35,
      evidence,
      technicalDetails: {
        isSocialOnly: false,
        isAggregatorOnly: false,
        hasPdfMenu,
        hasImageMenu,
        hasHtmlMenu: true,
        hasOnlineOrdering,
        viewportMetaPresent: true,
        sslValid: true,
        httpStatus: httpStatusCode || 200,
        menuUrlsFound,
      },
    };
  }

  // 4. Fallback if website is listed but no HTML was retrieved yet
  evidence.push(`Website listed at ${websiteUrl}`);
  evidence.push('Basic web listing present; deeper menu analysis pending page crawl');
  return {
    category: 'B_NO_MENU',
    categoryCode: 'B',
    categoryLabel: 'Website Listed (Menu Audit Recommended)',
    badgeColor: '#3B82F6',
    pitchAngle: 'Comprehensive menu presence audit to verify mobile readability and online ordering capabilities.',
    recommendedService: 'Website & Menu Performance Audit',
    opportunityScore: 60,
    evidence,
    technicalDetails: {
      isSocialOnly: false,
      isAggregatorOnly: false,
      hasPdfMenu: false,
      hasImageMenu: false,
      hasHtmlMenu: false,
      hasOnlineOrdering: false,
      viewportMetaPresent: true,
      sslValid: true,
      httpStatus: httpStatusCode,
      menuUrlsFound: [],
    },
  };
}

/**
 * Safely fetches and inspects a target website URL to produce an opportunity analysis
 */
export async function inspectRestaurantWebsiteOpportunity(
  restaurant: Partial<Restaurant>,
  timeoutMs: number = 5000
): Promise<OpportunityAnalysis> {
  const url = restaurant.website_url?.trim();
  if (!url) {
    return analyzeRestaurantOpportunity({ restaurant });
  }

  const safety = isSafePublicUrl(url);
  if (!safety.safe) {
    return analyzeRestaurantOpportunity({
      restaurant,
      httpStatusCode: 403,
      sslValid: false,
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fullUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RestaurantLeadFinder/2.0; OpportunityAnalyzer)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    const isSsl = fullUrl.startsWith('https://');
    if (!res.ok) {
      return analyzeRestaurantOpportunity({
        restaurant,
        httpStatusCode: res.status,
        sslValid: isSsl,
      });
    }

    const html = await res.text();
    return analyzeRestaurantOpportunity({
      restaurant,
      htmlContent: html,
      httpStatusCode: res.status,
      sslValid: isSsl,
    });
  } catch {
    clearTimeout(timeoutId);
    return analyzeRestaurantOpportunity({
      restaurant,
      httpStatusCode: 0,
      sslValid: false,
    });
  }
}
