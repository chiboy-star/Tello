import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';
import { toMinor } from '@/lib/domain/money';

const UpdateItemSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().optional(),
  category: z.string().optional().nullable(),
  sellPrice: z.number().optional().nullable(),
  costPrice: z.number().optional().nullable(),
  reorderLeadDays: z.number().optional(),
  aliases: z.array(z.string()).optional(),
});

export const GET = withAuth(async (_req: NextRequest, { user, supabase, params }) => {
  const itemId = params?.id as string;
  if (!itemId) {
    return apiError('VALIDATION', 'Missing item id', 422);
  }

  const { data: item, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .single();

  if (error || !item) {
    return apiError('NOT_FOUND', 'Item not found', 404);
  }

  return NextResponse.json({ item });
});

export const PATCH = withAuth(async (req: NextRequest, { user, supabase, params }) => {
  const itemId = params?.id as string;
  if (!itemId) {
    return apiError('VALIDATION', 'Missing item id', 422);
  }

  const body = await req.json();
  const parsed = UpdateItemSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION', 'Invalid item update input', 422, parsed.error.flatten().fieldErrors);
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.unit !== undefined) updateData.unit = parsed.data.unit;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.sellPrice !== undefined) {
    updateData.sell_price_minor = parsed.data.sellPrice !== null ? toMinor(parsed.data.sellPrice) : null;
  }
  if (parsed.data.costPrice !== undefined) {
    updateData.cost_price_minor = parsed.data.costPrice !== null ? toMinor(parsed.data.costPrice) : null;
  }
  if (parsed.data.reorderLeadDays !== undefined) updateData.reorder_lead_days = parsed.data.reorderLeadDays;
  if (parsed.data.aliases !== undefined) updateData.aliases = parsed.data.aliases;

  const { data: item, error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', itemId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !item) {
    return apiError('NOT_FOUND', 'Item not found or update failed', 404);
  }

  return NextResponse.json({ item });
});

export const DELETE = withAuth(async (_req: NextRequest, { user, supabase, params }) => {
  const itemId = params?.id as string;
  if (!itemId) {
    return apiError('VALIDATION', 'Missing item id', 422);
  }

  // Soft delete / archive per spec
  const { error } = await supabase
    .from('items')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) {
    return apiError('NOT_FOUND', 'Item not found or could not be archived', 404);
  }

  return NextResponse.json({ ok: true });
});
