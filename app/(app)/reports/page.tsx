'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/domain/money';
import { SlidingPill } from '@/components/ui/sliding-pill';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Copy,
  Check,
  Printer,
  RefreshCw,
  Sparkles,
  ArrowUp,
  PackageCheck,
  ChevronRight,
  ChevronLeft,
  CreditCard
} from 'lucide-react';
import { ScrollProgress } from '@/components/ui/scroll-progress';
import { useReport } from '@/lib/query/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { ReportsSkeleton } from '@/components/skeletons';
import { SectionRetryCard } from '@/components/ui/section-retry-card';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [periodOffset, setPeriodOffset] = useState(0);
  const reportsToggleRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: report, isLoading, error: reportError, refetch } = useReport(period, periodOffset);

  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('crash') === '1') {
    throw new Error('Simulated test client crash');
  }
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/reports/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      if (res.ok) {
        const d = await res.json();
        queryClient.setQueryData(['reports', period, periodOffset], d);
        await queryClient.invalidateQueries({ queryKey: ['reports'] });
      }
    } catch (err) {
      console.error('Failed to regenerate report:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const copySummary = () => {
    if (!report) return;
    const summary = `Tallo ${period.toUpperCase()} Report (${report.facts.periodStart} to ${report.facts.periodEnd}):
Revenue: ${formatMoney(report.facts.totals.revenueMinor)} (${report.facts.totals.saleCount} sales)
Top Seller: ${report.facts.topSellers.byRevenue[0]?.name || 'N/A'}
Outstanding Debts: ${formatMoney(report.facts.debts.totalOutstandingMinor)}

Summary Narrative:
${report.narrative}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const facts = report?.facts;

  // Max revenue among top sellers for CSS bar scaling
  const maxSellerRev = facts?.topSellers.byRevenue?.length
    ? Math.max(...facts.topSellers.byRevenue.map((s: any) => s.revenueMinor || 1))
    : 1;

  return (
    <div className="space-y-6 pb-12">
      <ScrollProgress />
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
            Business Reports
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Facts computed deterministically in code, narrative phrased by AI
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week / Month Toggle with SlidingPill */}
          <div ref={reportsToggleRef} className="relative flex bg-[var(--surface-2)] p-1 rounded-[var(--r-md)] border border-[var(--border)]">
            <SlidingPill activeId={period} containerRef={reportsToggleRef} pillClassName="bg-[var(--surface)] shadow-subtle" />
            <button
              data-pill-id="week"
              onPointerDown={() => {
                setPeriod('week');
                setPeriodOffset(0);
              }}
              onClick={() => {
                setPeriod('week');
                setPeriodOffset(0);
              }}
              className={`relative z-10 px-3 py-1.5 text-xs font-semibold rounded-[var(--r-sm)] transition-colors hit-slop ${
                period === 'week'
                  ? 'text-[var(--text)] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Week
            </button>
            <button
              data-pill-id="month"
              onPointerDown={() => {
                setPeriod('month');
                setPeriodOffset(0);
              }}
              onClick={() => {
                setPeriod('month');
                setPeriodOffset(0);
              }}
              className={`relative z-10 px-3 py-1.5 text-xs font-semibold rounded-[var(--r-sm)] transition-colors hit-slop ${
                period === 'month'
                  ? 'text-[var(--text)] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Month
            </button>
          </div>

          {/* Period Stepper */}
          <div className="flex items-center bg-[var(--surface-2)] p-0.5 rounded-[var(--r-md)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setPeriodOffset((o) => o - 1)}
              className="h-8 w-8 flex items-center justify-center rounded-[var(--r-sm)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors hit-slop"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold tabular-nums text-[var(--text)] min-w-[72px] text-center">
              {periodOffset === 0
                ? (period === 'week' ? 'Current Week' : 'Current Month')
                : `${Math.abs(periodOffset)} ${period === 'week' ? 'wk' : 'mo'} ago`}
            </span>
            <button
              type="button"
              onClick={() => setPeriodOffset((o) => Math.min(0, o + 1))}
              disabled={periodOffset >= 0}
              className="h-8 w-8 flex items-center justify-center rounded-[var(--r-sm)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors disabled:opacity-30 disabled:pointer-events-none hit-slop"
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating || (isLoading && !report)}
            className="gap-1.5 text-xs h-9 font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </Button>

          <Button variant="outline" size="sm" onClick={copySummary} className="gap-1.5 text-xs h-9 font-medium">
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--brand)]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs h-9 font-medium">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      {isLoading && !report ? (
        <ReportsSkeleton />
      ) : reportError && !report ? (
        <SectionRetryCard
          title="Could not load reports"
          message="Failed to load your business report facts. Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : report && (
        <div className="space-y-6">
          {/* Data Quality Notice */}
          {facts?.dataQuality === 'thin' && (
            <div className="flex items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--warning)]/30 bg-[var(--surface)] p-4 text-xs font-medium text-[var(--text)]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning)]" />
              <span>
                Data is thin (fewer than 7 days of sales data or fewer than 10 transactions). Keep logging sales daily to uncover deeper trends.
              </span>
            </div>
          )}

          {/* 1. AI Narrative Box */}
          {report.narrative ? (
            <section
              aria-labelledby="narrative-heading"
              className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--brand)]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span id="narrative-heading">
                    Performance Narrative ({report.narrativeSource === 'llm' ? 'AI Generated' : 'Template'})
                  </span>
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {facts?.periodStart} to {facts?.periodEnd}
                </span>
              </div>
              <p className="text-sm text-[var(--text)] leading-relaxed font-medium">
                {report.narrative}
              </p>
            </section>
          ) : (
            <SectionRetryCard
              title="Summary narrative unavailable"
              message="The performance summary narrative could not be generated. Click retry to regenerate."
              onRetry={handleRegenerate}
            />
          )}

          {/* 2. KPI Row */}
          <section aria-labelledby="kpi-heading">
            <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Total Revenue */}
              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <span className="text-[11px] font-medium uppercase text-[var(--text-muted)]">Total Revenue</span>
                <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-[var(--text)] tabular-nums">
                  {formatMoney(facts?.totals.revenueMinor)}
                </div>
                {facts?.vsPrevious.revenuePct !== null && (
                  <div
                    className={`mt-1 flex items-center text-xs font-bold tabular-nums ${
                      facts.vsPrevious.revenuePct >= 0 ? 'text-[var(--brand)]' : 'text-[var(--danger)]'
                    }`}
                  >
                    {facts.vsPrevious.revenuePct >= 0 ? (
                      <TrendingUp className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="mr-1 h-3.5 w-3.5" />
                    )}
                    {Math.abs(Math.round(facts.vsPrevious.revenuePct * 100))}% vs prev {period}
                  </div>
                )}
              </div>

              {/* Units Sold */}
              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <span className="text-[11px] font-medium uppercase text-[var(--text-muted)]">Units Sold</span>
                <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-[var(--text)] tabular-nums">
                  {facts?.totals.units}
                </div>
                <span className="text-xs text-[var(--text-muted)] tabular-nums">
                  {facts?.totals.saleCount} transactions
                </span>
              </div>

              {/* Credit Given */}
              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <span className="text-[11px] font-medium uppercase text-[var(--text-muted)]">Credit Given</span>
                <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-[var(--warning)] tabular-nums">
                  {formatMoney(facts?.totals.creditGivenMinor)}
                </div>
                <span className="text-xs text-[var(--text-muted)]">Unpaid credit sales</span>
              </div>

              {/* Restock Spend */}
              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <span className="text-[11px] font-medium uppercase text-[var(--text-muted)]">Restock Spend</span>
                <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-[var(--text)] tabular-nums">
                  {formatMoney(facts?.totals.restockSpendMinor)}
                </div>
                <span className="text-xs text-[var(--text-muted)]">Inventory investment</span>
              </div>
            </div>
          </section>

          {/* 3. Actionable Insights: Buy More & Buy Less */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buy More (Restock Suggestions) */}
            <section
              aria-labelledby="restock-advice-heading"
              className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <h3 id="restock-advice-heading" className="font-display font-semibold text-[var(--text)] mb-3 text-sm flex items-center justify-between">
                <span>Buy More (Restock Advice)</span>
                <span className="text-xs font-normal text-[var(--text-muted)]">Priority items</span>
              </h3>
              <div className="divide-y divide-[var(--border)] text-xs">
                {facts?.restockSuggestions?.map((item: any) => (
                  <div key={item.itemId} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-medium text-[var(--text)]">{item.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] capitalize mt-0.5">
                        Status: {item.status}
                      </div>
                    </div>
                    <span className="badge badge-low tabular-nums">
                      Order +{item.suggestedReorderQty}
                    </span>
                  </div>
                ))}
                {(!facts?.restockSuggestions || facts.restockSuggestions.length === 0) && (
                  <p className="py-6 text-center text-xs text-[var(--text-muted)]">Stock levels are currently healthy.</p>
                )}
              </div>
            </section>

            {/* Slow Movers / Reduce List */}
            <section
              aria-labelledby="reduce-advice-heading"
              className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <h3 id="reduce-advice-heading" className="font-display font-semibold text-[var(--text)] mb-3 text-sm flex items-center justify-between">
                <span>Buy Less (Slow Movers)</span>
                <span className="text-xs font-normal text-[var(--text-muted)]">Reduce next order</span>
              </h3>
              <div className="divide-y divide-[var(--border)] text-xs">
                {facts?.reduceSuggestions?.map((item: any) => (
                  <div key={item.itemId} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-medium text-[var(--text)]">{item.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {item.currentQty} on hand • {(item.velocityUnitsPerDay ?? 0).toFixed(1)}/day
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">Hold reorders</span>
                  </div>
                ))}
                {(!facts?.reduceSuggestions || facts.reduceSuggestions.length === 0) && (
                  <p className="py-6 text-center text-xs text-[var(--text-muted)]">No severely overstocked items found.</p>
                )}
              </div>
            </section>
          </div>

          {/* 4. Top Sellers (Pure CSS Horizontal Bars) */}
          <section
            aria-labelledby="top-sellers-heading"
            className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <h3 id="top-sellers-heading" className="font-display font-semibold text-[var(--text)] mb-4 text-sm flex items-center justify-between">
              <span>Top 5 Best Sellers</span>
              <span className="text-xs font-normal text-[var(--text-muted)]">Ranked by revenue</span>
            </h3>
            <div className="space-y-3.5">
              {facts?.topSellers.byRevenue?.map((item: any, idx: number) => {
                const pct = Math.max(8, Math.min(100, Math.round((item.revenueMinor / maxSellerRev) * 100)));
                return (
                  <div key={item.itemId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text)]">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="font-semibold text-[var(--text)] tabular-nums">
                        {formatMoney(item.revenueMinor)}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--brand)] rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!facts?.topSellers.byRevenue || facts.topSellers.byRevenue.length === 0) && (
                <p className="py-6 text-center text-xs text-[var(--text-muted)]">No sales recorded in this period.</p>
              )}
            </div>
          </section>

          {/* 5. Debts Overview */}
          <section
            aria-labelledby="debts-overview-heading"
            className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[var(--accent)]" />
                <h3 id="debts-overview-heading" className="font-display font-semibold text-[var(--text)] text-sm">
                  Customer Debt Book
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Total outstanding credit across all customer accounts
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="font-display font-bold text-lg text-[var(--accent)] tabular-nums">
                {formatMoney(facts?.debts?.totalOutstandingMinor || 0)}
              </div>
              <Link href="/debts">
                <Button variant="outline" size="sm" className="text-xs font-semibold gap-1">
                  Manage Debts
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </section>

          {/* 6. Peak-End Closer: "You're all caught up" */}
          <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)]/30 p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center mx-auto">
              <PackageCheck className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-sm text-[var(--text)]">You&apos;re all caught up!</h4>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                All business facts for {period === 'week' ? 'this week' : 'this month'} have been summarized.
              </p>
            </div>
            <div>
              <Link href="/sell">
                <Button size="sm" className="font-semibold text-xs gap-1.5 shadow-sm">
                  Record Next Sale
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Floating Back-to-Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="fixed bottom-20 right-6 z-40 p-2.5 rounded-full bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-md hover:bg-[var(--surface-2)] transition-all hit-slop print:hidden"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
