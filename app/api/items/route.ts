import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';
import { toMinor } from '@/lib/domain/money';
import { computeStockForecast, SaleEntry } from '@/lib/domain/forecast';
import { CATALOG_ITEMS } from '@/lib/catalog/catalog.data';

const CreateItemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  unit: z.string().trim().max(30, 'Unit must be under 30 characters').default('piece'),
  category: z.string().trim().max(50).optional().nullable(),
  sellPrice: z.number().optional().nullable(),
  costPrice: z.number().optional().nullable(),
  startingQty: z.number().min(0, 'Starting quantity cannot be negative').default(0),
  reorderLeadDays: z.number().int().min(1).max(365).default(7),
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

  // 1. Check duplicate active item
  const { data: existingActive } = await supabase
    .from('items')
    .select('id, name')
    .eq('user_id', user.id)
    .ilike('name', name)
    .is('archived_at', null)
    .maybeSingle();

  if (existingActive) {
    return NextResponse.json(
      {
        error: 'DUPLICATE_ITEM',
        message: `You already have ${existingActive.name}`,
        itemId: existingActive.id,
      },
      { status: 409 }
    );
  }

  // 2. Check if an archived item has the same name (offer Restore)
  const { data: existingArchived } = await supabase
    .from('items')
    .select('id, name')
    .eq('user_id', user.id)
    .ilike('name', name)
    .not('archived_at', 'is', null)
    .maybeSingle();

  if (existingArchived) {
    return NextResponse.json(
      {
        error: 'DUPLICATE_ITEM',
        message: `You already have ${existingArchived.name} (archived)`,
        archivedItemId: existingArchived.id,
        canRestore: true,
      },
      { status: 409 }
    );
  }

  // 3. User currency & price estimate resolution
  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', user.id)
    .maybeSingle();

  const isNgn = (profile?.currency || 'NGN') === 'NGN';

  let sellPriceMinor: number | null = null;
  let sellPriceSource: 'estimate' | 'user' | null = null;

  if (sellPrice !== undefined && sellPrice !== null) {
    sellPriceMinor = toMinor(sellPrice);
    sellPriceSource = 'user';
  } else if (isNgn) {
    // Check catalog reference price
    const match = CATALOG_ITEMS.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (match && match.refPrice !== null) {
      sellPriceMinor = toMinor(match.refPrice);
      sellPriceSource = 'estimate';
    }
  }

  // 4. Insert item with 0 stock initially
  const itemInsertData: any = {
    user_id: user.id,
    name,
    unit,
    category: category || null,
    sell_price_minor: sellPriceMinor,
    cost_price_minor: costPrice !== undefined && costPrice !== null ? toMinor(costPrice) : null,
    sell_price_source: sellPriceSource,
    current_qty: 0,
    reorder_lead_days: reorderLeadDays,
    aliases,
  };

  let { data: item, error } = await supabase
    .from('items')
    .insert(itemInsertData)
    .select()
    .single();

  if (error && error.code === 'PGRST204') {
    delete itemInsertData.sell_price_source;
    const retry = await supabase.from('items').insert(itemInsertData).select().single();
    item = retry.data;
    error = retry.error;
  }

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        {
          error: 'DUPLICATE_ITEM',
          message: `You already have ${name}`,
        },
        { status: 409 }
      );
    }
    return apiError('INTERNAL', 'Failed to create item', 500);
  }

  // 5. If startingQty > 0, record as restock entry through commit_entries
  let finalItem = item;
  if (startingQty > 0) {
    const batchId = crypto.randomUUID();
    const { error: restockErr } = await supabase.rpc('commit_entries', {
      p_batch_id: batchId,
      p_entries: [
        {
          type: 'restock',
          item_id: item.id,
          quantity: startingQty,
          unit_amount_minor: 0,
          total_minor: 0,
          payment_type: 'cash',
          note: 'Opening stock',
          source: 'quick',
          occurred_at: new Date().toISOString(),
        },
      ],
    });

    if (!restockErr) {
      const { data: updatedItem } = await supabase
        .from('items')
        .select('*')
        .eq('id', item.id)
        .single();
      if (updatedItem) {
        finalItem = updatedItem;
      }
    }
  }

  return NextResponse.json({ item: finalItem });
});
