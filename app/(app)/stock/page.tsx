'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/domain/money';
import { Search, ChevronRight } from 'lucide-react';
import { useItems } from '@/lib/query/hooks';
import { useQueryClient } from '@tanstack/react-query';

export default function StockPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const queryClient = useQueryClient();
  const { data, isLoading } = useItems(filter);
  const items = data?.items || [];

  // Adjust stock modal
  const [adjustingItem, setAdjustingItem] = useState<any | null>(null);
  const [newQty, setNewQty] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const handleAdjustStock = async () => {
    if (!adjustingItem || !adjustNote.trim()) return;
    setAdjusting(true);
    try {
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: adjustingItem.id,
          newQty,
          note: adjustNote,
        }),
      });

      if (res.ok) {
        setAdjustingItem(null);
        setAdjustNote('');
        await queryClient.invalidateQueries({ queryKey: ['items'] });
      }
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    } finally {
      setAdjusting(false);
    }
  };

  const filteredItems = items.filter((i: any) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-48 skeleton rounded-[var(--r-sm)]"></div>
          <div className="h-4 w-64 skeleton rounded-[var(--r-sm)]"></div>
        </div>
        <div className="h-10 skeleton rounded-[var(--r-md)]"></div>
        <div className="h-72 skeleton rounded-[var(--r-lg)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
            Stock & Inventory
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track counts, depletion speeds, and inventory health
          </p>
        </div>
      </div>

      {/* Search and Filter Chips */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
          <Input
            placeholder="Search items by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-[var(--surface)] text-sm"
          />
        </div>

        <div className="flex bg-[var(--surface-2)] p-1 rounded-[var(--r-md)] border border-[var(--border)] shrink-0 self-start sm:self-auto">
          {(['all', 'low', 'out'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-[var(--r-sm)] capitalize transition-all hit-slop ${
                filter === f
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {f === 'all' ? 'All Items' : f === 'low' ? 'Running Low' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory List / Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] overflow-hidden">
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
                const isOut = item.current_qty <= 0;
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
                      {formatMoney(item.sell_price_minor)}
                    </td>
                    <td className="p-3.5 sm:px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold tabular-nums ${isOut ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}>
                          {item.current_qty} {item.unit}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 sm:px-4 text-[var(--text-muted)] tabular-nums">
                      {days !== null && days !== undefined ? (
                        <div className="flex items-center gap-2">
                          {/* Thin meter */}
                          <div className="w-12 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                            <div
                              className={`h-full ${isOut ? 'bg-[var(--danger)]' : isLow ? 'bg-[var(--warning)]' : 'bg-[var(--brand)]'}`}
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
                          setNewQty(Number(item.current_qty) || 0);
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
                    No items found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Dialog */}
      {adjustingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--border)] p-6 shadow-subtle space-y-4">
            <div>
              <h3 id="adjust-dialog-title" className="font-display font-bold text-base text-[var(--text)]">
                Adjust Stock for {adjustingItem.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Update the physical count after an audit or damaged stock check.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">
                  New Physical Count ({adjustingItem.unit})
                </label>
                <Input
                  type="number"
                  value={newQty}
                  onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text)]">
                  Audit Reason / Note <span className="text-[var(--danger)]">*</span>
                </label>
                <Input
                  placeholder="e.g. Physical inventory count, damaged cartons"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="mt-1"
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
                onClick={handleAdjustStock}
                disabled={adjusting || !adjustNote.trim()}
                className="text-xs font-semibold"
              >
                {adjusting ? 'Saving…' : 'Save Correction'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
