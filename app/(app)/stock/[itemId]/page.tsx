'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/domain/money';
import { ArrowLeft, Package, Check, RefreshCw, Clock } from 'lucide-react';
import { useItem, useEntries } from '@/lib/query/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { StockDetailSkeleton } from '@/components/skeletons';

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;
  const queryClient = useQueryClient();

  const itemQuery = useItem(itemId);
  const entriesQuery = useEntries(20, itemId);

  const item = itemQuery.data?.item;
  const entries = entriesQuery.data?.entries || [];
  const loading = (itemQuery.isLoading && !item) || (entriesQuery.isLoading && !entriesQuery.data);

  // Adjustment state
  const [newQty, setNewQty] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustedMessage, setAdjustedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setNewQty(Number(item.current_qty) || 0);
    }
  }, [item]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustNote.trim()) return;
    setAdjusting(true);
    try {
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          newQty,
          note: adjustNote,
        }),
      });

      if (res.ok) {
        setAdjustNote('');
        setAdjustedMessage('Stock updated successfully');
        setTimeout(() => setAdjustedMessage(null), 3000);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['item', itemId] }),
          queryClient.invalidateQueries({ queryKey: ['entries'] }),
          queryClient.invalidateQueries({ queryKey: ['items'] }),
        ]);
      }
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) {
    return <StockDetailSkeleton />;
  }

  if (!item) {
    return (
      <div className="text-center py-16 space-y-4">
        <Package className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
        <div>
          <h2 className="text-lg font-bold font-display text-[var(--text)]">Item not found</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">This item might have been archived or deleted.</p>
        </div>
        <Button onClick={() => router.push('/stock')} variant="outline">
          Back to Stock
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/stock"
          className="p-1.5 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors hit-slop"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
            {item.name}
          </h1>
          <p className="text-xs text-[var(--text-muted)] capitalize">
            {item.category || 'Uncategorized'} • Unit: {item.unit}
          </p>
        </div>
      </div>

      {adjustedMessage && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--r-sm)] bg-[var(--brand-soft)] border border-[var(--brand)]/20 p-3 text-xs text-[var(--brand)] font-medium flex items-center gap-2"
        >
          <Check className="h-4 w-4" /> {adjustedMessage}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase">Current Stock</span>
          <div className="mt-1 font-display text-2xl font-bold text-[var(--text)] tabular-nums">
            {item.current_qty} <span className="text-xs font-normal text-[var(--text-muted)]">{item.unit}</span>
          </div>
        </div>

        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase">Sell Price</span>
          <div className="mt-1 font-display text-2xl font-bold text-[var(--brand)] tabular-nums">
            {formatMoney(item.sell_price_minor)}
          </div>
        </div>

        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase">Cost Price</span>
          <div className="mt-1 font-display text-2xl font-bold text-[var(--text)] tabular-nums">
            {formatMoney(item.cost_price_minor)}
          </div>
        </div>

        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase">Reorder Lead</span>
          <div className="mt-1 font-display text-2xl font-bold text-[var(--text)] tabular-nums">
            {item.reorder_lead_days} <span className="text-xs font-normal text-[var(--text-muted)]">days</span>
          </div>
        </div>
      </div>

      {/* Adjust Stock Form */}
      <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-[var(--brand)]" />
          <h2 className="font-display text-sm font-semibold text-[var(--text)]">Adjust Stock Count</h2>
        </div>
        <form onSubmit={handleAdjust} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text)]">
              New Physical Count ({item.unit})
            </label>
            <Input
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)}
              className="mt-1 h-9 text-xs"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-[var(--text)]">
              Audit Reason / Note <span className="text-[var(--danger)]">*</span>
            </label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="e.g. Month-end inventory count or broken items"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="h-9 text-xs"
                required
              />
              <Button type="submit" disabled={adjusting || !adjustNote.trim()} className="h-9 text-xs font-semibold shrink-0">
                {adjusting ? 'Saving…' : 'Apply'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* History Ledger Table */}
      <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden space-y-2 p-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
          <Clock className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="font-display text-sm font-semibold text-[var(--text)]">Recent Ledger History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)]/50 border-b border-[var(--border)] text-[var(--text-muted)] font-medium">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Source / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {entries.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                  <td className="p-3 text-[var(--text-muted)] tabular-nums">
                    {new Date(entry.occurred_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <span className="font-semibold capitalize text-[var(--text)]">
                      {entry.type}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-[var(--text)] tabular-nums">
                    {entry.quantity} {item.unit}
                  </td>
                  <td className="p-3 font-semibold text-[var(--text)] tabular-nums">
                    {formatMoney(entry.total_minor)}
                  </td>
                  <td className="p-3 text-xs text-[var(--text-muted)]">
                    {entry.note || entry.source}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-[var(--text-muted)]">
                    No transactions recorded for this item yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
