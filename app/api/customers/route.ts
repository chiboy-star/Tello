import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';
import { computeCustomerDebt, DebtEntry } from '@/lib/domain/debts';

const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional().nullable(),
});

export const GET = withAuth(async (req: NextRequest, { user, supabase }) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  let query = supabase.from('customers').select('*').eq('user_id', user.id);
  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data: customers, error } = await query.order('name');
  if (error) {
    return apiError('INTERNAL', 'Failed to fetch customers', 500);
  }

  // Fetch entries for customers
  const { data: entries } = await supabase
    .from('entries')
    .select('id, customer_id, type, total_minor, payment_type, occurred_at, voided_at')
    .eq('user_id', user.id)
    .not('customer_id', 'is', null)
    .is('voided_at', null);

  const entriesByCustomer: Record<string, DebtEntry[]> = {};
  (entries || []).forEach((e) => {
    if (!entriesByCustomer[e.customer_id]) {
      entriesByCustomer[e.customer_id] = [];
    }
    entriesByCustomer[e.customer_id].push({
      id: e.id,
      type: e.type,
      total_minor: e.total_minor,
      payment_type: e.payment_type,
      occurred_at: e.occurred_at,
      voided_at: e.voided_at,
    });
  });

  const customerList = (customers || []).map((c) => {
    const custEntries = entriesByCustomer[c.id] || [];
    const debt = computeCustomerDebt(c.id, custEntries);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      balanceMinor: debt.balanceMinor,
      oldestUnpaidAt: debt.oldestUnpaidAt,
    };
  });

  return NextResponse.json({ customers: customerList });
});

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json();
  const parsed = CreateCustomerSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION', 'Invalid customer payload', 422, parsed.error.flatten().fieldErrors);
  }

  const { name, phone } = parsed.data;

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      user_id: user.id,
      name,
      phone: phone || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return apiError('VALIDATION', 'A customer with this name already exists', 422);
    }
    return apiError('INTERNAL', 'Failed to create customer', 500);
  }

  return NextResponse.json({ customer });
});
