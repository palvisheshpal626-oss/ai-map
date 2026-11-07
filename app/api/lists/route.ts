import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store/memory-store';

export async function GET() {
  const lists = store.getAllLists();
  return NextResponse.json({ success: true, lists });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listId, restaurantId, action } = body as {
      listId: string;
      restaurantId: string;
      action?: 'add' | 'remove';
    };

    if (action === 'remove') {
      store.removeFromList(listId, restaurantId);
    } else {
      store.addToList(listId, restaurantId);
    }

    return NextResponse.json({ success: true, lists: store.getAllLists() });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
