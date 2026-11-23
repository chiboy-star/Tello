import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { computeChecklist } from '@/lib/domain/checklist';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req: NextRequest, { user, supabase }) => {
  // 1. Fetch user profile for timezone and shop details
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone, full_name, shop_name')
    .eq('id', user.id)
    .maybeSingle();

  const profileTimezone = profile?.timezone || 'Africa/Lagos';

  // 2. Compute exact "today" boundaries in the profile timezone, converted to UTC ISO strings
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: profileTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayDateStr = dateFormatter.format(now); // 'YYYY-MM-DD'

  // Africa/Lagos is UTC+1 (or use temporal offset if custom timezone)
  const offsetHours = profileTimezone === 'Africa/Lagos' ? '+01:00' : '+01:00';
  const startOfTodayUtc = new Date(`${todayDateStr}T00:00:00${offsetHours}`).toISOString();
  const endOfTodayUtc = new Date(`${todayDateStr}T23:59:59.999${offsetHours}`).toISOString();

  // 3. Query today's non-voided sale entries
  const { data: todaySalesEntries, error: salesErr } = await supabase
    .from('entries')
    .select('id, type, payment_type, total_minor, occurred_at')
    .eq('user_id', user.id)
    .eq('type', 'sale')
    .is('voided_at', null)
    .gte('occurred_at', startOfTodayUtc)
    .lte('occurred_at', endOfTodayUtc);

  if (salesErr) {
    console.error('Failed to query today sales for dashboard:', salesErr);
  }

  const todaySales = todaySalesEntries || [];
  const todayRevenueMinor = todaySales.reduce((acc, e) => acc + (Number(e.total_minor) || 0), 0);
  const todaySalesCount = todaySales.length;
  const todayCreditGivenMinor = todaySales
    .filter((e) => e.payment_type === 'credit')
    .reduce((acc, e) => acc + (Number(e.total_minor) || 0), 0);

  // 4. Compute checklist state from live database rows
  const [itemsRes, entriesRes, customersRes, aiUsageRes] = await Promise.all([
    supabase
      .from('items')
      .select('id, sell_price_minor, archived_at, aliases')
      .eq('user_id', user.id)
      .is('archived_at', null),
    supabase
      .from('entries')
      .select('type, source, voided_at')
      .eq('user_id', user.id),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('ai_usage')
      .select('day', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const itemsForChecklist = (itemsRes.data || []).map((i: any) => ({
    ...i,
    sell_price_source: i.sell_price_source || (i.aliases?.includes('_price_source:estimate') ? 'estimate' : 'user'),
  }));

  const checklist = computeChecklist({
    items: itemsForChecklist,
    entries: entriesRes.data || [],
    customersCount: customersRes.count || 0,
    hasAiUsage: (aiUsageRes.count || 0) > 0,
  });

  return NextResponse.json({
    today: {
      revenueMinor: todayRevenueMinor,
      salesCount: todaySalesCount,
      creditGivenMinor: todayCreditGivenMinor,
      dateStr: todayDateStr,
      timezone: profileTimezone,
    },
    checklist,
    profile: {
      fullName: profile?.full_name || null,
      shopName: profile?.shop_name || 'My Shop',
      timezone: profileTimezone,
    },
  });
});
