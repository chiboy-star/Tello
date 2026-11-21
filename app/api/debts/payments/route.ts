import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';
import { toMinor } from '@/lib/domain/money';
import { computeCustomerDebt, DebtEntry } from '@/lib/domain/debts';

const DebtPaymentSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive('Payment amount must be greater than zero'),
  occurredAt: z.string().optional().nullable(),
});

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key');
  const batchId = idempotencyKey || crypto.randomUUID();

  const body = await req.json();
  const parsed = DebtPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION', 'Invalid payment submission', 422, parsed.error.flatten().fieldErrors);
  }

  const { customerId, amount, occurredAt } = parsed.data;
  const totalMinor = toMinor(amount);

  const entryPayload = [
    {
      type: 'debt_payment',
      customer_id: customerId,
      total_minor: totalMinor,
      unit_amount_minor: 0,
      payment_type: 'cash',
      source: 'tap',
      occurred_at: occurredAt || new Date().toISOString(),
      note: 'Debt payment',
    },
  ];

  const { data: committed, error } = await supabase.rpc('commit_entries', {
    p_batch_id: batchId,
    p_entries: entryPayload,
  });

  if (error) {
    return apiError('INTERNAL', error.message || 'Failed to record debt payment', 500);
  }

  // Calculate new balance
  const { data: allCustEntries } = await supabase
    .from('entries')
    .select('id, type, total_minor, payment_type, occurred_at, voided_at')
    .eq('customer_id', customerId)
    .eq('user_id', user.id)
    .is('voided_at', null);

  const debtEntries: DebtEntry[] = (allCustEntries || []).map((e) => ({
    id: e.id,
    type: e.type,
    total_minor: e.total_minor,
    payment_type: e.payment_type,
    occurred_at: e.occurred_at,
    voided_at: e.voided_at,
  }));

  const debtSummary = computeCustomerDebt(customerId, debtEntries);

  return NextResponse.json({
    entry: committed?.[0] || null,
    balanceMinor: debtSummary.balanceMinor,
  });
});
