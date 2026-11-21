import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { computeCustomerDebt, DebtEntry } from '@/lib/domain/debts';

export const GET = withAuth(async (_req: NextRequest, { user, supabase, params }) => {
  const customerId = params?.id as string;
  if (!customerId) {
    return apiError('VALIDATION', 'Missing customer id', 422);
  }

  const { data: customer, error: custError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('user_id', user.id)
    .single();

  if (custError || !customer) {
    return apiError('NOT_FOUND', 'Customer not found', 404);
  }

  const { data: ledger, error: ledgerError } = await supabase
    .from('entries')
    .select('*, items(name, unit)')
    .eq('customer_id', customerId)
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false });

  if (ledgerError) {
    return apiError('INTERNAL', 'Failed to fetch customer ledger', 500);
  }

  const debtEntries: DebtEntry[] = (ledger || []).map((e) => ({
    id: e.id,
    type: e.type,
    total_minor: e.total_minor,
    payment_type: e.payment_type,
    occurred_at: e.occurred_at,
    voided_at: e.voided_at,
  }));

  const debtSummary = computeCustomerDebt(customerId, debtEntries);

  return NextResponse.json({
    customer,
    balanceMinor: debtSummary.balanceMinor,
    ledger: ledger || [],
  });
});
