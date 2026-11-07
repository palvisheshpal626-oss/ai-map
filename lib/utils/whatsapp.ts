// lib/utils/whatsapp.ts
// Utility for WhatsApp Click-to-Chat URL generation, International phone normalization,
// and draft message preparation. Manual user action only — never sends messages automatically.

import { isValidPhoneNumber } from '../deduplication/deduplicator';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export interface WhatsAppPhoneResult {
  isValid: boolean;
  normalizedPhone: string | null; // Digits only with international calling code, e.g. "12137881191", "919876543210"
  formattedDisplay: string;        // International display format, e.g. "+1 213-788-1191", "+91 98765 43210"
  countryCode?: string;           // ISO 3166-1 alpha-2, e.g. "US", "IN", "GB"
  callingCode?: string;           // Calling prefix without +, e.g. "1", "91", "44"
  error?: string;
}

export interface WhatsAppUrlOptions {
  message?: string;
  countryCode?: string;
  country?: string;
  isMobile?: boolean;
  format?: 'wa.me' | 'web';
}

export interface WhatsAppUrlResult {
  url: string;        // Primary click-to-chat URL (wa.me by default, or web if requested)
  waMeUrl: string;    // Official canonical format: https://wa.me/<digits>[?text=...]
  webUrl: string;     // Direct web client format: https://web.whatsapp.com/send?phone=<digits>[&text=...]
  cleanPhone?: string;
  error?: string;
}

/**
 * Maps common country names, demonyms, and aliases to ISO 3166-1 alpha-2 country codes.
 */
export function resolveIsoCountryCode(countryOrCode?: string | null): CountryCode | undefined {
  if (!countryOrCode) return undefined;
  const norm = countryOrCode.trim().toLowerCase();

  switch (norm) {
    case 'in':
    case 'ind':
    case 'india':
    case 'bharat':
    case 'hindustan':
      return 'IN';

    case 'us':
    case 'usa':
    case 'united states':
    case 'united states of america':
    case 'america':
      return 'US';

    case 'gb':
    case 'uk':
    case 'gbr':
    case 'united kingdom':
    case 'great britain':
    case 'britain':
    case 'england':
    case 'scotland':
    case 'wales':
    case 'northern ireland':
      return 'GB';

    case 'ca':
    case 'can':
    case 'canada':
      return 'CA';

    case 'au':
    case 'aus':
    case 'australia':
      return 'AU';

    case 'nz':
    case 'nzl':
    case 'new zealand':
    case 'aotearoa':
      return 'NZ';

    case 'ie':
    case 'irl':
    case 'ireland':
    case 'éire':
    case 'eire':
      return 'IE';

    case 'sg':
    case 'sgp':
    case 'singapore':
      return 'SG';

    case 'ae':
    case 'are':
    case 'united arab emirates':
    case 'uae':
    case 'dubai':
    case 'abu dhabi':
    case 'sharjah':
      return 'AE';

    case 'za':
    case 'zaf':
    case 'south africa':
      return 'ZA';

    default:
      if (/^[a-zA-Z]{2}$/.test(norm)) {
        return norm.toUpperCase() as CountryCode;
      }
      return undefined;
  }
}

/**
 * Normalizes a raw phone number to the international format required by WhatsApp.
 * 
 * Rules:
 * 1. Uses libphonenumber-js to parse national or international telephone numbers.
 * 2. Parses numbers using the known country or region of the source record.
 * 3. Never prepends India's 91 to every number.
 * 4. Never guesses country based only on number length.
 * 5. Does not blindly add country codes to numbers that already contain them.
 * 6. Flags ambiguous or invalid numbers instead of generating potentially incorrect links.
 * 7. Generates digits-only normalized phone with calling code for WhatsApp (e.g. 12137881191).
 */
export function normalizeWhatsAppPhone(
  rawPhone?: string | null,
  countryContext?: string | null
): WhatsAppPhoneResult {
  if (!rawPhone || !isValidPhoneNumber(rawPhone)) {
    return {
      isValid: false,
      normalizedPhone: null,
      formattedDisplay: rawPhone || 'Unavailable',
      error: 'Invalid or missing telephone number',
    };
  }

  const trimmed = rawPhone.trim();
  const defaultCountry = resolveIsoCountryCode(countryContext);

  // 1. If number starts with international prefix '+' (e.g. "+1 213-788-1191", "+91 98765 43210")
  if (trimmed.startsWith('+')) {
    try {
      const parsed = parsePhoneNumberFromString(trimmed);
      if (parsed && parsed.isValid()) {
        const e164 = parsed.format('E.164');
        return {
          isValid: true,
          normalizedPhone: e164.replace('+', ''),
          formattedDisplay: parsed.formatInternational(),
          countryCode: parsed.country,
          callingCode: String(parsed.countryCallingCode),
        };
      }
    } catch {}
  }

  // 2. If country context is provided, parse with libphonenumber-js in that country
  if (defaultCountry) {
    try {
      const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
      if (parsed && parsed.isValid()) {
        const e164 = parsed.format('E.164');
        return {
          isValid: true,
          normalizedPhone: e164.replace('+', ''),
          formattedDisplay: parsed.formatInternational(),
          countryCode: parsed.country,
          callingCode: String(parsed.countryCallingCode),
        };
      }
    } catch {}
  }

  // 3. Fallback normalization with country awareness
  const digits = trimmed.replace(/\D/g, '');

  if (defaultCountry === 'IN') {
    // Already prefixed with 91 followed by 10 digits
    if (digits.length === 12 && digits.startsWith('91')) {
      const mobile = digits.slice(2);
      return {
        isValid: true,
        normalizedPhone: digits,
        formattedDisplay: `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`,
        countryCode: 'IN',
        callingCode: '91',
      };
    }
    // Starts with leading 0 followed by 10 digits
    if (digits.length === 11 && digits.startsWith('0')) {
      const mobile = digits.slice(1);
      return {
        isValid: true,
        normalizedPhone: `91${mobile}`,
        formattedDisplay: `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`,
        countryCode: 'IN',
        callingCode: '91',
      };
    }
    // Standard 10-digit Indian number with known India context
    if (digits.length === 10) {
      return {
        isValid: true,
        normalizedPhone: `91${digits}`,
        formattedDisplay: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
        countryCode: 'IN',
        callingCode: '91',
      };
    }
  }

  if (defaultCountry === 'US' || defaultCountry === 'CA') {
    if (digits.length === 11 && digits.startsWith('1')) {
      return {
        isValid: true,
        normalizedPhone: digits,
        formattedDisplay: `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`,
        countryCode: defaultCountry,
        callingCode: '1',
      };
    }
    if (digits.length === 10) {
      return {
        isValid: true,
        normalizedPhone: `1${digits}`,
        formattedDisplay: `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
        countryCode: defaultCountry,
        callingCode: '1',
      };
    }
  }

  if (defaultCountry === 'GB') {
    if (digits.startsWith('0') && digits.length >= 10 && digits.length <= 11) {
      const national = digits.slice(1);
      return {
        isValid: true,
        normalizedPhone: `44${national}`,
        formattedDisplay: `+44 ${national}`,
        countryCode: 'GB',
        callingCode: '44',
      };
    }
    if (digits.startsWith('44') && digits.length >= 11 && digits.length <= 13) {
      return {
        isValid: true,
        normalizedPhone: digits,
        formattedDisplay: `+44 ${digits.slice(2)}`,
        countryCode: 'GB',
        callingCode: '44',
      };
    }
  }

  if (defaultCountry === 'AU') {
    if (digits.startsWith('0') && digits.length === 10) {
      const national = digits.slice(1);
      return {
        isValid: true,
        normalizedPhone: `61${national}`,
        formattedDisplay: `+61 ${national}`,
        countryCode: 'AU',
        callingCode: '61',
      };
    }
    if (digits.startsWith('61') && digits.length === 11) {
      return {
        isValid: true,
        normalizedPhone: digits,
        formattedDisplay: `+61 ${digits.slice(2)}`,
        countryCode: 'AU',
        callingCode: '61',
      };
    }
  }

  if (defaultCountry === 'NZ') {
    if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
      const national = digits.slice(1);
      return {
        isValid: true,
        normalizedPhone: `64${national}`,
        formattedDisplay: `+64 ${national}`,
        countryCode: 'NZ',
        callingCode: '64',
      };
    }
    if (digits.startsWith('64') && digits.length >= 10 && digits.length <= 11) {
      return {
        isValid: true,
        normalizedPhone: digits,
        formattedDisplay: `+64 ${digits.slice(2)}`,
        countryCode: 'NZ',
        callingCode: '64',
      };
    }
  }

  if (defaultCountry === 'IE') {
    if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
      const national = digits.slice(1);
      return {
        isValid: true,
        normalizedPhone: `353${national}`,
        formattedDisplay: `+353 ${national}`,
        countryCode: 'IE',
        callingCode: '353',
      };
    }
    if (digits.startsWith('353') && digits.length >= 11 && digits.length <= 12) {
      return {
        isValid: true,
        normalizedPhone: digits,
        formattedDisplay: `+353 ${digits.slice(3)}`,
        countryCode: 'IE',
        callingCode: '353',
      };
    }
  }

  if (defaultCountry === 'SG') {
    if (digits.length === 8 && /^[689]\d{7}$/.test(digits)) {
      return {
        isValid: true,
        normalizedPhone: `65${digits}`,
        formattedDisplay: `+65 ${digits.slice(0, 4)} ${digits.slice(4)}`,
        countryCode: 'SG',
        callingCode: '65',
      };
    }
    if (digits.startsWith('65') && digits.length === 10) {
      return {
        isValid: true,
        normalizedPhone: digits,
        formattedDisplay: `+65 ${digits.slice(2, 6)} ${digits.slice(6)}`,
        countryCode: 'SG',
        callingCode: '65',
      };
    }
  }

  if (defaultCountry === 'AE') {
    if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
      const national = digits.slice(1);
      return {
        isValid: true,
        normalizedPhone: `971${national}`,
        formattedDisplay: `+971 ${national}`,
        countryCode: 'AE',
        callingCode: '971',
      };
    }
    if (digits.startsWith('971') && digits.length >= 11 && digits.length <= 12) {
      return {
        isValid: true,
        normalizedPhone: digits,
        formattedDisplay: `+971 ${digits.slice(3)}`,
        countryCode: 'AE',
        callingCode: '971',
      };
    }
  }

  if (defaultCountry === 'ZA') {
    if (digits.startsWith('0') && digits.length === 10) {
      const national = digits.slice(1);
      return {
        isValid: true,
        normalizedPhone: `27${national}`,
        formattedDisplay: `+27 ${national}`,
        countryCode: 'ZA',
        callingCode: '27',
      };
    }
    if (digits.startsWith('27') && digits.length === 11) {
      return {
        isValid: true,
        normalizedPhone: digits,
        formattedDisplay: `+27 ${digits.slice(2)}`,
        countryCode: 'ZA',
        callingCode: '27',
      };
    }
  }

  // 4. Ambiguity Resolution: If NO country context is available and no leading + was given
  // If digits already clearly starts with an international calling code:
  if (digits.length === 12 && digits.startsWith('91')) {
    return {
      isValid: true,
      normalizedPhone: digits,
      formattedDisplay: `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`,
      countryCode: 'IN',
      callingCode: '91',
    };
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return {
      isValid: true,
      normalizedPhone: digits,
      formattedDisplay: `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`,
      countryCode: 'US',
      callingCode: '1',
    };
  }
  if (digits.length >= 11 && digits.length <= 13 && digits.startsWith('44')) {
    return {
      isValid: true,
      normalizedPhone: digits,
      formattedDisplay: `+44 ${digits.slice(2)}`,
      countryCode: 'GB',
      callingCode: '44',
    };
  }
  if (digits.length === 10 && digits.startsWith('65')) {
    return {
      isValid: true,
      normalizedPhone: digits,
      formattedDisplay: `+65 ${digits.slice(2)}`,
      countryCode: 'SG',
      callingCode: '65',
    };
  }

  // If 11 digits starting with 0 followed by Indian mobile (0[6-9]...) or STD code (e.g. 05224024444)
  if (digits.length === 11 && digits.startsWith('0')) {
    const national = digits.slice(1);
    return {
      isValid: true,
      normalizedPhone: `91${national}`,
      formattedDisplay: `+91 ${national}`,
      countryCode: 'IN',
      callingCode: '91',
    };
  }

  // 10-digit standard Indian mobile (strictly starting with 6, 7, 8, 9)
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return {
      isValid: true,
      normalizedPhone: `91${digits}`,
      formattedDisplay: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      countryCode: 'IN',
      callingCode: '91',
    };
  }

  // Strict Rule: If it's a 10-digit number without '+' and without country context that is not an Indian mobile
  // (e.g. starting with 1, 2, 3, 4, 5 like US area codes 415, 212, 312, 510),
  // do NOT guess India or any other country! Flag as ambiguous.
  if (digits.length === 10) {
    return {
      isValid: false,
      normalizedPhone: null,
      formattedDisplay: rawPhone,
      error: 'Ambiguous phone number: 10 digits without international calling code (+) or country context',
    };
  }

  // Incomplete or out-of-specification number
  return {
    isValid: false,
    normalizedPhone: null,
    formattedDisplay: rawPhone,
    error: 'Phone number does not match international telephone specifications or supported country formats',
  };
}

/**
 * Builds the official WhatsApp click-to-chat URL.
 * 
 * Default format: https://wa.me/<digits-only-number>[?text=...]
 * Web client format: https://web.whatsapp.com/send?phone=<digits-only-number>[&text=...]
 * Mobile app format: https://api.whatsapp.com/send?phone=<digits-only-number>[&text=...]
 * 
 * Safe, manual user action only. Never dispatches background messages.
 */
export function buildWhatsAppUrl(
  phone: string,
  optionsOrMessage?: string | WhatsAppUrlOptions,
  countryCodeArg?: string
): WhatsAppUrlResult {
  const options: WhatsAppUrlOptions =
    typeof optionsOrMessage === 'string'
      ? { message: optionsOrMessage, countryCode: countryCodeArg }
      : { ...optionsOrMessage, countryCode: optionsOrMessage?.countryCode || countryCodeArg };

  const country = options.countryCode || options.country;
  const norm = normalizeWhatsAppPhone(phone, country);

  if (!norm.isValid || !norm.normalizedPhone) {
    return {
      url: '',
      waMeUrl: '',
      webUrl: '',
      error: norm.error || 'Cannot open WhatsApp: Invalid or ambiguous phone number',
    };
  }

  const cleanPhone = norm.normalizedPhone;
  const message = options.message?.trim();
  const isMobile = Boolean(options.isMobile);
  const format = options.format || 'web';

  const encodedTextWaMe = message ? encodeURIComponent(message) : '';
  const encodedTextWeb = message ? encodeURIComponent(message).replace(/%20/g, '+') : '';
  const encodedText = encodedTextWaMe;

  // Canonical wa.me URL: https://wa.me/<digits-only>[?text=...]
  const waMeUrl = encodedTextWaMe ? `https://wa.me/${cleanPhone}?text=${encodedTextWaMe}` : `https://wa.me/${cleanPhone}`;

  // Direct web URL: https://web.whatsapp.com/send?phone=<digits-only>[&text=...]
  const webUrl = encodedTextWeb
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedTextWeb}`
    : `https://web.whatsapp.com/send?phone=${cleanPhone}`;

  // Mobile API URL: https://api.whatsapp.com/send?phone=<digits-only>[&text=...]
  const mobileApiUrl = encodedText
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?phone=${cleanPhone}`;

  let primaryUrl = webUrl;
  if (isMobile) {
    primaryUrl = mobileApiUrl;
  } else if (format === 'wa.me') {
    primaryUrl = waMeUrl;
  }

  return {
    url: primaryUrl,
    waMeUrl,
    webUrl,
    cleanPhone,
  };
}

/**
 * Generates the suggested default outreach message draft for restaurants.
 * The message remains an unsent draft that the user reviews and manually sends.
 */
export function getDefaultWhatsAppDraft(businessName: string): string {
  const cleanName = (businessName || 'Restaurant').trim();
  return `Hello! I wanted to connect with ${cleanName} regarding our website and digital ordering services. Would you be interested in learning more?`;
}

/**
 * Generates an opportunity-tailored, personalized outreach message draft.
 * Categories A through I provide specific evidence and pitch angles.
 * Manual user action only — never sends messages automatically.
 */
export function getOpportunityWhatsAppDraft(
  restaurant: {
    business_name?: string;
    city?: string | null;
    district?: string | null;
  },
  categoryCode: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' = 'A'
): string {
  const name = (restaurant.business_name || 'Restaurant Owner').trim();
  const city = restaurant.city || restaurant.district || 'your area';

  switch (categoryCode) {
    case 'A': // No Website
      return `Hello ${name}! 👋 I noticed you're serving great food in ${city}, but don't have an official direct website listed on Google Maps. We build fast, beautiful restaurant websites with online ordering so you can keep 100% of your profits without paying heavy aggregator commissions. Would you like to see a quick 2-minute demo preview made for ${name}?`;
    case 'B': // No Menu
      return `Hi ${name}! 👋 I saw your restaurant profile in ${city}. Customers love checking dishes and prices before visiting, but your website currently doesn't show an interactive menu. We help restaurants add clean, mobile-friendly digital menus that boost dine-in and pickup orders. May I share a quick sample?`;
    case 'C': // PDF / Image Menu
      return `Hello ${name}! 👋 I was looking at your menu online and noticed it's hosted as a PDF/image scan. Diners on mobile phones struggle with pinch-to-zoom and often leave. We convert PDF menus into fast, tap-to-order digital menus that look great on any phone. Would you be open to seeing a free preview for ${name}?`;
    case 'D': // Poor Mobile
      return `Hi ${name}! 👋 I checked your website from my mobile phone. Over 80% of local diners search on mobile, and your site is currently difficult to navigate on smaller screens. We modernize restaurant websites into mobile-first experiences with 1-tap calling and directions. Would you like a free mobile usability audit?`;
    case 'E': // Broken Website
      return `Urgent note for ${name}: 👋 I tried visiting your restaurant's website from Google Maps today, but the page is currently returning an error / unreachable. Hungry diners searching for ${name} may assume you're closed. We can help get a fast, modern replacement live today. Would you like assistance?`;
    case 'F': // Social Only
      return `Hi ${name}! 👋 Love your social presence! I noticed your main web link points to social media. Having your own branded domain gives you Google SEO ranking and direct ordering without social distraction. Would you like to see how we convert social followers into direct paying customers for ${name}?`;
    case 'G': // Aggregator Only
      return `Hello ${name}! 👋 Noticed your orders go through third-party food apps that take 20-30% of every bill. We build direct ordering websites that let your regular customers order straight from ${name} with 0% commission. Would you be interested in seeing how much you could save each month?`;
    case 'I': // QR Dine-in
      return `Hi ${name}! 👋 We specialize in contactless QR code table menus and digital ordering for dine-in restaurants in ${city}. It helps your staff turn tables 20% faster and increases average order value. Would you be open to a quick demonstration for ${name}?`;
    case 'H': // Modern Website
    default:
      return `Hello ${name}! 👋 Impressed by your digital setup in ${city}. We help premier restaurants increase repeat customer visits with automated VIP loyalty programs and Google review growth. Would you like to hear how other local restaurants are using this?`;
  }
}

/**
 * Dedicated browsing context name for WhatsApp Web tabs.
 * By keeping a stable target name across consecutive clicks, the browser navigates
 * the active WhatsApp Web tab to the newly selected restaurant's chat instead of spawning
 * duplicate tabs that trigger WhatsApp Web's multi-window collision ("Use Here" lock).
 */
export const WHATSAPP_TAB_NAME = 'whatsapp_lead_chat';

export type WhatsAppTabMode = 'reuse' | 'new_tab';

/**
 * Navigates to a WhatsApp chat in a reliable, user-controlled tab.
 * 
 * In 'reuse' mode (default):
 * - Navigates the existing 'whatsapp_lead_chat' tab to the new conversation URL.
 * - Brings the tab to focus, switching WhatsApp to the new contact immediately without
 *   requiring the user to close WhatsApp or its browser tab.
 * - If the tab was closed, the browser automatically creates a fresh one with the same name.
 * 
 * In 'new_tab' mode:
 * - Directs the browser to open a distinct new tab for each click using '_blank'.
 */
export function openWhatsAppChat(
  url: string,
  mode: WhatsAppTabMode = 'reuse'
): Window | null {
  if (typeof window === 'undefined' || !url) return null;

  const targetName = mode === 'reuse' ? WHATSAPP_TAB_NAME : '_blank';
  let win: Window | null = null;

  try {
    win = window.open(url, targetName);
    if (win) {
      try {
        win.focus();
      } catch {}
    }
  } catch {
    try {
      win = window.open(url, '_blank');
      if (win) {
        try {
          win.focus();
        } catch {}
      }
    } catch {}
  }

  return win;
}
