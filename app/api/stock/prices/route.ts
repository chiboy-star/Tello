import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';
import { toMinor } from '@/lib/domain/money';

const PriceUpdateSchema = z.object({
  updates: z.array(
    z.object({
      itemId: z.string().uuid(),
      sellPrice: z.number().min(0),
    })
  ).min(1),
});

export const POST = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();
  const parsed = PriceUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION', 'Invalid price update data', 422, parsed.error.flatten().fieldErrors);
  }

  const rpcUpdates = parsed.data.updates.map((u) => ({
    itemId: u.itemId,
    sellPriceMinor: toMinor(u.sellPrice),
  }));

  let { data: count, error } = await supabase.rpc('set_item_prices', {
    p_updates: rpcUpdates,
  });

  if (error) {
    // Fallback direct updates if RPC not yet migrated in DB
    let updated = 0;
    for (const u of rpcUpdates) {
      const { error: updErr } = await supabase
        .from('items')
        .update({
          sell_price_minor: u.sellPriceMinor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', u.itemId);
      if (!updErr) updated++;
    }
    return NextResponse.json({ updatedCount: updated });
  }

  return NextResponse.json({ updatedCount: count });
});
