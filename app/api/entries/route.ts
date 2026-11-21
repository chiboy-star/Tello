import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest, { user, supabase }) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const type = searchParams.get('type');
  const itemId = searchParams.get('itemId');
  const customerId = searchParams.get('customerId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  let query = supabase
    .from('entries')
    .select(`
      *,
      items(id, name, unit),
      customers(id, name, phone)
    `)
    .eq('user_id', user.id);

  if (from) query = query.gte('occurred_at', from);
  if (to) query = query.lte('occurred_at', to);
  if (type) query = query.eq('type', type);
  if (itemId) query = query.eq('item_id', itemId);
  if (customerId) query = query.eq('customer_id', customerId);

  const { data: entries, error } = await query
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    return apiError('INTERNAL', 'Failed to fetch entries', 500);
  }

  return NextResponse.json({
    entries: entries || [],
    nextCursor: null,
  });
});
