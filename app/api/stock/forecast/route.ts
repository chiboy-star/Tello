import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { computeStockForecast, SaleEntry } from '@/lib/domain/forecast';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req: NextRequest, { user, supabase }) => {
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, name, current_qty, reorder_lead_days, created_at')
    .eq('user_id', user.id)
    .is('archived_at', null);

  if (itemsError) {
    return apiError('INTERNAL', 'Failed to fetch items', 500);
  }

  const { data: sales, error: salesError } = await supabase
    .from('entries')
    .select('item_id, quantity, occurred_at, voided_at')
    .eq('user_id', user.id)
    .eq('type', 'sale')
    .is('voided_at', null);

  if (salesError) {
    return apiError('INTERNAL', 'Failed to fetch sales history', 500);
  }

  const saleEntries: SaleEntry[] = (sales || []).map((s) => ({
    item_id: s.item_id,
    quantity: Number(s.quantity) || 0,
    occurred_at: s.occurred_at,
    voided_at: s.voided_at,
  }));

  const forecasts = (items || []).map((item) =>
    computeStockForecast(
      {
        id: item.id,
        name: item.name,
        current_qty: Number(item.current_qty) || 0,
        reorder_lead_days: item.reorder_lead_days || 7,
        created_at: item.created_at,
      },
      saleEntries
    )
  );

  return NextResponse.json({
    forecasts,
    generatedAt: new Date().toISOString(),
  });
});
