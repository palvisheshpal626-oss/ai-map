// lib/exports/exporter.ts
// Secure CSV and Excel generation with UTF-8 support, formula injection protection,
// and telephone string preservation (prevents stripping leading zeroes).

import { Restaurant } from '../types';
import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import { isValidPhoneNumber } from '../deduplication/deduplicator';

/**
 * Sanitizes values against CSV/Excel Formula Injection (CSV Injection / CWE-1236).
 * Values starting with =, +, -, @, \t, \r could execute dangerous formulas when opened in Excel.
 */
export function sanitizeSpreadsheetCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`; // Prefix with single quote to force plain text rendering
  }
  return str;
}

export interface ExportColumn {
  key: string;
  header: string;
}

export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'business_name', header: 'Restaurant Name' },
  { key: 'category', header: 'Category' },
  { key: 'rating', header: 'Rating' },
  { key: 'review_count', header: 'Review Count' },
  { key: 'phone_number', header: 'Phone Number' },
  { key: 'email', header: 'Email' },
  { key: 'website_url', header: 'Website' },
  { key: 'formatted_address', header: 'Address' },
  { key: 'city', header: 'City' },
  { key: 'state', header: 'State' },
  { key: 'latitude', header: 'Latitude' },
  { key: 'longitude', header: 'Longitude' },
  { key: 'source', header: 'Source' },
  { key: 'search_id', header: 'Run ID' },
  { key: 'contact_verification_status', header: 'Verification Status' },
];

/**
 * Generates secure CSV content as a UTF-8 string with BOM for Excel compatibility
 */
export function generateCsvExport(restaurants: Restaurant[], customColumns?: ExportColumn[]): string {
  const cols = customColumns || EXPORT_COLUMNS;
  const headers = cols.map(c => c.header);

  const rows = restaurants.map(r => {
    return cols.map(col => {
      let rawVal: unknown = r[col.key as keyof Restaurant];
      if (col.key === 'source') {
        rawVal = r.source_provider === 'google_places' || !r.id.startsWith('osm-') ? 'Google Places' : 'OpenStreetMap';
      } else if (col.key === 'phone_number') {
        rawVal = isValidPhoneNumber(r.phone_number) ? (r.phone_number || r.normalized_phone || '') : '';
      } else if (col.key === 'rating') {
        rawVal = r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating)) ? Number(r.rating).toFixed(1) : '';
      } else if (col.key === 'review_count') {
        rawVal = r.review_count !== null && r.review_count !== undefined ? String(r.review_count) : '';
      } else if (col.key === 'search_id') {
        rawVal = r.search_id || '';
      } else if (col.key === 'latitude' || col.key === 'longitude') {
        rawVal = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';
      }
      return sanitizeSpreadsheetCell(rawVal);
    });
  });

  const csvBody = stringify([headers, ...rows]);
  // Prepend UTF-8 BOM so Excel opens non-ASCII and Indian names seamlessly
  return '\uFEFF' + csvBody;
}

/**
 * Generates Excel Workbook buffer with styled headers, auto-fit columns, and text-enforced phone columns
 */
export async function generateExcelExport(restaurants: Restaurant[], customColumns?: ExportColumn[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Restaurant Lead Finder';
  workbook.created = new Date();

  const cols = customColumns || EXPORT_COLUMNS;

  const worksheet = workbook.addWorksheet('Business Leads', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  worksheet.columns = cols.map(c => ({
    header: c.header,
    key: c.key,
    width: c.key === 'formatted_address' ? 36 : c.key === 'business_name' ? 28 : c.key === 'email' ? 24 : 18,
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  for (const r of restaurants) {
    const rowData: Record<string, unknown> = {};
    for (const col of cols) {
      let rawVal: unknown = r[col.key as keyof Restaurant];
      if (col.key === 'source') {
        rawVal = r.source_provider === 'google_places' || !r.id.startsWith('osm-') ? 'Google Places' : 'OpenStreetMap';
      } else if (col.key === 'phone_number') {
        rawVal = isValidPhoneNumber(r.phone_number) ? (r.phone_number || r.normalized_phone || '') : '';
      } else if (col.key === 'rating') {
        rawVal = r.rating !== null && r.rating !== undefined && !isNaN(Number(r.rating)) ? Number(r.rating).toFixed(1) : '';
      } else if (col.key === 'review_count') {
        rawVal = r.review_count !== null && r.review_count !== undefined ? String(r.review_count) : '';
      } else if (col.key === 'search_id') {
        rawVal = r.search_id || '';
      } else if (col.key === 'latitude' || col.key === 'longitude') {
        rawVal = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';
      }
      rowData[col.key] = sanitizeSpreadsheetCell(rawVal);
    }
    const addedRow = worksheet.addRow(rowData);

    // Format phone column explicitly as Text string so leading zeroes/country codes are kept
    const phoneCell = addedRow.getCell('phone_number');
    if (phoneCell) {
      phoneCell.numFmt = '@';
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
