import { NextRequest, NextResponse } from 'next/server';
import {
  getAllIndianStatesAndUTs,
  getNormalizedIndiaLocations,
  searchIndianLocations,
  addCustomLocality,
} from '@/lib/locations/india';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('search') || '';
    const stateFilter = searchParams.get('state')?.toLowerCase() || '';
    const statesOnly = searchParams.get('states_only') === 'true';

    const statesAndUTs = getAllIndianStatesAndUTs();

    if (statesOnly) {
      return NextResponse.json({
        success: true,
        country: 'India',
        total_states_and_uts: statesAndUTs.length,
        states_count: 28,
        uts_count: 8,
        states: statesAndUTs,
      });
    }

    let locations = getNormalizedIndiaLocations();

    if (query) {
      locations = searchIndianLocations(query);
    } else if (stateFilter) {
      locations = locations.filter(l => l.state.toLowerCase() === stateFilter);
    }

    return NextResponse.json({
      success: true,
      country: 'India',
      total_locations: locations.length,
      total_states_and_uts: statesAndUTs.length,
      states_and_uts: statesAndUTs,
      locations,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state, district, city, locality } = body;

    if (!state || !district || !locality) {
      return NextResponse.json(
        { success: false, error: 'State, district, and locality are required fields.' },
        { status: 400 }
      );
    }

    const newLoc = addCustomLocality(state, district, city || district, locality);

    return NextResponse.json({
      success: true,
      message: `Custom locality "${locality}" registered successfully.`,
      location: newLoc,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to create custom locality' },
      { status: 500 }
    );
  }
}
