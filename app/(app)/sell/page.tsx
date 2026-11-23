'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney, toMinor } from '@/lib/domain/money';
import { enqueueOfflineSale } from '@/lib/offline/queue';
import { convertBlobTo16kHzWav } from '@/lib/audio/wav';
import { SlidingPill } from '@/components/ui/sliding-pill';
import { useQueryClient } from '@tanstack/react-query';
import { persistQueryCache } from '@/lib/query/cache-persister';
import { useItems, useCustomers } from '@/lib/query/hooks';
import { SellSkeleton } from '@/components/skeletons';
import { PriceSheet } from '@/components/price-sheet';
import { invalidateAfterMutation, optimisticUpdateOnSale } from '@/lib/query/invalidate';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import {
  Pointer,
  Mic,
  Camera,
  Keyboard,
  Undo2,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  ImageUp,
  Check,
  ShoppingBag,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';

interface SelectedItemEntry {
  item: any;
  quantity: number;
}

export default function SellPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'tap' | 'speak' | 'snap' | 'type'>('tap');
  const sellModeRef = useRef<HTMLDivElement>(null);

  const { data: itemsData, isLoading: itemsLoading } = useItems('all');
  const { data: custData } = useCustomers();

  const items = useMemo(() => itemsData?.items || [], [itemsData]);
  const customers = useMemo(() => custData?.customers || [], [custData]);

  // Tap Mode Multi-Select State (Part 4)
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, SelectedItemEntry>>(new Map());
  const [recordSheetOpen, setRecordSheetOpen] = useState(false);
  const [recordPaymentType, setRecordPaymentType] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [recordCustomerId, setRecordCustomerId] = useState<string>('');
  const [recordCustomerName, setRecordCustomerName] = useState<string>('');

  // Undo Toast state
  const [undoBatchId, setUndoBatchId] = useState<string | null>(null);
  const [undoToastVisible, setUndoToastVisible] = useState(false);

  // Set Price Drawer
  const [priceSheetItem, setPriceSheetItem] = useState<any | null>(null);
  const [priceSheetOpen, setPriceSheetOpen] = useState(false);

  const loadingItems = !itemsData && itemsLoading;

  // Type Mode Form
  const [structuredItem, setStructuredItem] = useState('');
  const [structuredQty, setStructuredQty] = useState(1);
  const [structuredPrice, setStructuredPrice] = useState<number | ''>('');
  const [structuredPayment, setStructuredPayment] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [structuredCustomer, setStructuredCustomer] = useState('');

  // AI Free Text / Voice / Snap Confirm Screen State
  const [freeText, setFreeText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseResponse, setParseResponse] = useState<any | null>(null);
  const [confirmRows, setConfirmRows] = useState<any[]>([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceTimer, setVoiceTimer] = useState(0);

  // Remember last used mode
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tallo_sell_mode') as 'tap' | 'speak' | 'snap' | 'type';
      if (saved && ['tap', 'speak', 'snap', 'type'].includes(saved)) {
        setMode(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleModeChange = (newMode: 'tap' | 'speak' | 'snap' | 'type') => {
    setMode(newMode);
    setConfirmRows([]);
    setErrorMessage(null);
    try {
      localStorage.setItem('tallo_sell_mode', newMode);
    } catch {
      // ignore
    }
  };

  // Voice timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recording) {
      interval = setInterval(() => setVoiceTimer((t) => t + 1), 1000);
    } else {
      setVoiceTimer(0);
    }
    return () => clearInterval(interval);
  }, [recording]);

  // Derived selected list & totals
  const selectedList = useMemo(() => Array.from(selectedItemsMap.values()), [selectedItemsMap]);
  const totalSelectedUnits = useMemo(
    () => selectedList.reduce((acc, entry) => acc + entry.quantity, 0),
    [selectedList]
  );
  const totalSelectedAmountMinor = useMemo(
    () =>
      selectedList.reduce(
        (acc, entry) => acc + entry.quantity * (entry.item.sell_price_minor || 0),
        0
      ),
    [selectedList]
  );

  // Tap Mode Multi-Select Handlers
  const handleTileTap = (item: any) => {
    if (Number(item.current_qty) <= 0) return; // Out of stock items cannot be tapped

    const hasPrice = item.sell_price_minor !== null && item.sell_price_minor > 0;
    if (!hasPrice) {
      setPriceSheetItem(item);
      setPriceSheetOpen(true);
      return;
    }

    setSelectedItemsMap((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        // Tapping check or selected tile header deselects if toggled
        next.delete(item.id);
      } else {
        next.set(item.id, { item, quantity: 1 });
      }
      return next;
    });
  };

  const handleIncrement = (itemId: string, maxQty: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemsMap((prev) => {
      const next = new Map(prev);
      const entry = next.get(itemId);
      if (entry) {
        if (entry.quantity < maxQty) {
          next.set(itemId, { ...entry, quantity: entry.quantity + 1 });
        }
      }
      return next;
    });
  };

  const handleDecrement = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemsMap((prev) => {
      const next = new Map(prev);
      const entry = next.get(itemId);
      if (entry) {
        if (entry.quantity <= 1) {
          next.delete(itemId); // Minus at 1 deselects
        } else {
          next.set(itemId, { ...entry, quantity: entry.quantity - 1 });
        }
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedItemsMap(new Map());
  };

  // Record Sale Commit from Sheet
  const handleCommitBatchSale = async () => {
    if (selectedList.length === 0) return;
    setSavingBatch(true);
    setErrorMessage(null);

    const batchId = crypto.randomUUID();

    const saleEntries = selectedList.map((entry) => {
      const unitMinor = entry.item.sell_price_minor || 0;
      const totMinor = entry.quantity * unitMinor;

      return {
        type: 'sale' as const,
        itemId: entry.item.id,
        quantity: entry.quantity,
        unitAmountMinor: unitMinor,
        totalMinor: totMinor,
        paymentType: recordPaymentType,
        customerId: recordPaymentType === 'credit' ? recordCustomerId || null : null,
        customerName: recordPaymentType === 'credit' && !recordCustomerId ? recordCustomerName : null,
        source: 'tap' as const,
        occurredAt: new Date().toISOString(),
      };
    });

    // 1. Optimistically decrement stock in TanStack cache
    queryClient.setQueryData(['items', 'all'], (old: any) => {
      if (!old || !old.items) return old;
      const qtyMap = new Map(selectedList.map((e) => [e.item.id, e.quantity]));
      return {
        ...old,
        items: old.items.map((i: any) => {
          const sold = qtyMap.get(i.id);
          if (sold) {
            return { ...i, current_qty: Math.max(0, Number(i.current_qty) - sold) };
          }
          return i;
        }),
      };
    });

    // 2. Optimistically update dashboard revenue and count in TanStack cache
    optimisticUpdateOnSale(queryClient, {
      totalMinor: totalSelectedAmountMinor,
      paymentType: recordPaymentType,
      isCredit: recordPaymentType === 'credit',
    });

    // Show Undo Toast
    setUndoBatchId(batchId);
    setUndoToastVisible(true);
    setTimeout(() => setUndoToastVisible(false), 8000);

    // Reset selection and close sheet
    setSelectedItemsMap(new Map());
    setRecordSheetOpen(false);

    // Online submission or offline queue
    if (!navigator.onLine) {
      await enqueueOfflineSale({
        batchId,
        entries: saleEntries,
        queuedAt: new Date().toISOString(),
      });
      setSavingBatch(false);
      return;
    }

    try {
      const commitRes = await fetch('/api/entries/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': batchId,
        },
        body: JSON.stringify({ entries: saleEntries }),
      });

      if (!commitRes.ok) {
        const errData = await commitRes.json();
        throw new Error(errData?.error?.message || 'Failed to commit sale batch');
      }
    } catch {
      // If network fails, enqueue offline
      await enqueueOfflineSale({
        batchId,
        entries: saleEntries,
        queuedAt: new Date().toISOString(),
      });
    } finally {
      setSavingBatch(false);
      await invalidateAfterMutation(queryClient, 'commit_sale');
      await persistQueryCache(queryClient);
    }
  };

  // Undo Last Sale
  const handleUndo = async () => {
    if (!undoBatchId) return;
    const batchToVoid = undoBatchId;
    setUndoToastVisible(false);
    setUndoBatchId(null);

    try {
      await fetch(`/api/batches/${batchToVoid}/void`, { method: 'POST' });
    } catch (err) {
      console.error('Undo failed:', err);
    } finally {
      await invalidateAfterMutation(queryClient, 'void');
    }
  };

  // Structured Sale (Type Mode Quick Form)
  const handleStructuredSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structuredItem) return;

    const matched = items.find((i: any) => i.id === structuredItem);
    const unitPriceMinor =
      structuredPrice !== '' ? toMinor(Number(structuredPrice)) : (matched?.sell_price_minor || 0);
    const totalMinor = structuredQty * unitPriceMinor;
    const batchId = crypto.randomUUID();

    const saleEntry = {
      type: 'sale' as const,
      itemId: matched ? matched.id : null,
      newItemName: !matched ? structuredItem : null,
      quantity: structuredQty,
      unitAmountMinor: unitPriceMinor,
      totalMinor,
      paymentType: structuredPayment,
      customerId: structuredPayment === 'credit' && recordCustomerId ? recordCustomerId : null,
      customerName:
        structuredPayment === 'credit'
          ? (recordCustomerId ? customers.find((c: any) => c.id === recordCustomerId)?.name : structuredCustomer)
          : null,
      source: 'text' as const,
      occurredAt: new Date().toISOString(),
    };

    // Optimistically update stock and dashboard
    if (matched) {
      queryClient.setQueryData(['items', 'all'], (old: any) => {
        if (!old || !old.items) return old;
        return {
          ...old,
          items: old.items.map((i: any) =>
            i.id === matched.id ? { ...i, current_qty: Math.max(0, Number(i.current_qty) - structuredQty) } : i
          ),
        };
      });
    }

    optimisticUpdateOnSale(queryClient, {
      totalMinor,
      paymentType: structuredPayment,
      isCredit: structuredPayment === 'credit',
    });

    setUndoBatchId(batchId);
    setUndoToastVisible(true);
    setTimeout(() => setUndoToastVisible(false), 8000);

    try {
      const commitRes = await fetch('/api/entries/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': batchId,
        },
        body: JSON.stringify({ entries: [saleEntry] }),
      });

      if (!commitRes.ok) {
        const errJson = await commitRes.json();
        throw new Error(errJson?.error?.message || 'Failed to commit sale');
      }

      setStructuredItem('');
      setStructuredQty(1);
      setStructuredPrice('');
      setStructuredCustomer('');
      setStructuredPayment('cash');
    } catch {
      await enqueueOfflineSale({
        batchId,
        entries: [saleEntry],
        queuedAt: new Date().toISOString(),
      });
    } finally {
      await invalidateAfterMutation(queryClient, 'commit_sale');
      await persistQueryCache(queryClient);
    }
  };

  // AI Parse Free Text
  const handleParseText = async () => {
    if (!freeText.trim()) return;
    setParsing(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('text', freeText);

    try {
      const res = await fetch('/api/entries/parse', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d?.error?.message || 'Failed to parse text entry');
      }

      const data = await res.json();
      setParseResponse(data);
      setConfirmRows(data.entries || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during parsing.');
    } finally {
      setParsing(false);
    }
  };

  // Voice Recording (Speak Mode)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(chunks, { type: 'audio/webm' });
        await handleAudioProcess(rawBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const handleAudioProcess = async (audioBlob: Blob) => {
    setParsing(true);
    try {
      const wavBlob = await convertBlobTo16kHzWav(audioBlob);
      const formData = new FormData();
      formData.append('audio', wavBlob, 'recording.wav');

      const res = await fetch('/api/entries/parse', { method: 'POST', body: formData });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d?.error?.message || 'Audio parse failed');
      }
      const data = await res.json();
      setParseResponse(data);
      setConfirmRows(data.entries || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Audio processing error.');
    } finally {
      setParsing(false);
    }
  };

  // Image Upload (Snap Mode)
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setErrorMessage(null);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/entries/parse', { method: 'POST', body: formData });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d?.error?.message || 'Image parse failed');
      }
      const data = await res.json();
      setParseResponse(data);
      setConfirmRows(data.entries || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Image reading failed.');
    } finally {
      setParsing(false);
    }
  };

  // Save Confirmed AI Entries
  const handleSaveConfirmed = async () => {
    setSavingBatch(true);
    try {
      const batchId = crypto.randomUUID();
      const entriesToCommit = confirmRows.map((r) => ({
        type: r.type || 'sale',
        itemId: r.matchedItemId || null,
        newItemName: !r.matchedItemId ? r.itemText : null,
        quantity: r.quantity || 1,
        unitAmountMinor: r.unitAmount ? toMinor(r.unitAmount) : 0,
        totalMinor: r.totalAmount ? toMinor(r.totalAmount) : (r.quantity || 1) * (r.unitAmount ? toMinor(r.unitAmount) : 0),
        paymentType: r.paymentType || 'cash',
        customerId: null,
        customerName: r.customerName || null,
        source: parseResponse?.inputKind || 'text',
      }));

      const res = await fetch('/api/entries/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': batchId,
        },
        body: JSON.stringify({ entries: entriesToCommit }),
      });

      if (!res.ok) {
        throw new Error('Failed to commit entries');
      }

      setUndoBatchId(batchId);
      setUndoToastVisible(true);
      setTimeout(() => setUndoToastVisible(false), 8000);

      setConfirmRows([]);
      setParseResponse(null);
      setFreeText('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save entries.');
    } finally {
      setSavingBatch(false);
      await invalidateAfterMutation(queryClient, 'commit_sale');
      await persistQueryCache(queryClient);
    }
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-16">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
          Record Sale
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Select items to sell, or log with voice, receipt photo, or type
        </p>
      </div>

      {/* Undo Toast */}
      {undoToastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-md bg-[var(--text)] px-4 py-2.5 text-[var(--bg)] shadow-lg animate-in slide-in-from-bottom duration-200 border border-[var(--border)] text-xs font-medium"
        >
          <span>Sale recorded successfully</span>
          <Button size="sm" variant="secondary" onClick={handleUndo} className="h-7 gap-1 text-xs font-semibold">
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
        </div>
      )}

      {/* Mode Selector Tabs with Sliding Pill (Segmented Control) */}
      <div ref={sellModeRef} className="relative flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-1">
        <SlidingPill activeId={mode} containerRef={sellModeRef} pillClassName="bg-[var(--surface)] shadow-subtle" />
        {[
          { id: 'tap', label: 'Tap', icon: Pointer },
          { id: 'speak', label: 'Speak', icon: Mic },
          { id: 'snap', label: 'Snap', icon: Camera },
          { id: 'type', label: 'Type', icon: Keyboard },
        ].map((m) => {
          const Icon = m.icon;
          const isSelected = mode === m.id;
          return (
            <button
              key={m.id}
              data-pill-id={m.id}
              onPointerDown={() => handleModeChange(m.id as any)}
              onClick={() => handleModeChange(m.id as any)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold rounded-sm transition-colors ${
                isSelected
                  ? 'text-[var(--brand)] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      {errorMessage && (
        <div className="rounded-md bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger)] border border-[var(--danger)]/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loadingItems ? (
        <SellSkeleton />
      ) : (
        <>
          {/* 1. TAP MODE (Multi-Select with Tile Steppers & Bottom Summary Bar - Part 4) */}
          {mode === 'tap' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {items.map((item: any) => {
                  const selection = selectedItemsMap.get(item.id);
                  const isSelected = !!selection;
                  const hasPrice = item.sell_price_minor !== null && item.sell_price_minor > 0;
                  const isOutOfStock = Number(item.current_qty) <= 0;
                  const availableQty = Number(item.current_qty) || 0;

                  if (isOutOfStock) {
                    return (
                      <div
                        key={item.id}
                        className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 flex flex-col justify-between min-h-[104px] opacity-70 cursor-not-allowed select-none"
                      >
                        <div>
                          <div className="font-semibold text-[var(--text-muted)] line-clamp-1 text-xs">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-[var(--danger)] font-semibold mt-0.5">
                            Out of stock
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-[var(--border)]/40">
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {hasPrice ? formatMoney(item.sell_price_minor) : 'No price'}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--warning)] border border-[var(--warning)]/50 px-1.5 py-0.5 rounded">
                            Out
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => handleTileTap(item)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          handleTileTap(item);
                        }
                      }}
                      data-item-tile="true"
                      className={`relative rounded-[var(--r-md)] border p-3 flex flex-col justify-between min-h-[104px] cursor-pointer transition-all hit-slop select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
                        !hasPrice
                          ? 'border-[var(--warning)]/60 bg-[var(--accent-soft)]/20 hover:bg-[var(--accent-soft)]/30'
                          : isSelected
                          ? 'border-[var(--brand)] bg-[var(--brand-soft)]/20 ring-1 ring-[var(--brand)]'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)]/50'
                      }`}
                    >
                      {/* Top Header: Name & Selection Indicator */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-[var(--text)] line-clamp-1">{item.name}</div>
                          <div className="text-[11px] text-[var(--text-muted)] tabular-nums mt-0.5">
                            {availableQty} {item.unit} left
                            {selection && selection.quantity >= availableQty && (
                              <span className="text-[10px] text-[var(--warning)] ml-1 font-semibold">
                                (Max)
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTileTap(item); // Deselect
                            }}
                            title="Deselect item"
                            className="w-5 h-5 rounded-full bg-[var(--brand)] text-[var(--on-brand)] flex items-center justify-center shrink-0 shadow-xs"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer: Price & Quantity Stepper */}
                      <div className="mt-2 flex items-center justify-between pt-1 border-t border-[var(--border)]/40">
                        {hasPrice ? (
                          <div className="font-bold text-xs text-[var(--brand)] tabular-nums">
                            {formatMoney(item.sell_price_minor)}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-[var(--warning)] border border-[var(--warning)]/60 bg-[var(--surface)] px-1.5 py-0.5 rounded">
                            Set price
                          </span>
                        )}

                        {isSelected ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center rounded border border-[var(--brand)]/40 bg-[var(--surface)] overflow-hidden shadow-xs"
                          >
                            <button
                              type="button"
                              onClick={(e) => handleDecrement(item.id, e)}
                              aria-label={`Decrease ${item.name} quantity`}
                              className="px-2 py-1 text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors hit-slop"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-1.5 font-bold text-xs text-[var(--text)] tabular-nums min-w-[20px] text-center">
                              {selection.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={selection.quantity >= availableQty}
                              onClick={(e) => handleIncrement(item.id, availableQty, e)}
                              aria-label={`Increase ${item.name} quantity`}
                              className="px-2 py-1 text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-30 transition-colors hit-slop"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add Item Tile */}
                <div
                  onClick={() => window.dispatchEvent(new CustomEvent('tallo-open-add-item'))}
                  className="rounded-[var(--r-md)] border border-dashed border-[var(--border)] hover:border-[var(--brand)] p-3 flex flex-col items-center justify-center gap-1.5 min-h-[104px] cursor-pointer transition-colors bg-[var(--surface)]/50 hover:bg-[var(--brand-soft)]/20"
                >
                  <div className="h-7 w-7 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--brand)]">
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--brand)]">+ Add item</span>
                </div>
              </div>

              {/* Sticky Bottom Summary Bar (Part 4) */}
              <div
                aria-live="polite"
                className={`fixed bottom-16 sm:bottom-0 left-0 right-0 sm:left-64 z-20 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 py-3 shadow-lg transition-transform duration-200 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] ${
                  selectedList.length > 0 ? 'translate-y-0' : 'translate-y-full pointer-events-none'
                }`}
              >
                <div className="max-w-[1000px] mx-auto flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display font-bold text-sm sm:text-base text-[var(--text)] tabular-nums">
                      {totalSelectedUnits} {totalSelectedUnits === 1 ? 'item' : 'items'}, {formatMoney(totalSelectedAmountMinor)}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {selectedList.length} distinct product{selectedList.length === 1 ? '' : 's'} selected
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setRecordSheetOpen(true)}
                      className="bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] font-semibold text-xs gap-1.5 shadow-sm px-4 h-9"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Record sale
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SPEAK MODE (Voice AI) */}
          {mode === 'speak' && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand-soft)]/50">
                <Mic className={`h-10 w-10 text-[var(--brand)] ${recording ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text)]">Record voice note</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Speak your sale — e.g. &ldquo;Sold 2 packs of Indomie for ₦400 cash and 1 Gala to Chinedu on credit&rdquo;
                </p>
                {recording && (
                  <p className="text-xs font-semibold text-[var(--brand)] mt-2 tabular-nums">
                    Recording: {voiceTimer}s
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-3">
                {!recording ? (
                  <Button onClick={startRecording} className="gap-2 text-xs font-semibold">
                    <Mic className="h-4 w-4" /> Start Recording
                  </Button>
                ) : (
                  <Button variant="outline" onClick={stopRecording} className="gap-2 text-xs text-[var(--danger)] border-[var(--danger)]">
                    Stop &amp; Process
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 3. SNAP MODE (Receipt / Photo AI) */}
          {mode === 'snap' && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand-soft)]/50">
                <Camera className="h-10 w-10 text-[var(--brand)]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text)]">Photograph receipt or sales book</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Snap a note or ledger — take a photo of your paper sales log or handwritten receipt
                </p>
              </div>
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-[var(--on-brand)] shadow-sm hover:bg-[var(--brand-hover)] transition-colors">
                    <ImageUp className="h-4 w-4" /> Choose or Take Photo
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageCapture}
                  />
                </label>
              </div>
            </div>
          )}

          {/* 4. TYPE MODE (Structured Form with Accessible Selects - Part 3 & 5) */}
          {mode === 'type' && (
            <div className="space-y-6">
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5 shadow-subtle space-y-4">
                <div>
                  <h3 className="font-bold text-[var(--text)] text-sm sm:text-base">Structured Quick Sale</h3>
                  <p className="text-xs text-[var(--text-muted)]">Enter a single transaction with full keyboard support</p>
                </div>

                <form onSubmit={handleStructuredSale} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-muted)]">Select Item</label>
                      <div className="mt-1">
                        <Combobox
                          value={structuredItem}
                          onChange={(val) => {
                            setStructuredItem(val);
                            const itm = items.find((i: any) => i.id === val);
                            if (itm) {
                              setStructuredPrice(itm.sell_price_minor ? itm.sell_price_minor / 100 : 0);
                            }
                          }}
                          placeholder="Choose item..."
                          searchPlaceholder="Search items..."
                          options={items.map((i: any) => ({
                            value: i.id,
                            label: `${i.name} (${formatMoney(i.sell_price_minor)})`,
                            description: `Stock: ${i.current_qty} ${i.unit}`,
                          }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[var(--text-muted)]">Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        value={structuredQty}
                        onChange={(e) => setStructuredQty(Math.max(1, parseFloat(e.target.value) || 1))}
                        className="mt-1 tabular-nums h-9 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-muted)]">Unit Price (₦)</label>
                      <Input
                        type="number"
                        placeholder="Unit price in NGN"
                        value={structuredPrice}
                        onChange={(e) => setStructuredPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        className="mt-1 tabular-nums h-9 text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[var(--text-muted)]">Payment Type</label>
                      <div className="mt-1">
                        <Select
                          value={structuredPayment}
                          onValueChange={(val) => setStructuredPayment(val as any)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Payment type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="transfer">Bank Transfer</SelectItem>
                            <SelectItem value="credit">Credit Sale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {structuredPayment === 'credit' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--text-muted)]">Customer Record</label>
                      <Combobox
                        value={recordCustomerId}
                        onChange={setRecordCustomerId}
                        placeholder="Select customer..."
                        searchPlaceholder="Search customers..."
                        options={customers.map((c: any) => ({
                          value: c.id,
                          label: c.name,
                          description: c.phone || 'Customer',
                        }))}
                      />
                      {!recordCustomerId && (
                        <Input
                          placeholder="Or type new customer name"
                          value={structuredCustomer}
                          onChange={(e) => setStructuredCustomer(e.target.value)}
                          className="mt-2 text-xs h-9"
                        />
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button type="submit" className="w-full sm:w-auto text-xs font-semibold gap-1.5 h-9">
                      <Plus className="h-4 w-4" /> Record Sale
                    </Button>
                  </div>
                </form>
              </div>

              {/* Free Text AI Parser */}
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5 shadow-subtle space-y-3">
                <div>
                  <h3 className="font-bold text-[var(--text)] text-xs sm:text-sm">Natural Language Sale Entry</h3>
                  <p className="text-xs text-[var(--text-muted)]">Type anything like &ldquo;sold 3 gala and 2 indomie onion for 900 cash&rdquo;</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Describe transaction... e.g. 3 Indomie 500 cash"
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleParseText();
                      }
                    }}
                    className="flex-1 text-xs h-9"
                  />
                  <Button
                    onClick={handleParseText}
                    disabled={parsing || !freeText.trim()}
                    className="text-xs font-semibold h-9"
                  >
                    {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Parse'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Record Sale Drawer (Multi-select Sheet - Part 4) */}
      <Drawer open={recordSheetOpen} onOpenChange={setRecordSheetOpen}>
        <DrawerContent className="max-h-[85vh] bg-[var(--surface)] text-[var(--text)]">
          <DrawerHeader className="border-b border-[var(--border)] pb-3">
            <DrawerTitle className="text-base font-bold">Complete Sale</DrawerTitle>
            <DrawerDescription className="text-xs text-[var(--text-muted)]">
              Confirm payment method and review line items before committing.
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 overflow-y-auto space-y-4 max-h-[50vh]">
            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text)]">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'transfer', 'credit'] as const).map((pType) => (
                  <button
                    key={pType}
                    type="button"
                    onClick={() => setRecordPaymentType(pType)}
                    className={`py-2 px-3 text-xs font-semibold rounded-[var(--r-sm)] border capitalize transition-colors ${
                      recordPaymentType === pType
                        ? 'border-[var(--brand)] bg-[var(--brand-soft)]/40 text-[var(--brand)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    {pType}
                  </button>
                ))}
              </div>
            </div>

            {/* Credit Customer Selector */}
            {recordPaymentType === 'credit' && (
              <div className="space-y-2 border-t border-[var(--border)] pt-3">
                <label className="text-xs font-semibold text-[var(--text)]">Customer</label>
                <Combobox
                  value={recordCustomerId}
                  onChange={setRecordCustomerId}
                  placeholder="Select customer..."
                  searchPlaceholder="Search customers..."
                  options={customers.map((c: any) => ({
                    value: c.id,
                    label: c.name,
                    description: c.phone || 'Customer',
                  }))}
                />
                {!recordCustomerId && (
                  <Input
                    placeholder="Or enter new customer name"
                    value={recordCustomerName}
                    onChange={(e) => setRecordCustomerName(e.target.value)}
                    className="h-9 text-xs"
                  />
                )}
              </div>
            )}

            {/* Line Items List */}
            <div className="space-y-2 border-t border-[var(--border)] pt-3">
              <label className="text-xs font-semibold text-[var(--text)]">Line Items</label>
              <div className="divide-y divide-[var(--border)] rounded-[var(--r-sm)] border border-[var(--border)] overflow-hidden">
                {selectedList.map((entry) => {
                  const lineTotal = entry.quantity * (entry.item.sell_price_minor || 0);
                  return (
                    <div key={entry.item.id} className="p-2.5 flex items-center justify-between text-xs bg-[var(--surface)]">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-semibold text-[var(--text)] truncate">{entry.item.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                          {formatMoney(entry.item.sell_price_minor)} each
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center border border-[var(--border)] rounded bg-[var(--surface-2)]">
                          <button
                            type="button"
                            onClick={(e) => handleDecrement(entry.item.id, e)}
                            className="px-2 py-0.5 text-[var(--text)]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-bold tabular-nums text-xs">{entry.quantity}</span>
                          <button
                            type="button"
                            disabled={entry.quantity >= (Number(entry.item.current_qty) || 0)}
                            onClick={(e) => handleIncrement(entry.item.id, Number(entry.item.current_qty) || 0, e)}
                            className="px-2 py-0.5 text-[var(--text)] disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="font-bold text-[var(--text)] tabular-nums min-w-[60px] text-right">
                          {formatMoney(lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Row */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] font-display">
              <span className="font-bold text-sm text-[var(--text)]">Total</span>
              <span className="font-bold text-base text-[var(--brand)] tabular-nums">
                {formatMoney(totalSelectedAmountMinor)}
              </span>
            </div>
          </div>

          <DrawerFooter className="border-t border-[var(--border)] pt-3 flex flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRecordSheetOpen(false)}
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={savingBatch || selectedList.length === 0}
              onClick={handleCommitBatchSale}
              className="flex-1 bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] text-xs font-semibold gap-1.5"
            >
              {savingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirm Sale • {formatMoney(totalSelectedAmountMinor)}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Confirmed AI Review Drawer (Voice / Photo parser results) */}
      <Drawer open={confirmRows.length > 0} onOpenChange={(open) => !open && setConfirmRows([])}>
        <DrawerContent className="max-h-[85vh] bg-[var(--surface)] text-[var(--text)]">
          <DrawerHeader className="border-b border-[var(--border)] pb-3">
            <DrawerTitle className="text-base font-bold">Confirm Entries</DrawerTitle>
            <DrawerDescription className="text-xs text-[var(--text-muted)]">
              Verify detected items and prices before logging.
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 overflow-y-auto space-y-3 max-h-[50vh]">
            {confirmRows.map((row, idx) => (
              <div key={idx} className="rounded border border-[var(--border)] p-3 bg-[var(--surface-2)]/30 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)]">Item</label>
                    <div className="mt-1">
                      <Combobox
                        value={row.matchedItemId || ''}
                        onChange={(val) => {
                          const next = [...confirmRows];
                          next[idx].matchedItemId = val || null;
                          setConfirmRows(next);
                        }}
                        placeholder={row.itemText || 'Select matched item'}
                        options={items.map((i: any) => ({
                          value: i.id,
                          label: i.name,
                          description: formatMoney(i.sell_price_minor),
                        }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)]">Quantity</label>
                    <Input
                      type="number"
                      value={row.quantity || 1}
                      onChange={(e) => {
                        const next = [...confirmRows];
                        next[idx].quantity = parseFloat(e.target.value) || 1;
                        setConfirmRows(next);
                      }}
                      className="mt-1 h-9 text-xs tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)]">Unit Price (₦)</label>
                    <Input
                      type="number"
                      value={row.unitAmount || 0}
                      onChange={(e) => {
                        const next = [...confirmRows];
                        next[idx].unitAmount = parseFloat(e.target.value) || 0;
                        setConfirmRows(next);
                      }}
                      className="mt-1 h-9 text-xs tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)]">Payment</label>
                    <div className="mt-1">
                      <Select
                        value={row.paymentType || 'cash'}
                        onValueChange={(val) => {
                          const next = [...confirmRows];
                          next[idx].paymentType = val;
                          setConfirmRows(next);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Payment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="transfer">Bank Transfer</SelectItem>
                          <SelectItem value="credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {row.paymentType === 'credit' && (
                  <div className="mt-2">
                    <label className="text-[11px] font-semibold text-[var(--text-muted)]">Customer Name</label>
                    <Input
                      type="text"
                      value={row.customerName || ''}
                      onChange={(e) => {
                        const next = [...confirmRows];
                        next[idx].customerName = e.target.value;
                        setConfirmRows(next);
                      }}
                      placeholder="Customer name"
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <DrawerFooter className="border-t border-[var(--border)] pt-3 flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmRows([])}
              className="flex-1 text-xs"
            >
              Discard
            </Button>
            <Button
              disabled={savingBatch}
              onClick={handleSaveConfirmed}
              className="flex-1 bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] text-xs font-semibold"
            >
              {savingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save All Confirmed'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Set Price Sheet for unpriced items */}
      <PriceSheet
        item={priceSheetItem}
        open={priceSheetOpen}
        onOpenChange={setPriceSheetOpen}
        onPriceSet={async () => {
          await queryClient.invalidateQueries({ queryKey: ['items'] });
        }}
      />
    </div>
  );
}
