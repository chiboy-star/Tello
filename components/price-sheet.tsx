'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fromMinor, toMinor } from '@/lib/domain/money';

interface PriceSheetProps {
  item: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPriceSet?: (newPriceMinor: number) => void;
}

export function PriceSheet({ item, open, onOpenChange, onPriceSet }: PriceSheetProps) {
  const queryClient = useQueryClient();
  const [priceInput, setPriceInput] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item && open) {
      if (item.sell_price_minor) {
        setPriceInput(fromMinor(item.sell_price_minor));
      } else {
        setPriceInput('');
      }
    }
  }, [item, open]);

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || priceInput === '' || priceInput < 0) return;

    setSaving(true);
    const minor = toMinor(Number(priceInput));

    // Optimistically update TanStack cache
    queryClient.setQueryData(['items', 'all'], (old: any) => {
      if (!old?.items) return old;
      return {
        ...old,
        items: old.items.map((i: any) =>
          i.id === item.id ? { ...i, sell_price_minor: minor, sell_price_source: 'user' } : i
        ),
      };
    });

    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellPrice: Number(priceInput) }),
      });

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['items'] });
        onOpenChange(false);
        if (onPriceSet) {
          onPriceSet(minor);
        }
      }
    } catch (err) {
      console.error('Failed to update price:', err);
      queryClient.invalidateQueries({ queryKey: ['items'] });
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-8 pt-4">
        <DrawerHeader className="text-left space-y-1">
          <DrawerTitle className="font-display text-lg font-bold text-[var(--text)]">
            Set Price for {item.name}
          </DrawerTitle>
          <DrawerDescription className="text-xs text-[var(--text-muted)]">
            This item has no selling price. Enter the price per {item.unit || 'unit'} to sell it.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSavePrice} className="mt-4 px-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text)]">
              Selling Price per {item.unit || 'unit'} (₦)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-[var(--text-muted)]">
                ₦
              </span>
              <Input
                autoFocus
                required
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                placeholder="0.00"
                value={priceInput}
                onChange={(e) =>
                  setPriceInput(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))
                }
                className="pl-8 h-10 text-sm font-semibold tabular-nums bg-[var(--surface)]"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pt-2">
            <Button
              type="submit"
              disabled={priceInput === '' || priceInput <= 0 || saving}
              className="w-full bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] h-10 font-semibold text-xs"
            >
              {saving ? 'Saving Price...' : 'Save & Continue'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
