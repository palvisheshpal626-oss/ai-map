import { NextRequest, NextResponse } from 'next/server';
import { ProviderRegistry } from '@/lib/providers/registry';

export async function GET() {
  const providers = ProviderRegistry.getAllProviders().map(p => ({
    id: p.id,
    name: p.name,
    isConfigured: p.isConfigured(),
    capabilities: p.capabilities,
  }));
  return NextResponse.json({ success: true, providers });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId } = body as { providerId: string };
    const provider = ProviderRegistry.getProvider(providerId);
    const testResult = await provider.testConnection();

    return NextResponse.json({ success: true, testResult });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
