// app/api/restaurants/[id]/whatsapp/route.ts
// Dedicated API route for WhatsApp availability verification and audit updates
import { NextRequest, NextResponse } from 'next/server';
import { persistenceService } from '@/lib/database/persistence-service';
import { ManualWhatsAppVerificationInput } from '@/lib/whatsapp/verifier';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Restaurant ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const input: ManualWhatsAppVerificationInput = {
      status: body.status,
      verificationMethod: body.verificationMethod || 'manual_user_check',
      verifiedBy: body.verifiedBy || 'manual_operator',
      notes: body.notes || null,
      userConfirmed: body.userConfirmed !== false,
    };

    const result = await persistenceService.updateWhatsAppVerification(id, input);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update WhatsApp verification' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurant: result.restaurant,
      message: 'WhatsApp availability successfully updated',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return POST(request, context);
}
