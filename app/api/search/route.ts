import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest, { user, supabase }) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q || !q.trim()) {
    return NextResponse.json({ items: [], customers: [] });
  }

  const queryTerm = `%${q.trim()}%`;

  const [itemsRes, custRes] = await Promise.all([
    supabase
      .from('items')
      .select('id, name, unit, current_qty, sell_price_minor')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .ilike('name', queryTerm)
      .limit(5),
    supabase
      .from('customers')
      .select('id, name, phone')
      .eq('user_id', user.id)
      .ilike('name', queryTerm)
      .limit(5),
  ]);

  if (itemsRes.error || custRes.error) {
    return apiError('INTERNAL', 'Failed to search items or customers', 500);
  }

  return NextResponse.json({
    items: itemsRes.data || [],
    customers: custRes.data || [],
  });
});
