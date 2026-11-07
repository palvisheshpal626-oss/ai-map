// app/api/offline/areas/route.ts
// API endpoints for managing offline city-scoped OpenStreetMap data extracts

import { NextRequest, NextResponse } from 'next/server';
import { offlineDataManager } from '@/lib/offline/data-manager';
import { store } from '@/lib/store/memory-store';

export async function GET() {
  try {
    const areas = store.getAllOfflineAreas();
    const metrics = offlineDataManager.getStorageMetrics();

    return NextResponse.json({
      success: true,
      areas,
      metrics,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to retrieve offline areas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cityName, districtName, stateName, customBbox, forceRefresh } = body;

    if (!cityName || !districtName || !stateName) {
      return NextResponse.json(
        { success: false, error: 'City, District, and State names are required to download an offline extract.' },
        { status: 400 }
      );
    }

    const result = await offlineDataManager.downloadCityData({
      cityName,
      districtName,
      stateName,
      customBbox,
      forceRefresh: Boolean(forceRefresh),
    });

    return NextResponse.json({
      success: true,
      area: result.area,
      rawCount: result.rawCount,
      normalizedCount: result.normalizedCount,
      duplicateCount: result.duplicateCount,
      isUnchanged: result.isUnchanged,
      error: result.error,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error downloading city offline extract' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { areaId } = body;

    if (!areaId) {
      return NextResponse.json(
        { success: false, error: 'areaId is required to refresh an offline area extract.' },
        { status: 400 }
      );
    }

    const result = await offlineDataManager.refreshArea(areaId);

    return NextResponse.json({
      success: true,
      area: result.area,
      updated: result.updated,
      recordsCount: result.recordsCount,
      notes: result.notes,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error refreshing offline area' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const areaId = url.searchParams.get('areaId');

    if (!areaId) {
      return NextResponse.json(
        { success: false, error: 'areaId query parameter is required.' },
        { status: 400 }
      );
    }

    const deleted = store.deleteOfflineArea(areaId);

    return NextResponse.json({
      success: true,
      deleted,
      message: deleted ? `Successfully deleted offline area ${areaId}` : `Area ${areaId} not found`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error deleting offline area' },
      { status: 500 }
    );
  }
}
