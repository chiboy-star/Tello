import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { computeReportFacts, CustomerRow, EntryRow } from '@/lib/domain/insights';
import { ForecastItem } from '@/lib/domain/forecast';
import { getAiProvider } from '@/lib/ai';
import { generateTemplateNarrative, validateNarrativeGuard } from '@/lib/domain/narrative-guard';
import { periodRange } from '@/lib/domain/time';
import { subWeeks, subMonths } from 'date-fns';

export const GET = withAuth(async (req: NextRequest, { user, supabase }) => {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get('period') as 'week' | 'month') || 'week';
  const startParam = searchParams.get('start');

  const anchorDate = startParam ? new Date(startParam) : new Date();
  const range = periodRange(period, anchorDate);

  // Check cached report in weekly_reports
  const { data: cached } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('user_id', user.id)
    .eq('period', period)
    .eq('period_start', range.startDateString)
    .maybeSingle();

  if (cached) {
    const generatedAt = new Date(cached.generated_at).getTime();
    const isCurrentPeriod = new Date() <= range.end;
    const isOlderThan1Hour = Date.now() - generatedAt > 60 * 60 * 1000;

    // Current (unfinished) period is recomputed if cache is older than 1 hour per spec
    if (!isCurrentPeriod || !isOlderThan1Hour) {
      return NextResponse.json({
        facts: cached.facts,
        narrative: cached.narrative,
        narrativeSource: cached.narrative_source,
        generatedAt: cached.generated_at,
      });
    }
  }

  // 1. Fetch user items
  const { data: items } = await supabase
    .from('items')
    .select('id, name, current_qty, reorder_lead_days, created_at')
    .eq('user_id', user.id);

  // 2. Fetch customers
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('user_id', user.id);

  // 3. Fetch all entries
  const { data: entries } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', user.id);

  // Calculate previous period range
  const prevAnchor = period === 'week' ? subWeeks(range.start, 1) : subMonths(range.start, 1);
  const prevRange = periodRange(period, prevAnchor);

  // Compute deterministic business facts
  const facts = computeReportFacts({
    period,
    periodStart: range.start,
    periodEnd: range.end,
    prevPeriodStart: prevRange.start,
    prevPeriodEnd: prevRange.end,
    items: (items || []) as ForecastItem[],
    customers: (customers || []) as CustomerRow[],
    entries: (entries || []) as EntryRow[],
  });

  // Generate Narrative (with LLM + Guard and Template fallback)
  let narrative = generateTemplateNarrative(facts, 'NGN');
  let narrativeSource: 'llm' | 'template' = 'template';

  try {
    const ai = getAiProvider();
    const llmNarrative = await ai.writeNarrative(facts);

    if (validateNarrativeGuard(llmNarrative, facts)) {
      narrative = llmNarrative;
      narrativeSource = 'llm';
    } else {
      console.warn('Narrative guard rejected LLM text due to unverified numbers. Falling back to template.');
    }
  } catch (err) {
    console.warn('AI narrative generation failed. Using template narrative:', err);
  }

  // Cache in weekly_reports table (upsert on user_id, period, period_start)
  const reportRow = {
    user_id: user.id,
    period,
    period_start: range.startDateString,
    facts,
    narrative,
    narrative_source: narrativeSource,
    generated_at: new Date().toISOString(),
  };

  await supabase.from('weekly_reports').upsert(reportRow, {
    onConflict: 'user_id,period,period_start',
  });

  return NextResponse.json({
    facts,
    narrative,
    narrativeSource,
    generatedAt: reportRow.generated_at,
  });
});

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  // POST /api/reports/regenerate
  const body = await req.json();
  const period = body.period || 'week';
  const start = body.start;

  // Delete cache row and re-call GET logic
  const anchorDate = start ? new Date(start) : new Date();
  const range = periodRange(period, anchorDate);

  await supabase
    .from('weekly_reports')
    .delete()
    .eq('user_id', user.id)
    .eq('period', period)
    .eq('period_start', range.startDateString);

  // Return new report by calling GET internally
  const getUrl = new URL(req.url);
  getUrl.searchParams.set('period', period);
  if (start) getUrl.searchParams.set('start', start);

  const newReq = new NextRequest(getUrl.toString(), {
    headers: req.headers,
  });

  return GET(newReq, { params: Promise.resolve({}) });
});
