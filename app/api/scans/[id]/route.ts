import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store/memory-store';
import { ScanWorker } from '@/lib/workers/scan-worker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = store.getJobById(id);
  if (!job) {
    return NextResponse.json({ success: false, error: 'Scan job not found' }, { status: 404 });
  }
  const tasks = store.getTasksForJob(id);
  const filter = request.nextUrl.searchParams.get('filter') as 'all' | 'qualified' | 'rejected' | 'unverified' | null;
  const audits = store.getCandidateAudits(id, filter || undefined);
  return NextResponse.json({ success: true, job, tasks, audits });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const action = body.action as 'pause' | 'resume' | 'start' | 'cancel';

  if (action === 'pause') {
    ScanWorker.pauseJob(id);
  } else if (action === 'resume' || action === 'start') {
    ScanWorker.resumeJob(id);
  } else if (action === 'cancel') {
    ScanWorker.cancelJob(id);
  } else {
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true, job: store.getJobById(id) });
}
