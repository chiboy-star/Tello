import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { fromMinor } from '@/lib/domain/money';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest, { user, supabase }) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = supabase
    .from('entries')
    .select('id, type, quantity, total_minor, payment_type, occurred_at, source, note, items(name), customers(name)')
    .eq('user_id', user.id);

  if (from) query = query.gte('occurred_at', from);
  if (to) query = query.lte('occurred_at', to);

  const { data: entries, error } = await query.order('occurred_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to export entries' }, { status: 500 });
  }

  // Generate CSV rows
  const headers = ['Date', 'Type', 'Item', 'Quantity', 'Total Amount (NGN)', 'Payment Type', 'Customer', 'Source', 'Note'];
  const rows = (entries || []).map((e: any) => [
    e.occurred_at,
    e.type,
    `"${(e.items?.name || '').replace(/"/g, '""')}"`,
    e.quantity || '',
    fromMinor(e.total_minor),
    e.payment_type,
    `"${(e.customers?.name || '').replace(/"/g, '""')}"`,
    e.source,
    `"${(e.note || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="tallo-entries-${Date.now()}.csv"`,
    },
  });
});
