// app/api/offline/cleanup/route.ts
// API endpoints for previewing and executing Safe & Strict storage cleanup policies

import { NextRequest, NextResponse } from 'next/server';
import { offlineDataManager } from '@/lib/offline/data-manager';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const policy = (url.searchParams.get('policy') as 'safe' | 'strict') || 'safe';

    const preview = offlineDataManager.previewCleanup(policy);

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error generating cleanup preview' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const policy = (body.policy as 'safe' | 'strict') || 'safe';
    const confirmed = Boolean(body.confirmed);

    if (policy === 'strict' && !confirmed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Strict cleanup permanently deletes unverified raw records and requires explicit user confirmation.',
        },
        { status: 400 }
      );
    }

    const result = await offlineDataManager.executeCleanup(policy, confirmed);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error executing cleanup' },
      { status: 500 }
    );
  }
}
