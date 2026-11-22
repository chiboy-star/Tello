'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fromMinor, toMinor } from '@/lib/domain/money';
import { PricesSkeleton } from '@/components/skeletons';
import {
  ArrowLeft,
  Search,
  Check,
  CheckCheck,
} from 'lucide-react';

export default function ReviewPricesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'estimates' | 'missing' | 'all'>('estimates');
  const [localPrices, setLocalPrices] = useState<Record<string, number | ''>>({});
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // References for Enter navigation between price inputs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['items', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/items?status=all');
      if (!res.ok) throw new Error('Failed to fetch items');
      return res.json();
    },
    staleTime: 30000,
  });

  const items = useMemo(() => data?.items || [], [data]);

  // Estimates count
  const estimatedItems = useMemo(
    () => items.filter((i: any) => i.sell_price_source === 'estimate'),
    [items]
  );
  const missingItems = useMemo(
    () => items.filter((i: any) => i.sell_price_minor === null || i.sell_price_minor === 0),
    [items]
  );

  const estimateCount = estimatedItems.length;

  // Filtered and sorted items
  const displayItems = useMemo(() => {
    let list = [...items];

    if (filter === 'estimates') {
      list = list.filter((i: any) => i.sell_price_source === 'estimate');
    } else if (filter === 'missing') {
      list = list.filter((i: any) => i.sell_price_minor === null || i.sell_price_minor === 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i: any) =>
          i.name.toLowerCase().includes(q) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }

    // Sort: missing/no estimate first, then estimates, then others
    list.sort((a: any, b: any) => {
      const aMissing = a.sell_price_minor === null || a.sell_price_minor === 0;
      const bMissing = b.sell_price_minor === null || b.sell_price_minor === 0;
      if (aMissing && !bMissing) return -1;
      if (!aMissing && bMissing) return 1;

      const aEst = a.sell_price_source === 'estimate';
      const bEst = b.sell_price_source === 'estimate';
      if (aEst && !bEst) return -1;
      if (!aEst && bEst) return 1;

      return a.name.localeCompare(b.name);
    });

    return list;
  }, [items, filter, search]);

  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const item of displayItems) {
      const cat = item.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [displayItems]);

  const handlePriceChange = (itemId: string, value: string) => {
    const num = value === '' ? '' : Math.max(0, parseFloat(value));
    setLocalPrices((prev) => ({ ...prev, [itemId]: num }));
  };

  const handleSavePriceOnBlur = async (item: any) => {
    const newPriceVal = localPrices[item.id];
    if (newPriceVal === undefined) return; // Not modified

    const minor = newPriceVal === '' ? null : toMinor(newPriceVal);
    if (minor === item.sell_price_minor) return; // Unchanged

    // Optimistically update TanStack cache
    queryClient.setQueryData(['items', 'all'], (old: any) => {
      if (!old?.items) return old;
      return {
        ...old,
        items: old.items.map((i: any) =>
          i.id === item.id
            ? { ...i, sell_price_minor: minor, sell_price_source: 'user' }
            : i
        ),
      };
    });

    try {
      if (minor !== null) {
        await fetch('/api/stock/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates: [{ itemId: item.id, sellPrice: fromMinor(minor) }],
          }),
        });
      } else {
        await fetch(`/api/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sellPrice: null }),
        });
      }
    } catch (err) {
      console.error('Failed to save price:', err);
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  const handleConfirmAll = async () => {
    setConfirmingAll(true);
    try {
      const res = await fetch('/api/stock/prices/confirm', { method: 'POST' });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        await queryClient.invalidateQueries({ queryKey: ['items'] });
      }
    } catch (err) {
      console.error('Failed to confirm all prices:', err);
    } finally {
      setConfirmingAll(false);
    }
  };

  if (isLoading && items.length === 0) {
    return <PricesSkeleton />;
  }

  let inputIndexCounter = 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Back button and Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/stock"
            className="p-1.5 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors hit-slop"
            aria-label="Back to Stock"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
              {estimateCount > 0
                ? `${estimateCount} price${estimateCount === 1 ? ' is an estimate' : 's are estimates'}. Check and adjust for your area.`
                : 'All prices confirmed'}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Press Enter to move to the next item. Changes save automatically.
            </p>
          </div>
        </div>

        {estimateCount > 0 && (
          <Button
            onClick={handleConfirmAll}
            disabled={confirmingAll}
            className="bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] h-9 text-xs font-semibold gap-1.5 shrink-0"
          >
            <CheckCheck className="h-4 w-4" />
            {confirmingAll ? 'Confirming...' : 'Confirm all'}
          </Button>
        )}
      </div>

      {savedSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--r-sm)] bg-[var(--brand-soft)] border border-[var(--brand)]/20 p-3 text-xs text-[var(--brand)] font-medium flex items-center gap-2"
        >
          <Check className="h-4 w-4" /> All estimated prices confirmed successfully.
        </div>
      )}

      {/* Search & Filter Chips */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
          <Input
            placeholder="Search items to review..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-[var(--surface)]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setFilter('estimates')}
            className={`px-3 py-1.5 rounded-full border text-xs capitalize transition-colors ${
              filter === 'estimates'
                ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)] font-bold'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
            }`}
          >
            Estimates ({estimateCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('missing')}
            className={`px-3 py-1.5 rounded-full border text-xs capitalize transition-colors ${
              filter === 'missing'
                ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)] font-bold'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
            }`}
          >
            Missing ({missingItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full border text-xs capitalize transition-colors ${
              filter === 'all'
                ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)] font-bold'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
            }`}
          >
            All ({items.length})
          </button>
        </div>
      </div>

      {/* Grouped Items List */}
      <div className="space-y-6">
        {displayItems.length === 0 ? (
          <div className="text-center py-12 rounded-[var(--r-md)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 space-y-2">
            <CheckCheck className="mx-auto h-8 w-8 text-[var(--brand)]" />
            <p className="text-xs font-semibold text-[var(--text)]">No items in this view</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              All prices in this category have been set and confirmed.
            </p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([category, catItems]) => (
            <div key={category} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1 capitalize">
                {category.replace('_', ' ')}
              </h2>

              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden shadow-subtle">
                {catItems.map((item: any) => {
                  const currentIndex = inputIndexCounter++;
                  const isEstimate = item.sell_price_source === 'estimate';
                  const isMissing = item.sell_price_minor === null || item.sell_price_minor === 0;

                  const currentVal =
                    localPrices[item.id] !== undefined
                      ? localPrices[item.id]
                      : item.sell_price_minor !== null && item.sell_price_minor !== undefined
                      ? fromMinor(item.sell_price_minor)
                      : '';

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 sm:px-4 transition-colors ${
                        isMissing
                          ? 'bg-[var(--accent-soft)]/20 border-l-4 border-l-[var(--warning)]'
                          : isEstimate
                          ? 'bg-[var(--surface)] border-l-4 border-l-[var(--brand-soft)]'
                          : 'bg-[var(--surface)]'
                      }`}
                    >
                      <div className="space-y-0.5 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-[var(--text)]">{item.name}</p>
                          {isMissing && (
                            <span className="text-[10px] font-semibold text-[var(--warning)] border border-[var(--warning)]/40 bg-[var(--accent-soft)]/50 px-1.5 py-0.2 rounded">
                              Add price
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                          <span>Unit: {item.unit}</span>
                          {isEstimate && (
                            <span className="text-[10px] text-[var(--text-muted)] italic">
                              Estimate, checked Nov 2026
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-semibold text-[var(--text-muted)]">₦</span>
                        <Input
                          ref={(el) => {
                            inputRefs.current[currentIndex] = el;
                          }}
                          type="number"
                          inputMode="decimal"
                          value={currentVal}
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          onBlur={() => handleSavePriceOnBlur(item)}
                          onKeyDown={(e) => handleKeyDown(e, currentIndex)}
                          placeholder="0.00"
                          className={`w-28 h-9 text-xs tabular-nums text-right font-semibold bg-[var(--surface)] ${
                            isMissing
                              ? 'border-[var(--warning)] focus-visible:ring-[var(--warning)] ring-1 ring-[var(--warning)]/50'
                              : 'border-[var(--border)]'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
