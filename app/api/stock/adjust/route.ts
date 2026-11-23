import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';

const AdjustStockSchema = z.object({
  itemId: z.string().uuid(),
  newQty: z.number().min(0, 'Stock cannot be negative'),
  reason: z.enum(['Sold', 'Purchased', 'Expired', 'Damaged', 'Returned', 'Counted', 'Other']).default('Counted'),
  note: z.string().optional().default(''),
  recordAsSale: z.boolean().optional().default(false),
  sellPriceMinor: z.number().optional().nullable(),
});

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json();
  const parsed = AdjustStockSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION', 'Invalid adjustment parameters', 422, parsed.error.flatten().fieldErrors);
  }

  const { itemId, newQty, reason, note, recordAsSale, sellPriceMinor } = parsed.data;

  if (reason === 'Other' && (!note || !note.trim())) {
    return apiError('VALIDATION', 'Note is required when reason is Other', 422);
  }

  // Fetch item to calculate diff and before_qty
  const { data: itemBefore, error: itemErr } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (itemErr || !itemBefore) {
    return apiError('NOT_FOUND', 'Item not found', 404);
  }

  const oldQty = Number(itemBefore.current_qty) || 0;
  const diff = newQty - oldQty;

  // If Sold and recordAsSale is requested and quantity was reduced
  if (reason === 'Sold' && recordAsSale && diff < 0) {
    const saleQty = Math.abs(diff);
    const unitPrice = sellPriceMinor ?? itemBefore.sell_price_minor ?? 0;
    const batchId = crypto.randomUUID();

    const { data: committed, error: saleErr } = await supabase.rpc('commit_entries', {
      p_batch_id: batchId,
      p_entries: [
        {
          type: 'sale',
          item_id: itemId,
          quantity: saleQty,
          unit_amount_minor: unitPrice,
          total_minor: saleQty * unitPrice,
          payment_type: 'cash',
          source: 'tap',
          note: note || 'Adjusted as sold',
        },
      ],
    });

    if (saleErr) {
      return apiError('INTERNAL', saleErr.message, 500);
    }

    const { data: updatedItem } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    return NextResponse.json({ item: updatedItem, committed });
  }

  // Try RPC adjust_stock with reason
  const { data: item, error } = await supabase.rpc('adjust_stock', {
    p_item_id: itemId,
    p_new_qty: newQty,
    p_reason: reason,
    p_note: note,
  });

  if (error) {
    // Graceful fallback if RPC does not yet take p_reason
    const { error: updErr } = await supabase
      .from('items')
      .update({ current_qty: newQty, updated_at: new Date().toISOString() })
      .eq('id', itemId);

    if (updErr) {
      return apiError('INTERNAL', updErr.message || 'Failed to adjust stock', 500);
    }

    // Try inserting adjustment row in entries
    const batchId = crypto.randomUUID();
    await supabase.from('entries').insert({
      user_id: user.id,
      type: 'adjustment',
      item_id: itemId,
      quantity: Math.abs(diff),
      unit_amount_minor: 0,
      total_minor: 0,
      payment_type: 'cash',
      source: 'tap',
      note: note || '',
      reason,
      before_qty: oldQty,
      after_qty: newQty,
      batch_id: batchId,
      line_no: 0,
    });

    const { data: refreshed } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    return NextResponse.json({ item: refreshed });
  }

  return NextResponse.json({ item });
});
