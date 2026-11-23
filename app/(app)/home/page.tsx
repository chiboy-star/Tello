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
  Plus,
  PackagePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/domain/money';
import { useQueryClient } from '@tanstack/react-query';
import { useItems, useCustomers, useDashboard } from '@/lib/query/hooks';
import dynamic from 'next/dynamic';
import { HomeSkeleton } from '@/components/skeletons';
const PriceSheet = dynamic(() => import('@/components/price-sheet').then((mod) => mod.PriceSheet), { ssr: false });
import { SectionRetryCard } from '@/components/ui/section-retry-card';
import { invalidateAfterMutation, optimisticUpdateOnSale, optimisticUpdateOnVoid } from '@/lib/query/invalidate';
import { 
  getNeedsAttention, 
  removeNeedsAttentionItem, 
  updateNeedsAttentionQty, 
  NeedsAttentionSale 
} from '@/lib/offline/queue';

export default function HomePage() {
  const queryClient = useQueryClient();
  const { data: itemsData, isLoading: itemsLoading, isFetching: itemsFetching, error: itemsError, refetch: refetchItems } = useItems('all');
  const { data: custData, isLoading: custLoading, isFetching: custFetching, error: custError, refetch: refetchCust } = useCustomers();
  const { data: dashData, isLoading: dashLoading, isFetching: dashFetching, refetch: refetchDash } = useDashboard();

  const items = useMemo(() => itemsData?.items || [], [itemsData]);
  const customers = useMemo(() => custData?.customers || [], [custData]);

  // If cached data exists from TanStack cache or IndexedDB, render immediately without skeleton!
  const hasData = itemsData !== undefined || custData !== undefined || dashData !== undefined;
  const loading = !hasData && (itemsLoading || custLoading || dashLoading);
  const isRefreshing = hasData && (itemsFetching || custFetching || dashFetching);

  const [undoEntryId, setUndoEntryId] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastSaleInfo, setLastSaleInfo] = useState<{ totalMinor: number; isCredit: boolean; itemId: string } | null>(null);
  const [sellingItemId, setSellingItemId] = useState<string | null>(null);

  // Offline sales needing attention (e.g. rejected due to insufficient stock)
  const [needsAttention, setNeedsAttention] = useState<NeedsAttentionSale[]>([]);

  const loadNeedsAttention = useCallback(async () => {
    const list = await getNeedsAttention();
    setNeedsAttention(list);
  }, []);

  useEffect(() => {
    loadNeedsAttention();
    const handleUpdated = () => loadNeedsAttention();
    window.addEventListener('tallo-needs-attention-updated', handleUpdated);
    window.addEventListener('tallo-queue-updated', handleUpdated);
    return () => {
      window.removeEventListener('tallo-needs-attention-updated', handleUpdated);
      window.removeEventListener('tallo-queue-updated', handleUpdated);
    };
  }, [loadNeedsAttention]);

  const handleDiscardAttention = async (batchId: string) => {
    await removeNeedsAttentionItem(batchId);
    await loadNeedsAttention();
  };

  const handleEditAttentionQty = async (item: NeedsAttentionSale) => {
    const currentQty = item.sale.entries[0]?.quantity || 1;
    const promptVal = window.prompt(`Update sale quantity (currently ${currentQty}):`, String(currentQty));
    if (promptVal === null) return;
    const parsed = parseFloat(promptVal);
    if (!isNaN(parsed) && parsed > 0) {
      await updateNeedsAttentionQty(item.batchId, parsed);
      await loadNeedsAttention();
    }
  };

  // Set Price Drawer
  const [priceSheetItem, setPriceSheetItem] = useState<any | null>(null);
  const [priceSheetOpen, setPriceSheetOpen] = useState(false);

  // Manual refresh callback
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchDash(),
      refetchItems(),
      refetchCust(),
    ]);
  }, [refetchDash, refetchItems, refetchCust]);

  // Today's totals directly from unified server dashboard API
  const todaySalesAmountMinor = dashData?.today?.revenueMinor ?? 0;
  const todaySalesCount = dashData?.today?.salesCount ?? 0;
  const todayCreditGivenMinor = dashData?.today?.creditGivenMinor ?? 0;

  // Header Greeting & Date
  const timezone = dashData?.profile?.timezone || dashData?.today?.timezone || 'Africa/Lagos';
  let hour = 12;
  try {
    const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
    hour = nowInTz.getHours();
  } catch {
    hour = new Date().getHours();
  }

  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = dashData?.profile?.fullName
    ? dashData.profile.fullName.trim().split(' ')[0]
    : dashData?.profile?.shopName || 'Shop Owner';
  const greetingTitle = `${greeting}, ${firstName}`;
  const shopName = dashData?.profile?.shopName || 'Tallo Shop';

  let formattedDate = 'Today';
  try {
    formattedDate = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: timezone,
    }).format(new Date());
  } catch {
    formattedDate = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date());
  }

  // Synchronize document title with personalized greeting
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `${greetingTitle} | Tallo`;
    }
  }, [greetingTitle]);

  // Top 3 running low
  const runningLow = useMemo(() => {
    return items
      .filter((i: any) => Number(i.current_qty) <= 0 || (i.forecast?.daysLeft !== null && i.forecast?.daysLeft <= 7))
      .sort((a: any, b: any) => {
        const aOut = Number(a.current_qty) <= 0 ? 1 : 0;
        const bOut = Number(b.current_qty) <= 0 ? 1 : 0;
        if (aOut !== bOut) return bOut - aOut;
        return (a.forecast?.daysLeft ?? 0) - (b.forecast?.daysLeft ?? 0);
      })
      .slice(0, 3);
  }, [items]);

  // Top 3 debtors
  const topDebtors = useMemo(() => {
    return customers
      .filter((c: any) => c.balanceMinor > 0)
      .sort((a: any, b: any) => b.balanceMinor - a.balanceMinor)
      .slice(0, 3);
  }, [customers]);

  // Quick sell items (most recent 4 items)
  const quickSellItems = useMemo(() => {
    return [...items]
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 4);
  }, [items]);

  // Setup checklist items driven strictly by unified server dashboard API
  const checklistData = dashData?.checklist;
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
    if (Number(item.current_qty) <= 0) return; // Disallow selling zero or negative stock
    setSellingItemId(item.id);
    const sellPriceMinor = item.sell_price_minor || 0;

    // 1. Optimistically update item stock in query cache
    queryClient.setQueryData(['items', 'all'], (old: any) => {
      if (!old || !old.items) return old;
      return {
        ...old,
        items: old.items.map((i: any) =>
          i.id === item.id ? { ...i, current_qty: Math.max(0, Number(i.current_qty) - 1) } : i
        ),
      };
    });

    // 2. Optimistically update dashboard revenue and count in query cache
    optimisticUpdateOnSale(queryClient, {
      totalMinor: sellPriceMinor,
      paymentType: 'cash',
      isCredit: false,
    });
    setLastSaleInfo({ totalMinor: sellPriceMinor, isCredit: false, itemId: item.id });

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
      }
    } catch {
      // Rollback will be handled on settle
    } finally {
      setSellingItemId(null);
      await invalidateAfterMutation(queryClient, 'quick_sell');
    }
  };

  const handleUndo = async () => {
    if (!undoEntryId) return;
    const idToVoid = undoEntryId;
    if (undoTimeout) clearTimeout(undoTimeout);
    setUndoEntryId(null);
    setUndoMessage(null);

    // Optimistically revert revenue and count immediately (sub-50ms)
    if (lastSaleInfo) {
      optimisticUpdateOnVoid(queryClient, {
        totalMinor: lastSaleInfo.totalMinor,
        isCredit: lastSaleInfo.isCredit,
        itemStockUpdates: [{ id: lastSaleInfo.itemId, qtyRestored: 1 }],
      });
      setLastSaleInfo(null);
    }

    try {
      await fetch(`/api/entries/${idToVoid}/void`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to undo sale:', err);
    } finally {
      await invalidateAfterMutation(queryClient, 'void');
    }
  };

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header: Personalized Greeting + Shop Name + Date (Part 7) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
              {greetingTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)] font-medium">
            <span>{shopName}</span>
            <span>·</span>
            <span>{formattedDate}</span>
            <button
              onClick={handleRefresh}
              aria-label="Refresh dashboard data"
              title="Refresh dashboard data"
              className="hidden md:inline-flex p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors hit-slop"
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

      {/* Needs Attention Card for Offline Failed Sales (Part 2) */}
      {needsAttention.length > 0 && (
        <section aria-labelledby="needs-attention-heading" className="bg-[var(--accent-soft)]/20 border border-[var(--warning)]/60 rounded-[var(--r-md)] p-4 sm:p-5">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--warning)]/30">
            <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
            <h2 id="needs-attention-heading" className="font-display text-sm font-semibold text-[var(--text)]">
              Needs Attention ({needsAttention.length})
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Offline sales that could not be synced because stock was insufficient:
          </p>
          <div className="mt-3 divide-y divide-[var(--border)]">
            {needsAttention.map((att) => (
              <div key={att.batchId} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="font-semibold text-xs text-[var(--text)]">
                    {att.sale.entries.map((e) => `${e.quantity}× ${e.newItemName || 'Item'}`).join(', ')}
                  </div>
                  <div className="text-[11px] text-[var(--warning)] mt-0.5">{att.reason}</div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-[var(--warning)] text-[var(--warning)]"
                    onClick={() => handleEditAttentionQty(att)}
                  >
                    Edit quantity
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                    onClick={() => handleDiscardAttention(att.batchId)}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
              const isOutOfStock = Number(item.current_qty) <= 0;

              if (isOutOfStock) {
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)]/40 text-left flex flex-col justify-between min-h-[88px] opacity-80"
                  >
                    <div>
                      <div className="font-medium text-xs text-[var(--text-muted)] line-clamp-1">{item.name}</div>
                      <div className="text-[11px] text-[var(--danger)] mt-0.5 font-semibold">
                        Out of stock
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] inline-flex items-center gap-1">
                        {hasPrice ? formatMoney(item.sell_price_minor) : 'No price'}
                        {item.sell_price_source === 'estimate' && (
                          <span className="text-[9px] font-normal uppercase text-[var(--text-muted)] opacity-70">
                            est.
                          </span>
                        )}
                      </span>
                      <Link
                        href={`/stock?action=adjust&itemId=${item.id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--accent-soft)] text-[10px] font-semibold transition-colors hit-slop"
                      >
                        <PackagePlus className="w-3 h-3 stroke-[2]" />
                        <span>Add stock</span>
                      </Link>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!hasPrice) {
                      setPriceSheetItem(item);
                      setPriceSheetOpen(true);
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
                  const isOut = Number(item.current_qty) <= 0;
                  return (
                    <div
                      key={item.id}
                      className="py-2.5 flex items-center justify-between gap-3"
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
                              isOut ? 'text-[var(--danger)] font-bold' : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {item.current_qty} {item.unit}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOut ? (
                          <>
                            <span className="badge badge-out">Out</span>
                            <Link
                              href={`/stock?action=adjust&itemId=${item.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--r-sm)] border border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--accent-soft)] text-[11px] font-semibold transition-colors hit-slop"
                            >
                              <PackagePlus className="w-3.5 h-3.5 stroke-[2]" />
                              <span>Add stock</span>
                            </Link>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="badge badge-low">Low</span>
                            <span className="text-[11px] text-[var(--text-muted)] font-medium tabular-nums">{days}d left</span>
                          </div>
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

      {/* Set Price Sheet for unpriced items */}
      <PriceSheet
        item={priceSheetItem}
        open={priceSheetOpen}
        onOpenChange={setPriceSheetOpen}
        onPriceSet={async () => {
          await handleRefresh();
        }}
      />
    </div>
  );
}
