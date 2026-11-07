import { NextRequest, NextResponse } from 'next/server';
import { FOOD_SERVICE_CATEGORIES, searchCategories } from '@/lib/categories/food-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('search') || '';

    const categories = query ? searchCategories(query) : FOOD_SERVICE_CATEGORIES;

    return NextResponse.json({
      success: true,
      total: categories.length,
      categories,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
