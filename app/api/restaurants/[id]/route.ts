import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store/memory-store';
import { persistenceService } from '@/lib/database/persistence-service';
import { verifyRestaurantWebsite } from '@/lib/websites/verifier';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let restaurant = store.getRestaurantById(id);
  if (!restaurant) {
    // Attempt fallback from Supabase
    const { leads } = await persistenceService.getCampaignPersistedLeads(id);
    if (leads.length > 0) {
      restaurant = leads[0];
    }
  }

  if (!restaurant) {
    return NextResponse.json({ success: false, error: 'Restaurant not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, restaurant });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.whatsapp_status !== undefined || body.status !== undefined) {
      const result = await persistenceService.updateWhatsAppVerification(id, {
        status: body.whatsapp_status || body.status,
        verificationMethod: body.whatsapp_verification_method || body.verificationMethod || 'manual_user_check',
        verifiedBy: body.whatsapp_verified_by || body.verifiedBy || 'manual_operator',
        notes: body.whatsapp_verification_notes || body.notes || null,
        userConfirmed: body.userConfirmed !== false,
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, restaurant: result.restaurant });
    }

    const restaurant = store.getRestaurantById(id);
    if (!restaurant) {
      return NextResponse.json({ success: false, error: 'Restaurant not found' }, { status: 404 });
    }

    const updated = store.saveRestaurant({ ...restaurant, ...body });
    return NextResponse.json({ success: true, restaurant: updated.restaurant });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurant = store.getRestaurantById(id);
  if (!restaurant) {
    return NextResponse.json({ success: false, error: 'Restaurant not found' }, { status: 404 });
  }

  // Trigger real HTTP website check
  const check = await verifyRestaurantWebsite(restaurant.website_url);

  // Update restaurant status
  restaurant.website_status = check.status;
  restaurant.last_checked_at = check.checkedAt;

  // Re-save & re-score
  store.saveRestaurant(restaurant);

  return NextResponse.json({
    success: true,
    verification: check,
    restaurant: store.getRestaurantById(id),
  });
}
