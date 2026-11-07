// app/api/offline/search/route.ts
// API endpoint for instant offline local business discovery

import { NextRequest, NextResponse } from 'next/server';
import { offlineDataManager } from '@/lib/offline/data-manager';
import { PhoneFilterOption } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';
    const areaId = url.searchParams.get('areaId') || undefined;
    const cityName = url.searchParams.get('city') || undefined;
    const districtName = url.searchParams.get('district') || undefined;
    const stateName = url.searchParams.get('state') || undefined;
    const category = url.searchParams.get('category') || undefined;
    const phoneFilter = (url.searchParams.get('phoneFilter') as PhoneFilterOption) || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const result = offlineDataManager.searchLocal({
      query,
      areaId,
      cityName,
      districtName,
      stateName,
      category,
      phoneFilter,
      limit,
    });

    return NextResponse.json({
      success: true,
      records: result.records,
      total: result.total,
      fromOffline: true,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error executing local offline search' },
      { status: 500 }
    );
  }
}
