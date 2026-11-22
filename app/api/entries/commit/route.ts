import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';
import { toMinor } from '@/lib/domain/money';

const CommitEntryLineSchema = z.object({
  type: z.enum(['sale', 'restock', 'debt_payment']),
  itemId: z.string().uuid().optional().nullable(),
  newItemName: z.string().optional().nullable(),
  quantity: z.number().optional().nullable(),
  unitAmount: z.number().optional().nullable(), // major units from client
  unitAmountMinor: z.number().optional().nullable(),
  totalAmount: z.number().optional().nullable(),
  totalMinor: z.number().optional().nullable(),
  paymentType: z.enum(['cash', 'transfer', 'credit']).default('cash'),
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().optional().nullable(),
  occurredAt: z.string().optional().nullable(),
  source: z.enum(['tap', 'text', 'voice', 'image', 'bot']).default('tap'),
  note: z.string().optional().nullable(),
});

const CommitPayloadSchema = z.object({
  entries: z.array(CommitEntryLineSchema).min(1, 'At least one entry line is required'),
});

export const POST = withAuth(async (req: NextRequest, { user: _user, supabase }) => {
  const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key');
  const batchId = idempotencyKey || crypto.randomUUID();

  const body = await req.json();
  const parsed = CommitPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION', 'Invalid entries commit payload', 422, parsed.error.flatten().fieldErrors);
  }

  // Transform entries into Postgres RPC json format
  const rpcEntries = parsed.data.entries.map((e) => {
    // Determine unit amount minor
    let unitMinor = e.unitAmountMinor;
    if (unitMinor === undefined || unitMinor === null) {
      unitMinor = e.unitAmount !== undefined && e.unitAmount !== null ? toMinor(e.unitAmount) : 0;
    }

    // Determine total minor
    let totMinor = e.totalMinor;
    if (totMinor === undefined || totMinor === null) {
      if (e.totalAmount !== undefined && e.totalAmount !== null) {
        totMinor = toMinor(e.totalAmount);
      } else if (e.quantity && unitMinor) {
        totMinor = Math.round(e.quantity * unitMinor);
      } else {
        totMinor = 0;
      }
    }

    return {
      type: e.type,
      item_id: e.itemId || null,
      newItemName: e.newItemName || null,
      quantity: e.quantity || null,
      unit_amount_minor: unitMinor,
      total_minor: totMinor,
      payment_type: e.paymentType,
      customer_id: e.customerId || null,
      customer_name: e.customerName || null,
      occurred_at: e.occurredAt || new Date().toISOString(),
      source: e.source,
      note: e.note || null,
    };
  });

  // Call atomic Postgres RPC commit_entries
  const { data: committed, error } = await supabase.rpc('commit_entries', {
    p_batch_id: batchId,
    p_entries: rpcEntries,
  });

  if (error) {
    if (error.code === '23505' || error.message?.includes('entries_user_id_batch_id_line_no_key')) {
      const { data: existing } = await supabase
        .from('entries')
        .select('*')
        .eq('batch_id', batchId);
      return NextResponse.json({
        batchId,
        entries: existing || [],
      });
    }
    console.error('commit_entries RPC failed:', error);
    return apiError('INTERNAL', error.message || 'Failed to commit ledger entries', 500);
  }

  return NextResponse.json({
    batchId,
    entries: committed || [],
  });
});
