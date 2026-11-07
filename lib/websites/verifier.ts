// lib/websites/verifier.ts
// Secure, SSRF-protected website availability and absence verification engine
// Features redirect destination safety revalidation, timeout bounds, and RFC1918 / Cloud metadata rejection.

import { WebsiteStatus } from '../types';

export interface VerificationResult {
  status: WebsiteStatus;
  httpStatusCode?: number;
  evidence: string;
  isReachable: boolean;
  checkedAt: string;
}

/**
 * Validates and ensures a URL is not attacking internal, loopback, or private cloud metadata services (SSRF protection).
 */
export function isSafePublicUrl(urlString: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);

    // Only allow http: and https:
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Unsupported protocol scheme' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost, IP loopbacks, internal domains
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.includes('::1') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { safe: false, reason: 'Prohibited localhost or internal domain' };
    }

    // Block AWS/GCP/Azure link-local metadata endpoints
    if (hostname === '169.254.169.254' || hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
      return { safe: false, reason: 'Prohibited private or cloud metadata IP range' };
    }

    // Block 172.16.0.0 – 172.31.255.255
    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && !parts.some(isNaN)) {
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
        return { safe: false, reason: 'Prohibited RFC1918 private IP address' };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Malformed URL structure' };
  }
}

/**
 * Performs safe, bounded HTTP verification on a target restaurant URL with redirect revalidation
 */
export async function verifyRestaurantWebsite(
  url?: string | null,
  timeoutMs: number = 6000,
  maxRedirects: number = 3
): Promise<VerificationResult> {
  const checkedAt = new Date().toISOString();

  if (!url || url.trim() === '') {
    return {
      status: 'WEBSITE_NOT_LISTED',
      evidence: 'No website URL provided in business source listing',
      isReachable: false,
      checkedAt,
    };
  }

  const trimmed = url.trim();
  let currentUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    const safetyCheck = isSafePublicUrl(currentUrl);
    if (!safetyCheck.safe) {
      return {
        status: 'VERIFICATION_FAILED',
        evidence: `Security violation / SSRF block: ${safetyCheck.reason}`,
        isReachable: false,
        checkedAt,
      };
    }

    // AbortController for strict timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Manual redirect handling to re-validate destination URL against SSRF
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'RestaurantLeadFinder-Auditor/1.0 (+https://restaurantleadfinder.local)',
        },
      });

      clearTimeout(timeoutId);

      // Handle Redirects safely
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          return {
            status: 'WEBSITE_UNREACHABLE',
            httpStatusCode: response.status,
            evidence: `HTTP ${response.status} redirect without location header`,
            isReachable: false,
            checkedAt,
          };
        }

        // Resolve relative redirects safely
        currentUrl = new URL(locationHeader, currentUrl).toString();
        redirectCount++;
        continue;
      }

      if (response.ok || (response.status >= 200 && response.status < 400)) {
        return {
          status: 'WEBSITE_REACHABLE',
          httpStatusCode: response.status,
          evidence: `HTTP ${response.status} ${response.statusText}`,
          isReachable: true,
          checkedAt,
        };
      } else {
        return {
          status: 'WEBSITE_UNREACHABLE',
          httpStatusCode: response.status,
          evidence: `Server returned error status HTTP ${response.status}`,
          isReachable: false,
          checkedAt,
        };
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errMessage = err instanceof Error ? err.message : String(err);

      if (errMessage.includes('abort') || errMessage.includes('timeout')) {
        return {
          status: 'WEBSITE_UNREACHABLE',
          evidence: `Connection timed out after ${timeoutMs}ms`,
          isReachable: false,
          checkedAt,
        };
      }

      return {
        status: 'WEBSITE_UNREACHABLE',
        evidence: `Network or DNS resolution failure: ${errMessage}`,
        isReachable: false,
        checkedAt,
      };
    }
  }

  return {
    status: 'WEBSITE_UNREACHABLE',
    evidence: `Exceeded maximum redirect limit of ${maxRedirects}`,
    isReachable: false,
    checkedAt,
  };
}
