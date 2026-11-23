'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney, toMinor } from '@/lib/domain/money';
import { SlidingPill } from '@/components/ui/sliding-pill';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface AddItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'catalog' | 'custom';
  onSuccess?: (addedItems: any[]) => void;
}

const COMMON_UNITS = ['piece', 'derica', 'pack', 'bottle', 'sachet', 'carton', 'kg', 'loaf'];
const CATEGORIES = ['everyday', 'food', 'drinks', 'household', 'personal_care'];

export function AddItemDrawer({
  open,
  onOpenChange,
  defaultTab = 'catalog',
  onSuccess,
}: AddItemDrawerProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'catalog' | 'custom'>(defaultTab);
  const tabToggleRef = useRef<HTMLDivElement>(null);

  // Catalog tab state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set());
  const [addingCatalog, setAddingCatalog] = useState(false);

  // Custom item tab state
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('piece');
  const [customCategory, setCustomCategory] = useState('everyday');
  const [customSellPrice, setCustomSellPrice] = useState<number | ''>('');
  const [customCostPrice, setCustomCostPrice] = useState<number | ''>('');
  const [customOpeningStock, setCustomOpeningStock] = useState<number | ''>('');
  const [customLeadDays, setCustomLeadDays] = useState(7);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [restoreItemInfo, setRestoreItemInfo] = useState<{ id: string; name: string } | null>(null);

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{ visible: boolean; message: string; itemIds: string[] }>({
    visible: false,
    message: '',
    itemIds: [],
  });

  // Reset tab on open
  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setCustomError(null);
      setRestoreItemInfo(null);
      setSelectedCatalogIds(new Set());
    }
  }, [open, defaultTab]);

  // Fetch catalog items
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalog', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/catalog?all=1');
      if (!res.ok) throw new Error('Failed to fetch catalog');
      return res.json();
    },
    enabled: open,
    staleTime: 60000,
  });

  const catalogItems = useMemo(() => catalogData?.items || [], [catalogData?.items]);

  // Filter catalog items
  const filteredCatalog = useMemo(() => {
    return catalogItems.filter((item: any) => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        !catalogSearch.trim() ||
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.aliases?.some((a: string) => a.toLowerCase().includes(catalogSearch.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [catalogItems, selectedCategory, catalogSearch]);

  const toggleSelectCatalogItem = (id: string) => {
    setSelectedCatalogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddCatalogItems = async () => {
    if (selectedCatalogIds.size === 0) return;
    setAddingCatalog(true);

    const itemsToAdd = catalogItems
      .filter((i: any) => selectedCatalogIds.has(i.id) && !i.owned)
      .map((i: any) => ({
        name: i.name,
        category: i.category,
        unit: i.unit,
        sellPrice: i.refPrice !== null ? i.refPrice : null,
        catalogItemId: i.id,
        startingQty: 0,
      }));

    const idempotencyKey = crypto.randomUUID();

    try {
      const res = await fetch('/api/items/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ items: itemsToAdd }),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.items || [];
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['items'] }),
          queryClient.invalidateQueries({ queryKey: ['catalog'] }),
          queryClient.invalidateQueries({ queryKey: ['reports'] }),
          queryClient.invalidateQueries({ queryKey: ['entries'] }),
          queryClient.invalidateQueries({ queryKey: ['checklist'] }),
        ]);

        onOpenChange(false);
        if (onSuccess) onSuccess(created);

        // Show Undo toast
        const count = created.length;
        if (count > 0) {
          showUndoNotification(
            `${count} item${count > 1 ? 's' : ''} added · Undo`,
            created.map((i: any) => i.id)
          );
        }
      }
    } catch (err) {
      console.error('Failed to add catalog items:', err);
    } finally {
      setAddingCatalog(false);
    }
  };

  const handleCreateCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    setAddingCustom(true);
    setCustomError(null);
    setRestoreItemInfo(null);

    const payload = {
      name: customName.trim(),
      unit: customUnit.trim() || 'piece',
      category: customCategory,
      sellPrice: customSellPrice !== '' ? Number(customSellPrice) : null,
      costPrice: customCostPrice !== '' ? Number(customCostPrice) : null,
      startingQty: customOpeningStock !== '' ? Number(customOpeningStock) : 0,
      reorderLeadDays: Number(customLeadDays) || 7,
    };

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const errorData = await res.json();
        setCustomError(errorData.message || `You already have ${customName}`);
        if (errorData.canRestore && errorData.archivedItemId) {
          setRestoreItemInfo({ id: errorData.archivedItemId, name: customName });
        }
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const created = data.item;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['items'] }),
          queryClient.invalidateQueries({ queryKey: ['entries'] }),
          queryClient.invalidateQueries({ queryKey: ['catalog'] }),
        ]);

        onOpenChange(false);
        if (onSuccess && created) onSuccess([created]);

        if (created) {
          showUndoNotification(`"${created.name}" added · Undo`, [created.id]);
        }
      } else {
        const errData = await res.json();
        setCustomError(errData.message || 'Failed to create item');
      }
    } catch {
      setCustomError('Network error while adding item');
    } finally {
      setAddingCustom(false);
    }
  };

  const handleRestoreItem = async () => {
    if (!restoreItemInfo) return;
    try {
      const res = await fetch(`/api/items/${restoreItemInfo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      });
      if (res.ok) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['items'] }),
          queryClient.invalidateQueries({ queryKey: ['catalog'] }),
          queryClient.invalidateQueries({ queryKey: ['reports'] }),
          queryClient.invalidateQueries({ queryKey: ['entries'] }),
          queryClient.invalidateQueries({ queryKey: ['checklist'] }),
        ]);
        onOpenChange(false);
        showUndoNotification(`"${restoreItemInfo.name}" restored · Undo`, [restoreItemInfo.id]);
      }
    } catch (err) {
      console.error('Failed to restore item:', err);
    }
  };

  const showUndoNotification = (message: string, itemIds: string[]) => {
    setUndoToast({ visible: true, message, itemIds });
    setTimeout(() => {
      setUndoToast((prev) => ({ ...prev, visible: false }));
    }, 8000);
  };

  const handleExecuteUndo = async () => {
    const ids = undoToast.itemIds;
    setUndoToast({ visible: false, message: '', itemIds: [] });
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/items/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: true }),
          })
        )
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['items'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog'] }),
      ]);
    } catch (err) {
      console.error('Failed to undo add items:', err);
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-8 pt-4 max-h-[90vh] flex flex-col">
          <DrawerHeader className="text-left space-y-1">
            <DrawerTitle className="font-display text-xl font-bold text-[var(--text)]">
              Add Items to Shop
            </DrawerTitle>
            <DrawerDescription className="text-xs text-[var(--text-muted)]">
              Choose from standard Nigerian retail catalog or add a custom item
            </DrawerDescription>
          </DrawerHeader>

          {/* Tab Switcher */}
          <div className="px-4 pt-2 pb-3">
            <div
              ref={tabToggleRef}
              className="relative flex rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-1"
            >
              <SlidingPill
                activeId={tab}
                containerRef={tabToggleRef}
                pillClassName="bg-[var(--surface)] shadow-subtle"
              />
              <button
                type="button"
                data-pill-id="catalog"
                onClick={() => setTab('catalog')}
                className={`relative z-10 flex-1 py-1.5 text-xs font-semibold text-center transition-colors hit-slop ${
                  tab === 'catalog' ? 'text-[var(--text)] font-bold' : 'text-[var(--text-muted)]'
                }`}
              >
                From Catalog
              </button>
              <button
                type="button"
                data-pill-id="custom"
                onClick={() => setTab('custom')}
                className={`relative z-10 flex-1 py-1.5 text-xs font-semibold text-center transition-colors hit-slop ${
                  tab === 'custom' ? 'text-[var(--text)] font-bold' : 'text-[var(--text-muted)]'
                }`}
              >
                Custom Item
              </button>
            </div>
          </div>

          {/* TAB 1: FROM CATALOG */}
          {tab === 'catalog' && (
            <div className="flex-1 flex flex-col overflow-hidden px-4 space-y-3">
              {/* Search & Filter Chips */}
              <div className="space-y-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                  <Input
                    placeholder="Search catalog items..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-[var(--surface)]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2.5 py-1 rounded-full border text-xs capitalize shrink-0 transition-colors ${
                      selectedCategory === 'all'
                        ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)] font-bold'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    All
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full border text-xs capitalize shrink-0 transition-colors ${
                        selectedCategory === cat
                          ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)] font-bold'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catalog Items List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                {catalogLoading ? (
                  <div className="space-y-2 py-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-14 skeleton rounded-[var(--r-md)]" />
                    ))}
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                    No items found matching your search.
                  </div>
                ) : (
                  filteredCatalog.map((item: any) => {
                    const isSelected = selectedCatalogIds.has(item.id);
                    const isOwned = item.owned;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (!isOwned) toggleSelectCatalogItem(item.id);
                        }}
                        className={`flex items-center justify-between p-3 rounded-[var(--r-md)] border text-left transition-all ${
                          isOwned
                            ? 'opacity-60 bg-[var(--surface-2)]/40 border-[var(--border)] cursor-not-allowed'
                            : isSelected
                            ? 'border-[var(--brand)] bg-[var(--brand-soft)]/40 cursor-pointer'
                            : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                              isOwned
                                ? 'border-[var(--border)] bg-[var(--surface-2)]'
                                : isSelected
                                ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--on-brand)]'
                                : 'border-[var(--border)] bg-[var(--surface)]'
                            }`}
                          >
                            {(isSelected || isOwned) && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--text)]">{item.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)] capitalize">
                              Unit: {item.unit} • {item.category.replace('_', ' ')}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          {isOwned ? (
                            <span className="text-[10px] font-semibold text-[var(--brand)] bg-[var(--brand-soft)] px-2 py-0.5 rounded-full">
                              In your shop
                            </span>
                          ) : item.refPrice !== null ? (
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold tabular-nums text-[var(--text)]">
                                {formatMoney(toMinor(item.refPrice))}
                              </span>
                              <p className="text-[10px] text-[var(--text-muted)]">Est. price</p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)] italic">No price</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 shrink-0">
                <Button
                  onClick={handleAddCatalogItems}
                  disabled={selectedCatalogIds.size === 0 || addingCatalog}
                  className="w-full bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] h-10 font-semibold text-xs"
                >
                  {addingCatalog
                    ? 'Adding...'
                    : `Add ${selectedCatalogIds.size} Item${selectedCatalogIds.size === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM ITEM */}
          {tab === 'custom' && (
            <form onSubmit={handleCreateCustomItem} className="flex-1 overflow-y-auto px-4 space-y-4">
              {customError && (
                <div className="p-3 rounded-[var(--r-sm)] bg-[var(--danger-soft)] border border-[var(--danger)]/30 text-xs text-[var(--danger)] flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p>{customError}</p>
                    {restoreItemInfo && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleRestoreItem}
                        className="h-7 text-xs bg-[var(--brand)] text-[var(--on-brand)]"
                      >
                        Restore &quot;{restoreItemInfo.name}&quot;
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Item Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text)]">
                  Item Name <span className="text-[var(--danger)]">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Golden Penny Sugar"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="h-10 text-xs bg-[var(--surface)]"
                  maxLength={100}
                />
              </div>

              {/* Unit Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text)]">Unit of Measurement</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setCustomUnit(u)}
                      className={`px-2.5 py-1 rounded-[var(--r-sm)] border text-xs capitalize transition-colors ${
                        customUnit === u
                          ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)] font-bold'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Or custom unit (e.g. carton)"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="h-9 text-xs bg-[var(--surface)] mt-1"
                  maxLength={30}
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text)]">Category</label>
                <Select value={customCategory} onValueChange={(val) => setCustomCategory(val as any)}>
                  <SelectTrigger className="w-full h-10 capitalize">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pricing & Opening Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text)]">Selling Price (₦)</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={customSellPrice}
                    onChange={(e) =>
                      setCustomSellPrice(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))
                    }
                    className="h-10 text-xs bg-[var(--surface)] tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text)]">Cost Price (₦)</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Optional"
                    value={customCostPrice}
                    onChange={(e) =>
                      setCustomCostPrice(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))
                    }
                    className="h-10 text-xs bg-[var(--surface)] tabular-nums"
                  />
                </div>
              </div>

              {/* Opening Stock */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text)]">
                  Opening Stock ({customUnit || 'units'})
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0 (starts empty if left blank)"
                  value={customOpeningStock}
                  onChange={(e) =>
                    setCustomOpeningStock(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))
                  }
                  className="h-10 text-xs bg-[var(--surface)] tabular-nums"
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  Recorded as an opening stock restock entry in your ledger.
                </p>
              </div>

              {/* More Options Disclosure */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  {showMoreOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span>{showMoreOptions ? 'Hide options' : 'More options (reorder lead time)'}</span>
                </button>

                {showMoreOptions && (
                  <div className="mt-3 p-3 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface-2)]/50 space-y-2 animate-in fade-in">
                    <label className="text-xs font-semibold text-[var(--text)]">
                      Reorder Lead Time (days)
                    </label>
                    <Input
                      type="number"
                      value={customLeadDays}
                      onChange={(e) => setCustomLeadDays(Math.max(1, parseInt(e.target.value, 10) || 7))}
                      className="h-9 text-xs bg-[var(--surface)] w-32 tabular-nums"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">
                      How many days before stock runs out to flag a critical reorder reminder.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!customName.trim() || addingCustom}
                  className="w-full bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] h-10 font-semibold text-xs"
                >
                  {addingCustom ? 'Adding Item...' : 'Save Custom Item'}
                </Button>
              </div>
            </form>
          )}
        </DrawerContent>
      </Drawer>

      {/* Undo Toast Notification */}
      {undoToast.visible && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-subtle flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text)]">
            <Check className="h-4 w-4 text-[var(--brand)]" />
            <span>{undoToast.message}</span>
          </div>
          <button
            onClick={handleExecuteUndo}
            className="flex items-center gap-1 text-xs font-bold text-[var(--brand)] hover:underline hit-slop"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Undo
          </button>
        </aside>
      )}
    </>
  );
}
