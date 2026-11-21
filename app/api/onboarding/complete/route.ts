import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';
import { toMinor } from '@/lib/domain/money';

const OnboardingItemSchema = z.object({
  catalogItemId: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  unit: z.string().default('piece'),
  sellPrice: z.number().optional().nullable(),
  costPrice: z.number().optional().nullable(),
  startingQty: z.number().optional().nullable(),
});

const OnboardingCompleteSchema = z.object({
  businessType: z.enum(['retail', 'wholesale']),
  categories: z.array(z.string()).min(1, 'Select at least one category'),
  shopName: z.string().optional(),
  items: z.array(OnboardingItemSchema).min(1, 'Select at least one item'),
});

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = await req.json();
    const parsed = OnboardingCompleteSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'VALIDATION',
        'Invalid onboarding submission',
        422,
        parsed.error.flatten().fieldErrors
      );
    }

    const { businessType, shopName, items } = parsed.data;

    // 1. Update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        business_type: businessType,
        shop_name: shopName || null,
        onboarded_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Failed to update profile during onboarding:', profileError);
      return apiError('INTERNAL', 'Failed to update profile settings', 500);
    }

    // 2. Fetch existing items for user to prevent duplicates
    const { data: existingItems } = await supabase
      .from('items')
      .select('name')
      .eq('user_id', user.id)
      .is('archived_at', null);

    const existingNames = new Set((existingItems || []).map((i: any) => i.name.toLowerCase()));

    const newRows = items
      .filter((item) => !existingNames.has(item.name.toLowerCase()))
      .map((item) => ({
        user_id: user.id,
        name: item.name,
        unit: item.unit || 'piece',
        sell_price_minor: item.sellPrice !== undefined && item.sellPrice !== null ? toMinor(item.sellPrice) : null,
        cost_price_minor: item.costPrice !== undefined && item.costPrice !== null ? toMinor(item.costPrice) : null,
        current_qty: item.startingQty ?? 0,
        updated_at: new Date().toISOString(),
      }));

    if (newRows.length > 0) {
      const { error: itemsError } = await supabase.from('items').insert(newRows);
      if (itemsError) {
        console.error('Failed to insert onboarding items:', itemsError);
        return apiError('INTERNAL', 'Failed to save items', 500);
      }
    }

    return NextResponse.json({
      ok: true,
      itemCount: items.length,
    });
  } catch (err: unknown) {
    console.error('Onboarding complete error:', err);
    return apiError('INTERNAL', 'Failed to complete onboarding', 500);
  }
});
