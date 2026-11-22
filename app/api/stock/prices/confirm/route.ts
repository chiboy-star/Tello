import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';

export const POST = withAuth(async (_req: NextRequest, { supabase }) => {
  const { data: count, error } = await supabase.rpc('confirm_estimated_prices');

  if (error) {
    // Fallback if RPC not yet migrated in DB
    const { data: updated, error: updErr } = await supabase
      .from('items')
      .update({ sell_price_source: 'user' })
      .eq('sell_price_source', 'estimate')
      .select('id');

    if (updErr) {
      return NextResponse.json({ confirmedCount: 0 });
    }
    return NextResponse.json({ confirmedCount: updated?.length || 0 });
  }

  return NextResponse.json({ confirmedCount: count });
});
