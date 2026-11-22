import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';
import { toMinor } from '@/lib/domain/money';
import { CATALOG_ITEMS } from '@/lib/catalog/catalog.data';

const BulkItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  unit: z.string().trim().max(30).default('piece'),
  category: z.string().trim().max(50).optional().nullable(),
  sellPrice: z.number().optional().nullable(),
  costPrice: z.number().optional().nullable(),
  startingQty: z.number().min(0).default(0),
  reorderLeadDays: z.number().int().min(1).max(365).default(7),
  aliases: z.array(z.string()).default([]),
  catalogItemId: z.string().optional().nullable(),
});

const BulkItemsRequestSchema = z.object({
  items: z.array(BulkItemSchema).min(1, 'At least one item is required'),
});

// Simple in-memory idempotency cache for bulk adds (5 min TTL)
const idempotencyCache = new Map<string, { timestamp: number; response: any }>();

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  const idempotencyKey = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key');

  if (idempotencyKey) {
    const cached = idempotencyCache.get(`${user.id}:${idempotencyKey}`);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return NextResponse.json(cached.response);
    }
  }

  const body = await req.json();
  const parsed = BulkItemsRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION', 'Invalid bulk items input', 422, parsed.error.flatten().fieldErrors);
  }

  const { items } = parsed.data;

  // Fetch user currency
  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', user.id)
    .maybeSingle();

  const isNgn = (profile?.currency || 'NGN') === 'NGN';

  // Fetch active items to avoid duplicates
  const { data: existingActive } = await supabase
    .from('items')
    .select('name')
    .eq('user_id', user.id)
    .is('archived_at', null);

  const existingNames = new Set((existingActive || []).map((i: { name: string }) => i.name.toLowerCase()));

  const createdItems: any[] = [];
  const openingStockEntries: any[] = [];

  for (const itemInput of items) {
    if (existingNames.has(itemInput.name.toLowerCase())) {
      continue; // Skip already owned items
    }

    let sellPriceMinor: number | null = null;
    let sellPriceSource: 'estimate' | 'user' | null = null;

    if (itemInput.sellPrice !== undefined && itemInput.sellPrice !== null) {
      sellPriceMinor = toMinor(itemInput.sellPrice);
      sellPriceSource = 'user';
    } else if (isNgn) {
      const match = CATALOG_ITEMS.find((c) => c.name.toLowerCase() === itemInput.name.toLowerCase());
      if (match && match.refPrice !== null) {
        sellPriceMinor = toMinor(match.refPrice);
        sellPriceSource = 'estimate';
      }
    }

    const itemInsert: any = {
      user_id: user.id,
      name: itemInput.name,
      unit: itemInput.unit,
      category: itemInput.category || null,
      sell_price_minor: sellPriceMinor,
      cost_price_minor: itemInput.costPrice !== undefined && itemInput.costPrice !== null ? toMinor(itemInput.costPrice) : null,
      sell_price_source: sellPriceSource,
      current_qty: 0,
      reorder_lead_days: itemInput.reorderLeadDays,
      aliases: itemInput.aliases,
    };

    let { data: newItem, error } = await supabase
      .from('items')
      .insert(itemInsert)
      .select()
      .single();

    if (error && error.code === 'PGRST204') {
      delete itemInsert.sell_price_source;
      const retry = await supabase.from('items').insert(itemInsert).select().single();
      newItem = retry.data;
      error = retry.error;
    }

    if (!error && newItem) {
      existingNames.add(newItem.name.toLowerCase());
      createdItems.push(newItem);

      if (itemInput.startingQty > 0) {
        openingStockEntries.push({
          type: 'restock',
          item_id: newItem.id,
          quantity: itemInput.startingQty,
          unit_amount_minor: 0,
          total_minor: 0,
          payment_type: 'cash',
          note: 'Opening stock',
          source: 'quick',
          occurred_at: new Date().toISOString(),
        });
      }
    }
  }

  // If any opening stock entries exist, commit via RPC
  if (openingStockEntries.length > 0) {
    const batchId = crypto.randomUUID();
    await supabase.rpc('commit_entries', {
      p_batch_id: batchId,
      p_entries: openingStockEntries,
    });

    // Re-fetch items to get updated quantities
    const itemIds = createdItems.map((i) => i.id);
    const { data: updatedList } = await supabase
      .from('items')
      .select('*')
      .in('id', itemIds);

    if (updatedList) {
      createdItems.length = 0;
      createdItems.push(...updatedList);
    }
  }

  const responsePayload = { items: createdItems, count: createdItems.length };

  if (idempotencyKey) {
    idempotencyCache.set(`${user.id}:${idempotencyKey}`, {
      timestamp: Date.now(),
      response: responsePayload,
    });
  }

  return NextResponse.json(responsePayload, { status: 201 });
});
