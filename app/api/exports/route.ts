import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store/memory-store';
import { generateCsvExport, generateExcelExport } from '@/lib/exports/exporter';
import { isValidPhoneNumber } from '@/lib/deduplication/deduplicator';
import { PhoneFilterOption, Restaurant } from '@/lib/types';

function filterExportList(
  baseList: Restaurant[],
  opts: {
    restaurantIds?: string[];
    phoneFilter?: PhoneFilterOption;
    minRating?: number | null;
    search?: string;
  }
): Restaurant[] {
  let list = [...baseList];

  if (opts.restaurantIds && opts.restaurantIds.length > 0) {
    const set = new Set(opts.restaurantIds);
    list = list.filter(r => set.has(r.id));
  }

  if (opts.phoneFilter === 'with_phone') {
    list = list.filter(r => isValidPhoneNumber(r.phone_number));
  } else if (opts.phoneFilter === 'without_phone') {
    list = list.filter(r => !isValidPhoneNumber(r.phone_number));
  }

  if (opts.minRating !== null && opts.minRating !== undefined && !isNaN(opts.minRating)) {
    list = list.filter(r => r.rating !== null && r.rating !== undefined && Number(r.rating) >= opts.minRating!);
  }

  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(r =>
      (r.business_name || '').toLowerCase().includes(q) ||
      (r.formatted_address || '').toLowerCase().includes(q) ||
      (r.city || '').toLowerCase().includes(q)
    );
  }

  return list;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      format = 'csv',
      restaurantIds,
      phoneFilter,
      runId,
      jobId,
      searchId,
      view,
      minRating,
      search,
    } = body as {
      format: 'csv' | 'xlsx';
      restaurantIds?: string[];
      phoneFilter?: PhoneFilterOption;
      runId?: string;
      jobId?: string;
      searchId?: string;
      view?: 'live' | 'saved';
      minRating?: number | null;
      search?: string;
    };

    const targetId = runId || jobId || searchId;
    let baseList: Restaurant[] = [];

    if (targetId) {
      baseList = store.getRestaurantsForRun(targetId);
    } else if (view === 'live') {
      const activeRun = store.getLatestSearchRun();
      baseList = activeRun ? [...activeRun.results] : [];
    } else {
      baseList = store.getAllRestaurants();
      if (baseList.length === 0) {
        await store.syncFromSupabase();
        baseList = store.getAllRestaurants();
      }
    }

    const list = filterExportList(baseList, {
      restaurantIds,
      phoneFilter,
      minRating,
      search,
    });

    if (format === 'csv') {
      const csvData = generateCsvExport(list);
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="restaurant-leads-${Date.now()}.csv"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } else {
      const excelBuffer = await generateExcelExport(list);
      return new NextResponse(excelBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="restaurant-leads-${Date.now()}.xlsx"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv') as 'csv' | 'xlsx';
    const runId = searchParams.get('run_id') || searchParams.get('job_id') || searchParams.get('search_id');
    const view = searchParams.get('view') as 'live' | 'saved' | null;
    const phoneFilter = searchParams.get('phone_filter') as PhoneFilterOption | null;
    const minRating = searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : null;
    const search = searchParams.get('search') || undefined;

    let baseList: Restaurant[] = [];
    if (runId) {
      baseList = store.getRestaurantsForRun(runId);
    } else if (view === 'live') {
      const activeRun = store.getLatestSearchRun();
      baseList = activeRun ? [...activeRun.results] : [];
    } else {
      baseList = store.getAllRestaurants();
      if (baseList.length === 0) {
        await store.syncFromSupabase();
        baseList = store.getAllRestaurants();
      }
    }

    const list = filterExportList(baseList, {
      phoneFilter: phoneFilter || undefined,
      minRating,
      search,
    });

    if (format === 'csv') {
      const csvData = generateCsvExport(list);
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="restaurant-leads-${Date.now()}.csv"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } else {
      const excelBuffer = await generateExcelExport(list);
      return new NextResponse(excelBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="restaurant-leads-${Date.now()}.xlsx"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
