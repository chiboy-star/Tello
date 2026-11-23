'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney, toMinor } from '@/lib/domain/money';
import {
  Search,
  ChevronRight,
  Plus,
  Sparkles,
  Package,
  History,
  Boxes,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useItems, useEntries } from '@/lib/query/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { StockSkeleton } from '@/components/skeletons';
import { SlidingPill } from '@/components/ui/sliding-pill';
import { Combobox } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { invalidateAfterMutation } from '@/lib/query/invalidate';

export default function StockPage() {
  const queryClient = useQueryClient();

  // Top Section Segment: Items | Purchases | Activity (Part 8 & 9)
  const [topTab, setTopTab] = useState<'items' | 'purchases' | 'activity'>('items');
  const topTabRef = useRef<HTMLDivElement>(null);

  // Sub-filter for Items: All Items | Running Low | Out of Stock (Part 3)
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const statusFilterRef = useRef<HTMLDivElement>(null);

  // Search with 100ms debounce (Part 3)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 100);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Read URL query params on mount without triggering router re-render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get('tab');
      if (tabParam === 'purchases' || tabParam === 'activity' || tabParam === 'items') {
        setTopTab(tabParam);
      }
      const statusParam = sp.get('status');
      if (statusParam === 'low' || statusParam === 'out' || statusParam === 'all') {
        setStatusFilter(statusParam);
      }
    }
  }, []);

  // Update URL silently with replaceState
  const handleStatusFilterChange = (f: 'all' | 'low' | 'out') => {
    setStatusFilter(f);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (f === 'all') {
        url.searchParams.delete('status');
      } else {
        url.searchParams.set('status', f);
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  const handleTopTabChange = (t: 'items' | 'purchases' | 'activity') => {
    setTopTab(t);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (t === 'items') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', t);
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  // Queries
  const { data: itemsData, isLoading: itemsLoading } = useItems('all');
  const items = useMemo(() => itemsData?.items || [], [itemsData]);

  const { data: purchasesData } = useEntries({
    limit: 50,
    type: 'restock',
  });
  const purchases = useMemo(() => purchasesData?.entries || [], [purchasesData]);

  const { data: activityData } = useEntries({
    limit: 50,
  });
  const activityEntries = useMemo(() => {
    const all = activityData?.entries || [];
    return all.filter((e: any) => e.type === 'adjustment' || e.type === 'restock');
  }, [activityData]);

  // Adjust Stock State (Part 8)
  const [adjustingItem, setAdjustingItem] = useState<any | null>(null);
  const [newQty, setNewQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<
    'Sold' | 'Purchased' | 'Expired' | 'Damaged' | 'Returned' | 'Counted' | 'Other'
  >('Counted');
  const [adjustNote, setAdjustNote] = useState('');
  const [recordAsSale, setRecordAsSale] = useState(true);
  const [adjusting, setAdjusting] = useState(false);

  // Check URL on load for quick adjust action
  useEffect(() => {
    if (typeof window !== 'undefined' && items.length > 0) {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('action') === 'adjust') {
        const itId = sp.get('itemId');
        const target = items.find((i: any) => i.id === itId);
        if (target) {
          setAdjustingItem(target);
          setNewQty(Math.max(0, Number(target.current_qty) || 0));
        }
      }
    }
  }, [items]);

  // Purchases Drawer State (Part 9)
  const [purchaseDrawerOpen, setPurchaseDrawerOpen] = useState(false);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [purchaseItemId, setPurchaseItemId] = useState('');
  const [purchasePackType, setPurchasePackType] = useState('carton');
  const [purchasePackCount, setPurchasePackCount] = useState<number>(1);
  const [purchaseUnitsPerPack, setPurchaseUnitsPerPack] = useState<number>(40);
  const [purchaseCostPerPack, setPurchaseCostPerPack] = useState<number | ''>('');
  const [updateCostPrice, setUpdateCostPrice] = useState(true);
  const [savingPurchase, setSavingPurchase] = useState(false);

  // Undo Toast state
  const [undoBatchId, setUndoBatchId] = useState<string | null>(null);
  const [undoToastMessage, setUndoToastMessage] = useState<string | null>(null);

  // In-memory Filtered Items (Part 3)
  const filteredItems = useMemo(() => {
    let list = [...items];

    // Status filter
    if (statusFilter === 'low') {
      list = list.filter((i: any) => {
        const days = i.forecast?.daysLeft;
        const isOut = Number(i.current_qty) <= 0;
        return !isOut && days !== null && days !== undefined && days <= 7;
      });
    } else if (statusFilter === 'out') {
      list = list.filter((i: any) => Number(i.current_qty) <= 0);
    }

    // Debounced search query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (i: any) =>
          i.name.toLowerCase().includes(q) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [items, statusFilter, debouncedSearch]);

  // Adjust Stock Submit
  const handleSaveAdjustment = async () => {
    if (!adjustingItem) return;
    if (adjustReason === 'Other' && !adjustNote.trim()) return;

    if (adjustReason === 'Purchased') {
      // Switch to purchases flow
      const it = adjustingItem;
      setAdjustingItem(null);
      setPurchaseItemId(it.id);
      setPurchaseDrawerOpen(true);
      return;
    }

    setAdjusting(true);
    try {
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: adjustingItem.id,
          newQty: Math.max(0, newQty),
          reason: adjustReason,
          note: adjustNote,
          recordAsSale: adjustReason === 'Sold' ? recordAsSale : false,
          sellPriceMinor: adjustingItem.sell_price_minor,
        }),
      });

      if (res.ok) {
        setAdjustingItem(null);
        setAdjustNote('');
        setAdjustReason('Counted');
        await invalidateAfterMutation(queryClient, 'adjust_stock');
      }
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    } finally {
      setAdjusting(false);
    }
  };

  // Record Purchase Submit (Part 9)
  const handleSavePurchase = async () => {
    if (!purchaseItemId || !purchaseCostPerPack || purchaseCostPerPack <= 0) return;
    const selectedItem = items.find((i: any) => i.id === purchaseItemId);
    if (!selectedItem) return;

    setSavingPurchase(true);
    const totalUnitsAdded = Math.round(purchasePackCount * purchaseUnitsPerPack);
    const costPerPackMinor = toMinor(Number(purchaseCostPerPack));
    const totalCostMinor = Math.round(purchasePackCount * costPerPackMinor);
    const unitCostMinor = Math.round(totalCostMinor / totalUnitsAdded);
    const batchId = crypto.randomUUID();

    const purchaseEntry = {
      type: 'restock' as const,
      itemId: selectedItem.id,
      quantity: totalUnitsAdded,
      unitAmountMinor: unitCostMinor,
      totalMinor: totalCostMinor,
      paymentType: 'cash' as const,
      source: 'tap' as const,
      note: `Purchased ${purchasePackCount} ${purchasePackType}${purchasePackCount > 1 ? 's' : ''} (${purchaseUnitsPerPack}/pack) from ${purchaseSupplier || 'supplier'}`,
      supplier: purchaseSupplier || null,
      pack_type: purchasePackType,
      pack_count: purchasePackCount,
      units_per_pack: purchaseUnitsPerPack,
      cost_per_pack_minor: costPerPackMinor,
      occurredAt: new Date(purchaseDate).toISOString(),
    };

    try {
      const res = await fetch('/api/entries/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': batchId,
        },
        body: JSON.stringify({ entries: [purchaseEntry] }),
      });

      if (res.ok) {
        setPurchaseDrawerOpen(false);
        setPurchaseCostPerPack('');
        setPurchaseSupplier('');
        setUndoBatchId(batchId);
        setUndoToastMessage(`Restocked ${totalUnitsAdded} ${selectedItem.unit} of ${selectedItem.name}`);
        setTimeout(() => {
          setUndoBatchId(null);
          setUndoToastMessage(null);
        }, 8000);
        await invalidateAfterMutation(queryClient, 'purchase');
      }
    } catch (err) {
      console.error('Failed to record purchase:', err);
    } finally {
      setSavingPurchase(false);
    }
  };

  // Undo Last Action
  const handleUndo = async () => {
    if (!undoBatchId) return;
    const bId = undoBatchId;
    setUndoBatchId(null);
    setUndoToastMessage(null);
    try {
      await fetch(`/api/batches/${bId}/void`, { method: 'POST' });
      await invalidateAfterMutation(queryClient, 'void');
    } catch (err) {
      console.error('Undo failed:', err);
    }
  };

  // Void a purchase or activity row
  const handleVoidEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to void this entry? Stock will be restored.')) return;
    try {
      await fetch(`/api/entries/${entryId}/void`, { method: 'POST' });
      await invalidateAfterMutation(queryClient, 'void');
    } catch (err) {
      console.error('Void failed:', err);
    }
  };

  if (itemsLoading && !itemsData) {
    return <StockSkeleton />;
  }

  const hasEstimates = items.some((i: any) => i.sell_price_source === 'estimate');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
            Stock &amp; Inventory
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track counts, bulk restocking, and audit activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setPurchaseDrawerOpen(true)}
            variant="outline"
            className="h-9 text-xs font-semibold gap-1.5 border-[var(--border)]"
          >
            <Boxes className="h-4 w-4 text-[var(--brand)]" /> Record Purchase
          </Button>
          <Button
            onClick={() => window.dispatchEvent(new CustomEvent('tallo-open-add-item'))}
            className="bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] h-9 text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Undo Toast */}
      {undoToastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-md bg-[var(--text)] px-4 py-2.5 text-[var(--bg)] shadow-lg animate-in slide-in-from-bottom duration-200 border border-[var(--border)] text-xs font-medium"
        >
          <span>{undoToastMessage}</span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 text-[var(--brand-soft)] hover:underline font-semibold ml-2 hit-slop"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
      )}

      {/* Top Segmented Control: Items | Purchases | Activity (Part 8 & 9) */}
      <div
        ref={topTabRef}
        className="relative flex rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-1"
      >
        <SlidingPill activeId={topTab} containerRef={topTabRef} pillClassName="bg-[var(--surface)] shadow-subtle" />
        {[
          { id: 'items', label: 'Items', icon: Package, count: items.length },
          { id: 'purchases', label: 'Purchases', icon: Boxes, count: purchases.length },
          { id: 'activity', label: 'Activity Log', icon: History, count: activityEntries.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = topTab === tab.id;
          return (
            <button
              key={tab.id}
              data-pill-id={tab.id}
              onClick={() => handleTopTabChange(tab.id as any)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold rounded-sm transition-colors ${
                isSelected ? 'text-[var(--brand)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-70 font-mono">({tab.count})</span>
            </button>
          );
        })}
      </div>

      {/* Estimated Prices Review Banner (Only on Items tab) */}
      {topTab === 'items' && hasEstimates && (
        <Link
          href="/stock/prices"
          className="flex items-center justify-between p-3.5 rounded-[var(--r-md)] border border-[var(--accent)]/30 bg-[var(--accent-soft)]/30 text-xs text-[var(--text)] hover:bg-[var(--accent-soft)]/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-[var(--accent)] shrink-0" />
            <span>Some items have estimated prices. Review and confirm for your shop.</span>
          </div>
          <span className="font-semibold text-[var(--brand)] inline-flex items-center gap-1 shrink-0">
            Review prices <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ITEMS INVENTORY VIEW (Part 3)                                     */}
      {/* ========================================================================= */}
      {topTab === 'items' && (
        <div className="space-y-4">
          {/* Search & Sub-Filter Bar with SlidingPill */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
              <Input
                placeholder="Search items by name or category..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-10 bg-[var(--surface)] text-xs"
              />
            </div>

            <div
              ref={statusFilterRef}
              className="relative flex bg-[var(--surface-2)] p-1 rounded-[var(--r-md)] border border-[var(--border)] shrink-0 self-start sm:self-auto"
            >
              <SlidingPill
                activeId={statusFilter}
                containerRef={statusFilterRef}
                pillClassName="bg-[var(--surface)] shadow-subtle"
              />
              {[
                { id: 'all', label: 'All Items' },
                { id: 'low', label: 'Running Low' },
                { id: 'out', label: 'Out of Stock' },
              ].map((f) => {
                const isSelected = statusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    data-pill-id={f.id}
                    onClick={() => handleStatusFilterChange(f.id as any)}
                    className={`relative z-10 px-3.5 py-1.5 text-xs font-semibold rounded-[var(--r-sm)] capitalize transition-colors ${
                      isSelected
                        ? 'text-[var(--brand)] font-bold'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Container with reserved min-height and 120ms crossfade transition (Part 3) */}
          <div
            style={{ minHeight: '380px' }}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] overflow-hidden transition-opacity duration-120 opacity-100"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-2)]/50 border-b border-[var(--border)] text-[var(--text-muted)] font-medium">
                  <tr>
                    <th className="p-3.5 sm:px-4">Item Name</th>
                    <th className="p-3.5 sm:px-4">Sell Price</th>
                    <th className="p-3.5 sm:px-4">On Hand</th>
                    <th className="p-3.5 sm:px-4">Days Left</th>
                    <th className="p-3.5 sm:px-4">Status</th>
                    <th className="p-3.5 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredItems.map((item: any) => {
                    const days = item.forecast?.daysLeft;
                    const isOut = Number(item.current_qty) <= 0;
                    const isLow = !isOut && days !== null && days !== undefined && days <= 7;

                    return (
                      <tr key={item.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                        <td className="p-3.5 sm:px-4 font-medium text-[var(--text)]">
                          <Link
                            href={`/stock/${item.id}`}
                            className="hover:text-[var(--brand)] hover:underline inline-flex items-center gap-1.5"
                          >
                            {item.name}
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          </Link>
                        </td>
                        <td className="p-3.5 sm:px-4 font-semibold text-[var(--text)] tabular-nums">
                          <div className="inline-flex items-center gap-1">
                            {formatMoney(item.sell_price_minor)}
                            {item.sell_price_source === 'estimate' && (
                              <span className="text-[9px] font-normal uppercase text-[var(--text-muted)] opacity-70">
                                est.
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 sm:px-4">
                          <span
                            className={`font-semibold tabular-nums ${
                              isOut ? 'text-[var(--danger)]' : 'text-[var(--text)]'
                            }`}
                          >
                            {item.current_qty} {item.unit}
                          </span>
                        </td>
                        <td className="p-3.5 sm:px-4 text-[var(--text-muted)] tabular-nums">
                          {days !== null && days !== undefined ? (
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                                <div
                                  className={`h-full ${
                                    isOut ? 'bg-[var(--danger)]' : isLow ? 'bg-[var(--warning)]' : 'bg-[var(--brand)]'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(8, days * 14))}%` }}
                                />
                              </div>
                              <span>{days} {days === 1 ? 'day' : 'days'}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3.5 sm:px-4">
                          {isOut ? (
                            <span className="badge badge-out">Out</span>
                          ) : isLow ? (
                            <span className="badge badge-low">Low</span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3.5 sm:px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAdjustingItem(item);
                              setNewQty(Math.max(0, Number(item.current_qty) || 0));
                              setAdjustReason('Counted');
                              setAdjustNote('');
                            }}
                            className="h-8 text-xs font-medium"
                          >
                            Adjust
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-xs text-[var(--text-muted)]">
                        {items.length === 0 ? (
                          <div className="py-6 space-y-3">
                            <Package className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                            <div>
                              <p className="font-semibold text-sm text-[var(--text)]">No items in your shop yet</p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                Add items from the catalog or create custom items to start tracking stock.
                              </p>
                            </div>
                            <Button
                              onClick={() => window.dispatchEvent(new CustomEvent('tallo-open-add-item'))}
                              className="bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] text-xs font-semibold gap-1.5"
                            >
                              <Plus className="h-4 w-4" /> Add Item
                            </Button>
                          </div>
                        ) : (
                          'No items found matching your filters.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PURCHASES LIST VIEW (Part 9)                                      */}
      {/* ========================================================================= */}
      {topTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[var(--text)]">
              Restocking &amp; Bulk Purchases
            </h2>
            <Button
              size="sm"
              onClick={() => setPurchaseDrawerOpen(true)}
              className="bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] text-xs font-semibold gap-1.5 h-8"
            >
              <Plus className="h-3.5 w-3.5" /> Record Purchase
            </Button>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-2)]/50 border-b border-[var(--border)] text-[var(--text-muted)] font-medium">
                  <tr>
                    <th className="p-3.5 sm:px-4">Date</th>
                    <th className="p-3.5 sm:px-4">Item</th>
                    <th className="p-3.5 sm:px-4">Packs / Units</th>
                    <th className="p-3.5 sm:px-4">Total Cost</th>
                    <th className="p-3.5 sm:px-4">Supplier</th>
                    <th className="p-3.5 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {purchases.map((p: any) => {
                    const isVoided = !!p.voided_at;
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-[var(--surface-2)]/40 transition-colors ${
                          isVoided ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        <td className="p-3.5 sm:px-4 text-[var(--text-muted)] tabular-nums">
                          {new Date(p.occurred_at).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 sm:px-4 font-semibold text-[var(--text)]">
                          {p.items?.name || 'Item'}
                        </td>
                        <td className="p-3.5 sm:px-4 tabular-nums">
                          <span className="font-semibold text-[var(--brand)]">
                            +{p.quantity} {p.items?.unit || 'units'}
                          </span>
                          {p.pack_count && (
                            <span className="text-[10px] text-[var(--text-muted)] ml-1">
                              ({p.pack_count} {p.pack_type || 'packs'})
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 sm:px-4 font-bold text-[var(--text)] tabular-nums">
                          {formatMoney(p.total_minor)}
                        </td>
                        <td className="p-3.5 sm:px-4 text-[var(--text-muted)]">
                          {p.supplier || p.note || '—'}
                        </td>
                        <td className="p-3.5 sm:px-4 text-right">
                          {!isVoided && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVoidEntry(p.id)}
                              className="h-7 text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                            >
                              Void
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {purchases.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-xs text-[var(--text-muted)]">
                        <Boxes className="mx-auto h-8 w-8 text-[var(--text-muted)] mb-2" />
                        No bulk purchases recorded yet. Click &ldquo;Record Purchase&rdquo; to add stock in cartons, crates, or packs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STOCK ACTIVITY LOG VIEW (Part 8)                                  */}
      {/* ========================================================================= */}
      {topTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[var(--text)]">
              Stock Audit &amp; Correction Activity
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              Showing last {activityEntries.length} entries
            </span>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-2)]/50 border-b border-[var(--border)] text-[var(--text-muted)] font-medium">
                  <tr>
                    <th className="p-3.5 sm:px-4">Time</th>
                    <th className="p-3.5 sm:px-4">Item</th>
                    <th className="p-3.5 sm:px-4">Adjustment / Change</th>
                    <th className="p-3.5 sm:px-4">Reason</th>
                    <th className="p-3.5 sm:px-4">Note</th>
                    <th className="p-3.5 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {activityEntries.map((act: any) => {
                    const isVoided = !!act.voided_at;
                    const diff =
                      act.before_qty !== null && act.after_qty !== null
                        ? Number(act.after_qty) - Number(act.before_qty)
                        : act.type === 'restock'
                        ? Number(act.quantity)
                        : -Number(act.quantity);

                    return (
                      <tr
                        key={act.id}
                        className={`hover:bg-[var(--surface-2)]/40 transition-colors ${
                          isVoided ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        <td className="p-3.5 sm:px-4 text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                          {new Date(act.occurred_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3.5 sm:px-4 font-semibold text-[var(--text)]">
                          {act.items?.name || 'Item'}
                        </td>
                        <td className="p-3.5 sm:px-4 tabular-nums">
                          {act.before_qty !== null && act.after_qty !== null ? (
                            <span>
                              {act.before_qty} → {act.after_qty}{' '}
                              <span
                                className={`font-semibold ${
                                  diff >= 0 ? 'text-[var(--brand)]' : 'text-[var(--danger)]'
                                }`}
                              >
                                ({diff >= 0 ? `+${diff}` : diff})
                              </span>
                            </span>
                          ) : (
                            <span
                              className={`font-semibold ${
                                diff >= 0 ? 'text-[var(--brand)]' : 'text-[var(--danger)]'
                              }`}
                            >
                              {diff >= 0 ? `+${diff}` : diff} {act.items?.unit}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 sm:px-4">
                          <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                            {act.reason || act.type}
                          </span>
                        </td>
                        <td className="p-3.5 sm:px-4 text-[var(--text-muted)]">
                          {act.note || '—'}
                        </td>
                        <td className="p-3.5 sm:px-4 text-right">
                          {!isVoided && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVoidEntry(act.id)}
                              className="h-7 text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                            >
                              Void
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {activityEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-xs text-[var(--text-muted)]">
                        <History className="mx-auto h-8 w-8 text-[var(--text-muted)] mb-2" />
                        No stock adjustments or audit logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADJUST STOCK DIALOG WITH REASON CHIPS (Part 8)                            */}
      {/* ========================================================================= */}
      {adjustingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--border)] p-5 sm:p-6 shadow-lg space-y-4">
            <div>
              <h3 id="adjust-dialog-title" className="font-display font-bold text-base text-[var(--text)]">
                Adjust Stock for {adjustingItem.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Current count: <span className="font-bold text-[var(--text)]">{adjustingItem.current_qty} {adjustingItem.unit}</span>
              </p>
            </div>

            {/* Difference Preview */}
            <div className="rounded-[var(--r-sm)] bg-[var(--surface-2)] p-2.5 text-xs flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Count change:</span>
              <span className="font-bold font-mono text-[var(--text)]">
                {adjustingItem.current_qty} → {newQty} (
                <span className={newQty - adjustingItem.current_qty >= 0 ? 'text-[var(--brand)]' : 'text-[var(--danger)]'}>
                  {newQty - adjustingItem.current_qty >= 0 ? `+${newQty - adjustingItem.current_qty}` : newQty - adjustingItem.current_qty}
                </span>
                )
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">
                  New Physical Count (Min 0)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={newQty}
                  onChange={(e) => setNewQty(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="mt-1 h-9 text-xs tabular-nums"
                  required
                />
              </div>

              {/* Reason Chips (Single Select - Part 8) */}
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">
                  Adjustment Reason <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(['Sold', 'Purchased', 'Expired', 'Damaged', 'Returned', 'Counted', 'Other'] as const).map(
                    (chip) => {
                      const isSelected = adjustReason === chip;
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setAdjustReason(chip)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hit-slop ${
                            isSelected
                              ? 'border-[var(--brand)] bg-[var(--brand-soft)]/50 text-[var(--brand)] font-bold'
                              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
                          }`}
                        >
                          {chip}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Special options depending on selected reason */}
              {adjustReason === 'Sold' && (
                <div className="rounded border border-[var(--brand)]/30 bg-[var(--brand-soft)]/20 p-2.5 text-xs flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recordAsSaleCheck"
                    checked={recordAsSale}
                    onChange={(e) => setRecordAsSale(e.target.checked)}
                    className="accent-[var(--brand)] h-4 w-4"
                  />
                  <label htmlFor="recordAsSaleCheck" className="text-[var(--text)] cursor-pointer">
                    Also record this as a sale at {formatMoney(adjustingItem.sell_price_minor)} (revenue will be kept correct)
                  </label>
                </div>
              )}

              {adjustReason === 'Purchased' && (
                <div className="rounded border border-[var(--accent)]/40 bg-[var(--accent-soft)]/20 p-2.5 text-xs flex items-center justify-between">
                  <span>Purchases should be recorded with cost per pack to track spend:</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      const it = adjustingItem;
                      setAdjustingItem(null);
                      setPurchaseItemId(it.id);
                      setPurchaseDrawerOpen(true);
                    }}
                    className="text-xs h-7 ml-2"
                  >
                    Open Purchases Form
                  </Button>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[var(--text)]">
                  Note {adjustReason === 'Other' ? <span className="text-[var(--danger)]">*</span> : '(Optional)'}
                </label>
                <Input
                  placeholder={adjustReason === 'Other' ? 'Explain adjustment reason...' : 'e.g. Audit note or detail'}
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
              <Button
                variant="outline"
                onClick={() => setAdjustingItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAdjustment}
                disabled={adjusting || (adjustReason === 'Other' && !adjustNote.trim())}
                className="bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] text-xs font-semibold"
              >
                {adjusting ? 'Saving…' : 'Save Adjustment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PURCHASES DRAWER FORM (Part 9: Bulk Restocking)                         */}
      {/* ========================================================================= */}
      <Drawer open={purchaseDrawerOpen} onOpenChange={setPurchaseDrawerOpen}>
        <DrawerContent className="max-h-[85vh] bg-[var(--surface)] text-[var(--text)]">
          <DrawerHeader className="border-b border-[var(--border)] pb-3">
            <DrawerTitle className="text-base font-bold">Record Stock Purchase</DrawerTitle>
            <DrawerDescription className="text-xs text-[var(--text-muted)]">
              Buy stock in cartons, crates, bags, or packs with automatic unit conversion.
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 overflow-y-auto space-y-4 max-h-[50vh]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Supplier (Optional)</label>
                <Input
                  placeholder="e.g. Alaba Wholesale Mart"
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Purchase Date</label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Select Item to Restock */}
            <div>
              <label className="text-xs font-semibold text-[var(--text)]">Item to Restock</label>
              <div className="mt-1">
                <Combobox
                  value={purchaseItemId}
                  onChange={(val) => {
                    setPurchaseItemId(val);
                    const it = items.find((i: any) => i.id === val);
                    if (it?.usual_units_per_pack) {
                      setPurchaseUnitsPerPack(Number(it.usual_units_per_pack));
                    }
                    if (it?.usual_pack_type) {
                      setPurchasePackType(it.usual_pack_type);
                    }
                  }}
                  placeholder="Choose item to restock..."
                  searchPlaceholder="Search items..."
                  options={items.map((i: any) => ({
                    value: i.id,
                    label: `${i.name} (Stock: ${i.current_qty} ${i.unit})`,
                  }))}
                />
              </div>
            </div>

            {/* Pack Type & Units per Pack */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Pack Type</label>
                <div className="mt-1">
                  <Select value={purchasePackType} onValueChange={setPurchasePackType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pack type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carton">Carton</SelectItem>
                      <SelectItem value="crate">Crate</SelectItem>
                      <SelectItem value="bag">Bag</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                      <SelectItem value="dozen">Dozen</SelectItem>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Packs Count</label>
                <Input
                  type="number"
                  min="1"
                  value={purchasePackCount}
                  onChange={(e) => setPurchasePackCount(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="mt-1 h-9 text-xs tabular-nums"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Units per Pack</label>
                <Input
                  type="number"
                  min="1"
                  value={purchaseUnitsPerPack}
                  onChange={(e) => setPurchaseUnitsPerPack(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="mt-1 h-9 text-xs tabular-nums"
                />
              </div>
            </div>

            {/* Live Unit Conversion Hint (Part 9) */}
            <div className="rounded-[var(--r-sm)] bg-[var(--brand-soft)]/20 border border-[var(--brand)]/30 p-2.5 text-xs font-semibold text-[var(--brand)]">
              Conversion: {purchasePackCount} {purchasePackType}{purchasePackCount > 1 ? 's' : ''} × {purchaseUnitsPerPack} ={' '}
              <span className="font-bold underline">
                {Math.round(purchasePackCount * purchaseUnitsPerPack)} units added to stock
              </span>
            </div>

            {/* Cost per Pack */}
            <div>
              <label className="text-xs font-semibold text-[var(--text)]">Cost per {purchasePackType} (₦)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={purchaseCostPerPack}
                onChange={(e) =>
                  setPurchaseCostPerPack(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))
                }
                className="mt-1 h-9 text-xs tabular-nums"
              />
              {purchaseCostPerPack !== '' && Number(purchaseCostPerPack) > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>
                    Total Cost: <span className="font-bold text-[var(--text)]">{formatMoney(toMinor(Number(purchaseCostPerPack) * purchasePackCount))}</span>
                  </span>
                  <span>
                    Unit Cost:{' '}
                    <span className="font-bold text-[var(--brand)]">
                      {formatMoney(Math.round(toMinor(Number(purchaseCostPerPack)) / purchaseUnitsPerPack))}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Update Item Cost Price Toggle */}
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] text-xs">
              <input
                type="checkbox"
                id="updateCostPriceToggle"
                checked={updateCostPrice}
                onChange={(e) => setUpdateCostPrice(e.target.checked)}
                className="accent-[var(--brand)] h-4 w-4"
              />
              <label htmlFor="updateCostPriceToggle" className="text-[var(--text)] cursor-pointer">
                Update the item&apos;s cost price from this purchase
              </label>
            </div>
          </div>

          <DrawerFooter className="border-t border-[var(--border)] pt-3 flex flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPurchaseDrawerOpen(false)}
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={savingPurchase || !purchaseItemId || !purchaseCostPerPack}
              onClick={handleSavePurchase}
              className="flex-1 bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] text-xs font-semibold"
            >
              {savingPurchase ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Restock'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
