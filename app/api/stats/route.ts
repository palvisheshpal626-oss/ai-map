import { NextResponse } from 'next/server';
import { store } from '@/lib/store/memory-store';
import { ProviderRegistry } from '@/lib/providers/registry';

export async function GET() {
  try {
    const stats = store.getDashboardStats();
    const providers = ProviderRegistry.getAllProviders().map(p => ({
      id: p.id,
      name: p.name,
      configured: p.isConfigured(),
      capabilities: p.capabilities,
    }));

    return NextResponse.json({
      success: true,
      stats,
      providers,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
