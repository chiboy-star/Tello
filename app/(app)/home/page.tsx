'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Users, 
  RefreshCw, 
  ChevronRight, 
  ArrowUpRight, 
  RotateCcw,
  Check,
  TrendingUp,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/domain/money';
import { useQueryClient } from '@tanstack/react-query';
import { useItems, useCustomers, useEntries, useChecklist } from '@/lib/query/hooks';
import { HomeSkeleton } from '@/components/skeletons';
import { PriceSheet } from '@/components/price-sheet';
import { SectionRetryCard } from '@/components/ui/section-retry-card';

export default function HomePage() {
  const queryClient = useQueryClient();
  const { data: itemsData, isLoading: itemsLoading, isFetching: itemsFetching, error: itemsError, refetch: refetchItems } = useItems('all');
  const { data: custData, isLoading: custLoading, isFetching: custFetching, error: custError, refetch: refetchCust } = useCustomers();
  const { data: entriesData, isLoading: entriesLoading, isFetching: entriesFetching, error: entriesError, refetch: refetchEntries } = useEntries(50);
  const { data: checklistData } = useChecklist();

  const items = useMemo(() => itemsData?.items || [], [itemsData]);
  const customers = useMemo(() => custData?.customers || [], [custData]);
  const entries = useMemo(() => entriesData?.entries || [], [entriesData]);

  // If cached data exists from IndexedDB/memory, render immediately without skeleton!
  const hasData = itemsData !== undefined || custData !== undefined || entriesData !== undefined;
  const loading = !hasData && (itemsLoading || custLoading || entriesLoading);
  const isRefreshing = hasData && (itemsFetching || custFetching || entriesFetching);

  const [lastUpdated, setLastUpdated] = useState<number>(() => Date.now());
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [undoEntryId, setUndoEntryId] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [sellingItemId, setSellingItemId] = useState<string | null>(null);

  // Set Price Drawer
  const [priceSheetItem, setPriceSheetItem] = useState<any | null>(null);
  const [priceSheetOpen, setPriceSheetOpen] = useState(false);

  // Negative stock confirmation dialog
  const [negativeStockConfirmItem, setNegativeStockConfirmItem] = useState<any | null>(null);

  const loadDashboard = useCallback(async (_showSpinner?: boolean) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['items'] }),
      queryClient.invalidateQueries({ queryKey: ['customers'] }),
      queryClient.invalidateQueries({ queryKey: ['entries'] }),
      queryClient.invalidateQueries({ queryKey: ['checklist'] }),
    ]);
    setLastUpdated(Date.now());
    setMinutesAgo(0);
  }, [queryClient]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Update minutes ago on a 60s interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastUpdated > 0) {
        setMinutesAgo(Math.max(0, Math.floor((Date.now() - lastUpdated) / 60000)));
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Today's totals (sales amount, count, credit given)
  const [todayStr, setTodayStr] = useState('');

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0]);
  }, []);

  const todaySales = entries.filter((e: any) => {
    return e.type === 'sale' && !e.voided_at && (todayStr ? e.occurred_at?.startsWith(todayStr) : true);
  });

  const todaySalesAmountMinor = todaySales.reduce((acc: number, e: any) => acc + (Number(e.total_minor) || 0), 0);
  const todaySalesCount = todaySales.length;
  const todayCreditGivenMinor = todaySales
    .filter((e: any) => e.payment_type === 'credit')
    .reduce((acc: number, e: any) => acc + (Number(e.total_minor) || 0), 0);

  // Top 3 running low (prioritize negative stock items)
  const runningLow = items
    .filter((i: any) => Number(i.current_qty) < 0 || (i.forecast?.daysLeft !== null && i.forecast?.daysLeft <= 7))
    .sort((a: any, b: any) => {
      const aNeg = Number(a.current_qty) < 0 ? 1 : 0;
      const bNeg = Number(b.current_qty) < 0 ? 1 : 0;
      if (aNeg !== bNeg) return bNeg - aNeg; // Negative items come first
      return (a.forecast?.daysLeft ?? 0) - (b.forecast?.daysLeft ?? 0);
    })
    .slice(0, 3);

  // Top 3 debtors
  const topDebtors = customers
    .filter((c: any) => c.balanceMinor > 0)
    .sort((a: any, b: any) => b.balanceMinor - a.balanceMinor)
    .slice(0, 3);

  // Quick sell items (most recent 4 items)
  const quickSellItems = [...items]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 4);

  // Setup checklist items driven strictly by server /api/checklist
  const checklistRaw = [
    { key: 'addItems', label: 'Add at least 5 items', done: !!checklistData?.steps?.addItems, action: 'add-item' },
    { key: 'reviewPrices', label: 'Review your prices', done: !!checklistData?.steps?.reviewPrices, href: '/stock/prices' },
    { key: 'logSale', label: 'Log your first sale', done: !!checklistData?.steps?.logSale, href: '/sell' },
    { key: 'tryAi', label: 'Try voice or photo entry', done: !!checklistData?.steps?.tryAi, href: '/sell' },
    { key: 'addCustomer', label: 'Add a customer record', done: !!checklistData?.steps?.addCustomer, href: '/debts' },
  ];

  // Completed steps collapse or move to bottom
  const checklist = [...checklistRaw].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  const completedCount = checklistData?.completedCount ?? checklist.filter((c) => c.done).length;
  const isChecklistComplete = checklistData?.allDone ?? (completedCount === checklist.length);

  // Quick sell handler with optimistic update and Undo
  const handleQuickSell = async (item: any) => {
    setSellingItemId(item.id);
    const tempId = `temp-${crypto.randomUUID()}`;
    const sellPriceMinor = item.sell_price_minor || 0;

    // Optimistically update item stock in query cache
    queryClient.setQueryData(['items', 'all'], (old: any) => {
      if (!old || !old.items) return old;
      return {
        ...old,
        items: old.items.map((i: any) =>
          i.id === item.id ? { ...i, current_qty: Number(i.current_qty) - 1 } : i
        ),
      };
    });

    try {
      const res = await fetch('/api/entries/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [
            {
              type: 'sale',
              itemId: item.id,
              quantity: 1,
              unitAmountMinor: sellPriceMinor,
              paymentType: 'cash',
              source: 'tap',
            },
          ],
        }),
      });

      if (res.ok) {
        const created = await res.json();
        const entryId = created.entries?.[0]?.id;
        
        // Show Undo toast for 8 seconds
        if (undoTimeout) clearTimeout(undoTimeout);
        setUndoEntryId(entryId);
        setUndoMessage(`Sold 1 × ${item.name} (${formatMoney(sellPriceMinor)})`);
        
        const timeout = setTimeout(() => {
          setUndoEntryId(null);
          setUndoMessage(null);
        }, 8000);
        setUndoTimeout(timeout);
        
        // Refresh entry list in background
        loadDashboard();
        queryClient.invalidateQueries({ queryKey: ['checklist'] });
      } else {
        // Rollback
        loadDashboard();
        queryClient.invalidateQueries({ queryKey: ['checklist'] });
      }
    } catch {
      loadDashboard();
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
    } finally {
      setSellingItemId(null);
    }
  };

  const handleUndo = async () => {
    if (!undoEntryId) return;
    const idToVoid = undoEntryId;
    if (undoTimeout) clearTimeout(undoTimeout);
    setUndoEntryId(null);
    setUndoMessage(null);

    try {
      await fetch(`/api/entries/${idToVoid}/void`, { method: 'POST' });
      await loadDashboard();
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
    } catch (err) {
      console.error('Failed to undo sale:', err);
    }
  };

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header: Greeting + Date + Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
              Shop Dashboard
            </h1>
            <span className="text-xs text-[var(--text-muted)] font-medium">
              • {greeting}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
            <span>{formattedDate}</span>
            <span>•</span>
            <span>Updated {minutesAgo}m ago</span>
            <button
              onClick={() => loadDashboard(true)}
              aria-label="Refresh dashboard data"
              className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors hit-slop"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/sell" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto font-semibold gap-2 shadow-sm">
              <TrendingUp className="w-4 h-4" />
              New Sale
            </Button>
          </Link>
        </div>
      </div>

      {/* Today's Totals Strip */}
      <section aria-labelledby="today-strip-heading" className="space-y-2">
        <h2 id="today-strip-heading" className="sr-only">Today&apos;s Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Revenue */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] p-4">
            <div className="text-xs font-medium text-[var(--text-muted)]">Today&apos;s Revenue</div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] tabular-nums">
              {formatMoney(todaySalesAmountMinor)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              {todaySalesCount} {todaySalesCount === 1 ? 'sale' : 'sales'} recorded
            </div>
          </div>

          {/* Sales Count */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] p-4">
            <div className="text-xs font-medium text-[var(--text-muted)]">Sales Count</div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] tabular-nums">
              {todaySalesCount}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Total transactions today
            </div>
          </div>

          {/* Credit Given */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] p-4">
            <div className="text-xs font-medium text-[var(--text-muted)]">Credit Given Today</div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--warning)] tabular-nums">
              {formatMoney(todayCreditGivenMinor)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Uncollected credit sales
            </div>
          </div>
        </div>
      </section>

      {/* Setup Checklist (Goal-gradient ring, collapses when complete) */}
      {!isChecklistComplete && (
        <section aria-labelledby="checklist-heading" className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Progress ring */}
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[var(--surface-2)]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[var(--brand)] transition-all duration-500 ease-out"
                    strokeDasharray={`${(completedCount / checklist.length) * 100}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-display text-[11px] font-bold text-[var(--text)] tabular-nums">
                  {completedCount}/{checklist.length}
                </span>
              </div>
              <div>
                <h3 id="checklist-heading" className="font-display text-sm font-semibold text-[var(--text)]">
                  Getting Started Checklist
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {checklist.length - completedCount} more step{checklist.length - completedCount === 1 ? '' : 's'} to finish shop setup
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {checklist.map((item, idx) => {
              const content = (
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--r-sm)] border text-xs font-medium transition-colors ${
                    item.done
                      ? 'border-[var(--border)] bg-[var(--surface-2)]/40 text-[var(--text-muted)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      item.done
                        ? 'bg-[var(--brand)] text-[var(--on-brand)]'
                        : 'border border-[var(--border)] text-transparent'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className={item.done ? 'line-through opacity-70' : ''}>{item.label}</span>
                </div>
              );

              if (item.action === 'add-item') {
                return (
                  <div key={idx} onClick={() => window.dispatchEvent(new CustomEvent('tallo-open-add-item'))}>
                    {content}
                  </div>
                );
              }
              if (item.href) {
                return (
                  <Link key={idx} href={item.href}>
                    {content}
                  </Link>
                );
              }
              return <div key={idx}>{content}</div>;
            })}
          </div>
        </section>
      )}

      {/* Quick Sell Tiles (Top items for rapid 1-tap selling) */}
      {quickSellItems.length > 0 && (
        <section aria-labelledby="quick-sell-heading" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 id="quick-sell-heading" className="font-display text-sm font-semibold text-[var(--text)]">
              Quick Sell (1-Tap)
            </h2>
            <Link
              href="/sell"
              className="text-xs font-medium text-[var(--brand)] hover:underline flex items-center gap-0.5 hit-slop"
            >
              Open Sell Screen
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {quickSellItems.map((item: any) => {
              const hasPrice = item.sell_price_minor !== null && item.sell_price_minor > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!hasPrice) {
                      setPriceSheetItem(item);
                      setPriceSheetOpen(true);
                    } else if (item.current_qty <= 0) {
                      setNegativeStockConfirmItem(item);
                    } else {
                      handleQuickSell(item);
                    }
                  }}
                  disabled={sellingItemId === item.id}
                  className={`p-3 rounded-[var(--r-md)] border text-left flex flex-col justify-between min-h-[88px] active:scale-[0.97] transition-all hit-slop ${
                    !hasPrice
                      ? 'border-[var(--warning)]/60 bg-[var(--accent-soft)]/20 hover:bg-[var(--accent-soft)]/30'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] disabled:opacity-50'
                  }`}
                >
                  <div>
                    <div className="font-medium text-xs text-[var(--text)] line-clamp-1">{item.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                      {item.current_qty} {item.unit} left
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    {hasPrice ? (
                      <span className="font-display font-semibold text-xs text-[var(--brand)] tabular-nums inline-flex items-center gap-1">
                        {formatMoney(item.sell_price_minor)}
                        {item.sell_price_source === 'estimate' && (
                          <span className="text-[9px] font-normal uppercase text-[var(--text-muted)] opacity-70">
                            est.
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[var(--warning)] border border-[var(--warning)]/60 bg-[var(--surface)] px-1.5 py-0.5 rounded">
                        Set price
                      </span>
                    )}
                    <div className="w-5 h-5 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center">
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Two Columns: Running Low & Who Owes You */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Running Low */}
        <section
          aria-labelledby="running-low-heading"
          className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] p-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 font-display text-sm font-semibold text-[var(--text)]">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
                <span id="running-low-heading">Running Low</span>
              </div>
              <Link
                href="/stock?status=low"
                className="text-xs font-medium text-[var(--brand)] hover:underline flex items-center gap-0.5 hit-slop"
              >
                See all
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {itemsError ? (
              <SectionRetryCard
                title="Could not load stock data"
                message="Failed to fetch low stock alerts."
                onRetry={() => refetchItems()}
                className="my-2"
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {runningLow.map((item: any) => {
                  const days = item.forecast?.daysLeft ?? 0;
                  const isNegative = Number(item.current_qty) < 0;
                  const isOut = Number(item.current_qty) <= 0;
                  return (
                    <div
                      key={item.id}
                      className={`py-2.5 flex items-center justify-between gap-3 ${
                        isNegative ? 'bg-[var(--danger-soft)]/20 -mx-2 px-2 rounded' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs text-[var(--text)] truncate">{item.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {/* Thin meter */}
                          <div className="w-16 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                            <div
                              className={`h-full ${isOut ? 'bg-[var(--danger)]' : 'bg-[var(--warning)]'}`}
                              style={{ width: `${Math.min(100, Math.max(8, days * 14))}%` }}
                            />
                          </div>
                          <span
                            className={`text-[11px] tabular-nums ${
                              isNegative ? 'text-[var(--danger)] font-bold' : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {item.current_qty} {item.unit}
                          </span>
                        </div>
                      </div>
                      <div>
                        {isNegative ? (
                          <Link
                            href="/stock"
                            className="badge badge-out bg-[var(--danger)] text-white hover:opacity-90 inline-block font-semibold"
                          >
                            Fix stock
                          </Link>
                        ) : isOut ? (
                          <span className="badge badge-out">Out</span>
                        ) : (
                          <span className="badge badge-low">{days}d left</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {runningLow.length === 0 && (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                    All items are well stocked.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[var(--border)] mt-2">
            <Link
              href="/stock"
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] flex items-center justify-between hit-slop"
            >
              <span>Manage all stock items</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Who Owes You */}
        <section
          aria-labelledby="who-owes-heading"
          className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] p-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 font-display text-sm font-semibold text-[var(--text)]">
                <Users className="w-4 h-4 text-[var(--accent)]" />
                <span id="who-owes-heading">Who Owes You</span>
              </div>
              <Link
                href="/debts"
                className="text-xs font-medium text-[var(--brand)] hover:underline flex items-center gap-0.5 hit-slop"
              >
                See all
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {custError ? (
              <SectionRetryCard
                title="Could not load customer balances"
                message="Failed to fetch debtor records."
                onRetry={() => refetchCust()}
                className="my-2"
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {topDebtors.map((cust: any) => (
                  <div key={cust.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/debts/${cust.id}`}
                        className="font-medium text-xs text-[var(--text)] hover:text-[var(--brand)] truncate block"
                      >
                        {cust.name}
                      </Link>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {cust.phone || 'No phone recorded'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-semibold text-xs text-[var(--accent)] tabular-nums">
                        {formatMoney(cust.balanceMinor)}
                      </div>
                      <span className="badge badge-owes mt-0.5">Owes</span>
                    </div>
                  </div>
                ))}

                {topDebtors.length === 0 && (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                    No outstanding customer balances.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[var(--border)] mt-2">
            <Link
              href="/debts"
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] flex items-center justify-between hit-slop"
            >
              <span>View full customer ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>

      {/* Floating Undo Toast (8s timeout) */}
      {undoMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[var(--text)] text-[var(--bg)] px-4 py-2.5 rounded-[var(--r-md)] shadow-subtle text-xs font-medium border border-[var(--border)]"
        >
          <span>{undoMessage}</span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 text-[var(--brand-soft)] hover:underline font-semibold ml-2 hit-slop"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
      )}

      {/* Low/Negative stock warning modal */}
      {negativeStockConfirmItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-3 text-[var(--warning)]">
              <div className="h-10 w-10 rounded-full bg-[var(--warning-soft)] flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-[var(--text)]">Stock Warning</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Only {negativeStockConfirmItem.current_qty} {negativeStockConfirmItem.unit} left in stock.
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text)]">
              Logging this sale will take your stock into negative count. Sell anyway?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNegativeStockConfirmItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 text-xs font-semibold"
                onClick={() => {
                  const it = negativeStockConfirmItem;
                  setNegativeStockConfirmItem(null);
                  handleQuickSell(it);
                }}
              >
                Sell anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Set Price Sheet for unpriced items */}
      <PriceSheet
        item={priceSheetItem}
        open={priceSheetOpen}
        onOpenChange={setPriceSheetOpen}
        onPriceSet={async () => {
          await loadDashboard();
        }}
      />
    </div>
  );
}
