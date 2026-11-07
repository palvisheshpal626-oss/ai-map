import { describe, it, expect } from 'vitest';
import { analyzeRestaurantOpportunity } from './opportunity-analyzer';
import { Restaurant } from '../types';

describe('Opportunity Analyzer Engine (Categories A through I)', () => {
  it('identifies Category A: No Website (Prime Prospect)', () => {
    const opp = analyzeRestaurantOpportunity({
      restaurant: {
        business_name: 'Sharma Sweets',
        website_url: null,
        website_status: 'WEBSITE_NOT_LISTED',
      },
    });

    expect(opp.categoryCode).toBe('A');
    expect(opp.category).toBe('A_NO_WEBSITE');
    expect(opp.opportunityScore).toBe(95);
    expect(opp.pitchAngle).toContain('Launch custom branded restaurant website');
  });

  it('identifies Category F: Social-Media-Only Presence', () => {
    const opp = analyzeRestaurantOpportunity({
      restaurant: {
        business_name: 'Bistro Cafe',
        website_url: 'https://instagram.com/bistrocafe_official',
        website_status: 'WEBSITE_LISTED',
      },
    });

    expect(opp.categoryCode).toBe('F');
    expect(opp.category).toBe('F_SOCIAL_ONLY');
    expect(opp.technicalDetails.isSocialOnly).toBe(true);
  });

  it('identifies Category G: Aggregator-Only Presence', () => {
    const opp = analyzeRestaurantOpportunity({
      restaurant: {
        business_name: 'Biryani Corner',
        website_url: 'https://www.zomato.com/lucknow/biryani-corner',
        website_status: 'WEBSITE_LISTED',
      },
    });

    expect(opp.categoryCode).toBe('G');
    expect(opp.category).toBe('G_AGGREGATOR_ONLY');
    expect(opp.technicalDetails.isAggregatorOnly).toBe(true);
    expect(opp.opportunityScore).toBe(92);
  });

  it('identifies Category E: Broken Website', () => {
    const opp = analyzeRestaurantOpportunity({
      restaurant: {
        business_name: 'Old Town Diner',
        website_url: 'https://oldtowndiner.com',
        website_status: 'WEBSITE_UNREACHABLE',
      },
      httpStatusCode: 502,
    });

    expect(opp.categoryCode).toBe('E');
    expect(opp.category).toBe('E_BROKEN_WEBSITE');
    expect(opp.opportunityScore).toBe(94);
  });

  it('identifies Category D: Poor Mobile Usability (Missing Viewport)', () => {
    const sampleHtml = `<!DOCTYPE html><html><head><title>Cafe</title></head><body><h1>Welcome</h1><div id="menu">Burger $5</div></body></html>`;
    const opp = analyzeRestaurantOpportunity({
      restaurant: {
        business_name: 'Cafe Retro',
        website_url: 'https://caferetro.com',
        website_status: 'WEBSITE_REACHABLE',
      },
      htmlContent: sampleHtml,
    });

    expect(opp.categoryCode).toBe('D');
    expect(opp.category).toBe('D_POOR_MOBILE');
    expect(opp.technicalDetails.viewportMetaPresent).toBe(false);
  });

  it('identifies Category C: PDF / Image Menu Only', () => {
    const sampleHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><title>Steakhouse</title></head><body><a href="/assets/menu-dinner.pdf">Download Menu PDF</a></body></html>`;
    const opp = analyzeRestaurantOpportunity({
      restaurant: {
        business_name: 'Steakhouse 21',
        website_url: 'https://steakhouse21.com',
        website_status: 'WEBSITE_REACHABLE',
      },
      htmlContent: sampleHtml,
    });

    expect(opp.categoryCode).toBe('C');
    expect(opp.category).toBe('C_PDF_IMAGE_MENU');
    expect(opp.technicalDetails.hasPdfMenu).toBe(true);
    expect(opp.technicalDetails.menuUrlsFound).toContain('/assets/menu-dinner.pdf');
  });

  it('identifies Category B: Website Without Menu', () => {
    const sampleHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><title>Hotel</title></head><body><h1>About Us</h1><p>We are a historic hotel with dining room.</p></body></html>`;
    const opp = analyzeRestaurantOpportunity({
      restaurant: {
        business_name: 'Grand Hotel',
        website_url: 'https://grandhotel.com',
        website_status: 'WEBSITE_REACHABLE',
      },
      htmlContent: sampleHtml,
    });

    expect(opp.categoryCode).toBe('B');
    expect(opp.category).toBe('B_NO_MENU');
    expect(opp.opportunityScore).toBe(75);
  });

  it('identifies Category I: Dine-in QR Opportunity', () => {
    const sampleHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><title>Diner</title></head><body><div class="menu"><div class="menu-item">Pasta - $12</div></div></body></html>`;
    const opp = analyzeRestaurantOpportunity({
      restaurant: {
        business_name: 'Luigi Diner',
        category: 'Italian Restaurant',
        website_url: 'https://luigidiner.com',
        website_status: 'WEBSITE_REACHABLE',
      },
      htmlContent: sampleHtml,
    });

    expect(opp.categoryCode).toBe('I');
    expect(opp.category).toBe('I_QR_MENU_OPPORTUNITY');
  });

  it('identifies Category H: Modern Website with Live Menu and Online Ordering', () => {
    const sampleHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><title>Pizza</title></head><body><div class="menu"><div class="menu-item">Margherita</div><button>Add to Cart</button><button>Order Online</button></div></body></html>`;
    const opp = analyzeRestaurantOpportunity({
      restaurant: {
        business_name: 'Modern Pizzeria',
        website_url: 'https://modernpizzeria.com',
        website_status: 'WEBSITE_REACHABLE',
      },
      htmlContent: sampleHtml,
    });

    expect(opp.categoryCode).toBe('H');
    expect(opp.category).toBe('H_MODERN_WEBSITE');
    expect(opp.opportunityScore).toBe(35);
  });
});
