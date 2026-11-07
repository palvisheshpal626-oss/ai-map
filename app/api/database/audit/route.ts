// app/api/database/audit/route.ts
// API endpoints for Database Content Audit & Provenance Verification

import { NextRequest, NextResponse } from 'next/server';
import { databaseAuditService } from '@/lib/database/audit-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const previewCategory = searchParams.get('preview_category') as
      | 'test_fixture'
      | 'mock_data'
      | 'invalid_data'
      | null;

    if (previewCategory) {
      const preview = await databaseAuditService.previewCleanup(previewCategory);
      return NextResponse.json({ success: true, preview });
    }

    const report = await databaseAuditService.auditDatabase();
    return NextResponse.json({ success: true, report });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Database audit failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target_category, confirmation_token } = body;

    if (!target_category || !confirmation_token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: target_category and confirmation_token',
        },
        { status: 400 }
      );
    }

    const result = await databaseAuditService.executeCleanup(target_category, confirmation_token);
    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Cleanup execution failed' },
      { status: 500 }
    );
  }
}
