import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';
import { toMinor } from '@/lib/domain/money';
import { computeStockForecast, SaleEntry } from '@/lib/domain/forecast';

const CreateItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unit: z.string().default('piece'),
  category: z.string().optional().nullable(),
  sellPrice: z.number().optional().nullable(),
  costPrice: z.number().optional().nullable(),
  startingQty: z.number().default(0),
  reorderLeadDays: z.number().default(7),
  aliases: z.array(z.string()).default([]),
});

export const GET = withAuth(async (req: NextRequest, { user, supabase }) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const statusFilter = searchParams.get('status'); // 'all' | 'low' | 'out'
  const includeArchived = searchParams.get('includeArchived') === 'true';

  let query = supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id);

  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data: items, error } = await query.order('name');
  if (error) {
    return apiError('INTERNAL', 'Failed to fetch items', 500);
  }

  // Fetch sales entries for forecasting
  const { data: sales } = await supabase
    .from('entries')
    .select('item_id, quantity, occurred_at, voided_at')
    .eq('user_id', user.id)
    .eq('type', 'sale')
    .is('voided_at', null);

  const saleEntries: SaleEntry[] = (sales || []).map((s) => ({
    item_id: s.item_id,
    quantity: Number(s.quantity) || 0,
    occurred_at: s.occurred_at,
    voided_at: s.voided_at,
  }));

  const itemsWithForecast = (items || []).map((item) => {
    const forecast = computeStockForecast(
      {
        id: item.id,
        name: item.name,
        current_qty: Number(item.current_qty) || 0,
        reorder_lead_days: item.reorder_lead_days || 7,
        created_at: item.created_at,
      },
      saleEntries
    );

    return {
      ...item,
      forecast,
    };
  });

  let filtered = itemsWithForecast;
  if (statusFilter === 'out') {
    filtered = filtered.filter((i) => i.forecast.status === 'out');
  } else if (statusFilter === 'low') {
    filtered = filtered.filter((i) => i.forecast.status === 'low' || i.forecast.status === 'critical' || i.forecast.status === 'out');
  }

  return NextResponse.json({ items: filtered });
});

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json();
  const parsed = CreateItemSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION', 'Invalid item input', 422, parsed.error.flatten().fieldErrors);
  }

  const { name, unit, category, sellPrice, costPrice, startingQty, reorderLeadDays, aliases } = parsed.data;

  const { data: item, error } = await supabase
    .from('items')
    .insert({
      user_id: user.id,
      name,
      unit,
      category: category || null,
      sell_price_minor: sellPrice !== undefined && sellPrice !== null ? toMinor(sellPrice) : null,
      cost_price_minor: costPrice !== undefined && costPrice !== null ? toMinor(costPrice) : null,
      current_qty: startingQty,
      reorder_lead_days: reorderLeadDays,
      aliases,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return apiError('VALIDATION', 'An item with this name already exists in your inventory', 422);
    }
    return apiError('INTERNAL', 'Failed to create item', 500);
  }

  return NextResponse.json({ item });
});
