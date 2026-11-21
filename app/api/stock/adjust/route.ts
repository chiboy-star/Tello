import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';

const AdjustStockSchema = z.object({
  itemId: z.string().uuid(),
  newQty: z.number(),
  note: z.string().min(1, 'Note is required for stock adjustment'),
});

export const POST = withAuth(async (req: NextRequest, { user: _user, supabase }) => {
  const body = await req.json();
  const parsed = AdjustStockSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION', 'Invalid adjustment parameters', 422, parsed.error.flatten().fieldErrors);
  }

  const { itemId, newQty, note } = parsed.data;

  const { data: item, error } = await supabase.rpc('adjust_stock', {
    p_item_id: itemId,
    p_new_qty: newQty,
    p_note: note,
  });

  if (error) {
    return apiError('INTERNAL', error.message || 'Failed to adjust stock', 500);
  }

  return NextResponse.json({ item });
});
