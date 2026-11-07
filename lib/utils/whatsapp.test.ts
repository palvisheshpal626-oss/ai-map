import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeWhatsAppPhone,
  buildWhatsAppUrl,
  getDefaultWhatsAppDraft,
  getOpportunityWhatsAppDraft,
  openWhatsAppChat,
  WHATSAPP_TAB_NAME,
} from './whatsapp';

describe('International WhatsApp Utilities Suite', () => {
  describe('Phone Normalization & International Numbering Plans', () => {
    it('normalizes 10-digit Indian mobile number with IN context to 91 prefix', () => {
      const res = normalizeWhatsAppPhone('9876543210', 'IN');
      expect(res.isValid).toBe(true);
      expect(res.normalizedPhone).toBe('919876543210');
      expect(res.formattedDisplay).toBe('+91 98765 43210');
      expect(res.countryCode).toBe('IN');
      expect(res.callingCode).toBe('91');
    });

    it('does NOT add 91 twice if already prefixed with 91 or +91', () => {
      const res1 = normalizeWhatsAppPhone('919876543210', 'IN');
      expect(res1.isValid).toBe(true);
      expect(res1.normalizedPhone).toBe('919876543210');
      expect(res1.normalizedPhone?.startsWith('9191')).toBe(false);

      const res2 = normalizeWhatsAppPhone('+91 9876543210');
      expect(res2.isValid).toBe(true);
      expect(res2.normalizedPhone).toBe('919876543210');
      expect(res2.normalizedPhone?.startsWith('9191')).toBe(false);
    });

    it('handles +91 prefix with spaces and brackets properly', () => {
      const res = normalizeWhatsAppPhone('+91 (987) 654-3210');
      expect(res.isValid).toBe(true);
      expect(res.normalizedPhone).toBe('919876543210');
    });

    it('replaces leading 0 with 91 for Indian landlines/mobiles with IN context', () => {
      const res = normalizeWhatsAppPhone('0522 4024444', 'IN');
      expect(res.isValid).toBe(true);
      expect(res.normalizedPhone).toBe('915224024444');
    });

    it('rejects invalid or placeholder phone numbers', () => {
      expect(normalizeWhatsAppPhone('Unavailable').isValid).toBe(false);
      expect(normalizeWhatsAppPhone('N/A').isValid).toBe(false);
      expect(normalizeWhatsAppPhone(null).isValid).toBe(false);
      expect(normalizeWhatsAppPhone('0000000000').isValid).toBe(false);
      expect(normalizeWhatsAppPhone('12345').isValid).toBe(false);
    });

    it('flags ambiguous 10-digit numbers without calling code or country context', () => {
      // Must NEVER guess India or prepend 91 when country is unknown!
      const res = normalizeWhatsAppPhone('4155552671');
      expect(res.isValid).toBe(false);
      expect(res.normalizedPhone).toBeNull();
      expect(res.error).toContain('Ambiguous phone number');
    });
  });

  describe('Official URL Generation (wa.me and WhatsApp Web Formats)', () => {
    it('generates canonical wa.me URL for US number without prepending 91', () => {
      // Test example from user prompt: +1 213-788-1191 -> https://wa.me/12137881191
      const res = buildWhatsAppUrl('+1 213-788-1191');
      expect(res.error).toBeUndefined();
      expect(res.waMeUrl).toBe('https://wa.me/12137881191');
      expect(res.cleanPhone).toBe('12137881191');
      expect(res.url).toBe('https://web.whatsapp.com/send?phone=12137881191');
    });

    it('generates canonical wa.me URL with prefilled encoded message text', () => {
      const draft = getDefaultWhatsAppDraft('Taj Mahal Palace');
      const res = buildWhatsAppUrl('+91 98765 43210', { message: draft });
      expect(res.error).toBeUndefined();
      expect(res.waMeUrl.startsWith('https://wa.me/919876543210?text=')).toBe(true);
      expect(res.waMeUrl).toContain('Taj%20Mahal%20Palace');
    });

    it('supports canonical wa.me format when format: "wa.me" is explicitly requested', () => {
      const res = buildWhatsAppUrl('+91 98765 43210', { format: 'wa.me' });
      expect(res.url).toBe('https://wa.me/919876543210');
      expect(res.waMeUrl).toBe('https://wa.me/919876543210');
    });

    it('supports web client format when format: "web" is explicitly requested', () => {
      const res = buildWhatsAppUrl('+91 98765 43210', { format: 'web' });
      expect(res.url).toBe('https://web.whatsapp.com/send?phone=919876543210');
      expect(res.waMeUrl).toBe('https://wa.me/919876543210');
    });

    it('supports mobile API URL when isMobile: true is passed', () => {
      const res = buildWhatsAppUrl('+91 98765 43210', { isMobile: true });
      expect(res.url).toBe('https://api.whatsapp.com/send?phone=919876543210');
      expect(res.waMeUrl).toBe('https://wa.me/919876543210');
    });
  });

  describe('Multi-Country Phone Formatting across 10 Priority Countries', () => {
    const countries = [
      { name: 'India', code: 'IN', raw: '+91 98765 43210', expectedDigits: '919876543210' },
      { name: 'United States', code: 'US', raw: '+1 (213) 788-1191', expectedDigits: '12137881191' },
      { name: 'United Kingdom', code: 'GB', raw: '+44 20 7946 0912', expectedDigits: '442079460912' },
      { name: 'Canada', code: 'CA', raw: '+1 416-555-0199', expectedDigits: '14165550199' },
      { name: 'Australia', code: 'AU', raw: '+61 2 9374 4000', expectedDigits: '61293744000' },
      { name: 'New Zealand', code: 'NZ', raw: '+64 9 302 5555', expectedDigits: '6493025555' },
      { name: 'Ireland', code: 'IE', raw: '+353 1 496 0000', expectedDigits: '35314960000' },
      { name: 'Singapore', code: 'SG', raw: '+65 6737 1234', expectedDigits: '6567371234' },
      { name: 'United Arab Emirates', code: 'AE', raw: '+971 4 366 1688', expectedDigits: '97143661688' },
      { name: 'South Africa', code: 'ZA', raw: '+27 11 300 8700', expectedDigits: '27113008700' },
    ];

    countries.forEach(({ name, code, raw, expectedDigits }) => {
      it(`accurately formats ${name} (${code}) to canonical wa.me URL without prepending 91`, () => {
        const norm = normalizeWhatsAppPhone(raw, code);
        expect(norm.isValid).toBe(true);
        expect(norm.normalizedPhone).toBe(expectedDigits);

        const urlRes = buildWhatsAppUrl(raw, { countryCode: code });
        expect(urlRes.waMeUrl).toBe(`https://wa.me/${expectedDigits}`);
        expect(urlRes.waMeUrl).not.toContain('91' + expectedDigits);
        expect(urlRes.webUrl).toBe(`https://web.whatsapp.com/send?phone=${expectedDigits}`);
      });
    });

    it('correctly handles national numbers when country context is provided', () => {
      // US national format with US context
      const usRes = normalizeWhatsAppPhone('(213) 788-1191', 'US');
      expect(usRes.isValid).toBe(true);
      expect(usRes.normalizedPhone).toBe('12137881191');

      // UK national format with GB context (leading 0 replaced with 44)
      const ukRes = normalizeWhatsAppPhone('020 7946 0912', 'GB');
      expect(ukRes.isValid).toBe(true);
      expect(ukRes.normalizedPhone).toBe('442079460912');

      // Singapore national format with SG context
      const sgRes = normalizeWhatsAppPhone('6737 1234', 'SG');
      expect(sgRes.isValid).toBe(true);
      expect(sgRes.normalizedPhone).toBe('6567371234');

      // Australia national format with AU context
      const auRes = normalizeWhatsAppPhone('02 9374 4000', 'AU');
      expect(auRes.isValid).toBe(true);
      expect(auRes.normalizedPhone).toBe('61293744000');
    });
  });

  describe('Consecutive WhatsApp Chat Switching and Tab Management', () => {
    const mockFocus = vi.fn();
    const mockWindowOpen = vi.fn();

    beforeEach(() => {
      mockFocus.mockClear();
      mockWindowOpen.mockClear();
      mockWindowOpen.mockReturnValue({ focus: mockFocus, closed: false });
      vi.stubGlobal('window', {
        open: mockWindowOpen,
      });
    });

    it('Scenario 1: In reuse mode, openWhatsAppChat targets WHATSAPP_TAB_NAME', () => {
      const url = 'https://wa.me/919876543210';
      openWhatsAppChat(url, 'reuse');

      expect(mockWindowOpen).toHaveBeenCalledTimes(1);
      expect(mockWindowOpen).toHaveBeenCalledWith(url, WHATSAPP_TAB_NAME);
      expect(mockFocus).toHaveBeenCalledTimes(1);
    });

    it('Scenario 2: Consecutive clicks for Restaurant A -> B -> C navigate the same tab to respective URLs', () => {
      const restA = { name: 'Falaks Rooftop', phone: '05224024444', country: 'India' };
      const restB = { name: 'Bavel DTLA', phone: '+1 213-788-1191', country: 'United States' };
      const restC = { name: 'Burnt Ends', phone: '+65 6224 3933', country: 'Singapore' };

      const urlA = buildWhatsAppUrl(restA.phone, { country: restA.country, format: 'wa.me' }).url;
      openWhatsAppChat(urlA, 'reuse');
      expect(mockWindowOpen).toHaveBeenLastCalledWith('https://wa.me/915224024444', WHATSAPP_TAB_NAME);

      const urlB = buildWhatsAppUrl(restB.phone, { country: restB.country, format: 'wa.me' }).url;
      openWhatsAppChat(urlB, 'reuse');
      expect(mockWindowOpen).toHaveBeenLastCalledWith('https://wa.me/12137881191', WHATSAPP_TAB_NAME);

      const urlC = buildWhatsAppUrl(restC.phone, { country: restC.country, format: 'wa.me' }).url;
      openWhatsAppChat(urlC, 'reuse');
      expect(mockWindowOpen).toHaveBeenLastCalledWith('https://wa.me/6562243933', WHATSAPP_TAB_NAME);

      expect(mockWindowOpen).toHaveBeenCalledTimes(3);
      const targetNames = mockWindowOpen.mock.calls.map(c => c[1]);
      expect(targetNames).toEqual([WHATSAPP_TAB_NAME, WHATSAPP_TAB_NAME, WHATSAPP_TAB_NAME]);
    });

    it('Scenario 3: Prepared message draft incorporates business name and targets WHATSAPP_TAB_NAME', () => {
      const rest = { name: 'Oudhyana Taj', phone: '+91 522 671 1000' };
      const draft = getDefaultWhatsAppDraft(rest.name);
      const url = buildWhatsAppUrl(rest.phone, { message: draft, format: 'wa.me' }).url;

      openWhatsAppChat(url, 'reuse');

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/915226711000?text='),
        WHATSAPP_TAB_NAME
      );
      expect(mockWindowOpen.mock.calls[0][0]).toContain('Oudhyana%20Taj');
    });

    it('Scenario 4: In new_tab mode, openWhatsAppChat targets _blank', () => {
      const url = 'https://wa.me/919876543210';
      openWhatsAppChat(url, 'new_tab');

      expect(mockWindowOpen).toHaveBeenCalledWith(url, '_blank');
    });

    it('Scenario 5: Recovers gracefully when window.open fails on restricted environments', () => {
      mockWindowOpen.mockImplementationOnce(() => {
        throw new Error('Blocked popup');
      });

      const url = 'https://wa.me/919876543210';
      expect(() => openWhatsAppChat(url, 'reuse')).not.toThrow();
    });
  });
});
