import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { computeChecklist } from '@/lib/domain/checklist';

export const GET = withAuth(async (req: NextRequest, { user, supabase }) => {
  // 1. Fetch non-archived items
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, sell_price_minor, archived_at, aliases')
    .eq('user_id', user.id)
    .is('archived_at', null);

  if (itemsError) {
    console.error('Checklist items query error:', itemsError);
  }

  const itemsForChecklist = (items || []).map((i: any) => ({
    ...i,
    sell_price_source: i.sell_price_source || (i.aliases?.includes('_price_source:estimate') ? 'estimate' : null),
  }));

  // 2. Fetch entries
  const { data: entries } = await supabase
    .from('entries')
    .select('type, source, voided_at')
    .eq('user_id', user.id);

  // 3. Customers count
  const { count: customersCount } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // 4. AI usage check
  const { count: aiUsageCount } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const checklist = computeChecklist({
    items: itemsForChecklist,
    entries: entries || [],
    customersCount: customersCount || 0,
    hasAiUsage: (aiUsageCount || 0) > 0,
  });

  return NextResponse.json(checklist);
});
