'use client';

import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';

export default function SellPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'tap' | 'speak' | 'snap' | 'type'>('tap');
  const sellModeRef = useRef<HTMLDivElement>(null);

  const { data: itemsData, isLoading: itemsLoading } = useItems('all');
  const { data: custData } = useCustomers();

  const [items, setItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Tap Mode State
  const [selectedTapItem, setSelectedTapItem] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCredit, setIsCredit] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [undoBatchId, setUndoBatchId] = useState<string | null>(null);
  const [undoToastVisible, setUndoToastVisible] = useState(false);
  const [lastSoldItem, setLastSoldItem] = useState<{ id: string; qty: number } | null>(null);

  useEffect(() => {
    if (itemsData?.items) {
      setItems(itemsData.items);
      setSelectedTapItem((prev: any) => prev || itemsData.items[0] || null);
    }
  }, [itemsData]);

  useEffect(() => {
    if (custData?.customers) {
      setCustomers(custData.customers);
    }
  }, [custData]);

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
  const [successAnimation, setSuccessAnimation] = useState(false);

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

  // Handle Tap Sale
  const handleTapSale = async () => {
    if (!selectedTapItem) return;

    const unitPriceMinor = selectedTapItem.sell_price_minor || 0;
    const totalMinor = quantity * unitPriceMinor;
    const batchId = crypto.randomUUID();

    const saleEntry = {
      type: 'sale' as const,
      itemId: selectedTapItem.id,
      quantity,
      unitAmountMinor: unitPriceMinor,
      totalMinor,
      paymentType: isCredit ? ('credit' as const) : ('cash' as const),
      customerId: isCredit ? selectedCustomer?.id : null,
      customerName: isCredit && !selectedCustomer ? newCustomerName : null,
      source: 'tap' as const,
      occurredAt: new Date().toISOString(),
    };

    // Optimistically update stock
    setLastSoldItem({ id: selectedTapItem.id, qty: quantity });
    setItems((prev) =>
      prev.map((i) =>
        i.id === selectedTapItem.id
          ? { ...i, current_qty: (Number(i.current_qty) || 0) - quantity }
          : i
      )
    );

    // Peak-end moment animation & Undo Toast
    setSuccessAnimation(true);
    setTimeout(() => setSuccessAnimation(false), 600);
    setUndoBatchId(batchId);
    setUndoToastVisible(true);
    setTimeout(() => setUndoToastVisible(false), 8000);

    // Submit online or queue offline
    if (!navigator.onLine) {
      await enqueueOfflineSale({
        batchId,
        entries: [saleEntry],
        queuedAt: new Date().toISOString(),
      });
      return;
    }

    try {
      const commitRes = await fetch('/api/entries/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': batchId,
        },
        body: JSON.stringify({ entries: [saleEntry] }),
      });
      if (commitRes.ok) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['items'] }),
          queryClient.invalidateQueries({ queryKey: ['entries'] }),
          queryClient.invalidateQueries({ queryKey: ['customers'] }),
        ]);
        await persistQueryCache(queryClient);
      }
    } catch {
      await enqueueOfflineSale({
        batchId,
        entries: [saleEntry],
        queuedAt: new Date().toISOString(),
      });
    }
  };

  // Undo Last Sale
  const handleUndo = async () => {
    if (!undoBatchId) return;
    const batchToVoid = undoBatchId;
    setUndoToastVisible(false);
    setUndoBatchId(null);
    if (lastSoldItem) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === lastSoldItem.id ? { ...i, current_qty: (Number(i.current_qty) || 0) + lastSoldItem.qty } : i
        )
      );
      setLastSoldItem(null);
    }
    try {
      const res = await fetch(`/api/batches/${batchToVoid}/void`, { method: 'POST' });
      if (res.ok) {
        const itemsRes = await fetch('/api/items');
        if (itemsRes.ok) {
          const d = await itemsRes.json();
          setItems(d.items || []);
        }
      }
    } catch (err) {
      console.error('Undo failed:', err);
    }
  };

  // Structured Sale (Type Mode Quick Form)
  const handleStructuredSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structuredItem) return;

    const matched = items.find((i) => i.id === structuredItem);
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
      customerId: structuredPayment === 'credit' && selectedCustomer ? selectedCustomer.id : null,
      customerName:
        structuredPayment === 'credit'
          ? (selectedCustomer ? selectedCustomer.name : structuredCustomer)
          : null,
      source: 'text' as const,
      occurredAt: new Date().toISOString(),
    };

    if (matched) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === matched.id ? { ...i, current_qty: (Number(i.current_qty) || 0) - structuredQty } : i
        )
      );
    }

    setSuccessAnimation(true);
    setTimeout(() => setSuccessAnimation(false), 600);
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
      if (commitRes.ok) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['items'] }),
          queryClient.invalidateQueries({ queryKey: ['entries'] }),
          queryClient.invalidateQueries({ queryKey: ['customers'] }),
        ]);
        await persistQueryCache(queryClient);
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

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['items'] }),
        queryClient.invalidateQueries({ queryKey: ['entries'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
      ]);
      await persistQueryCache(queryClient);

      setSuccessAnimation(true);
      setTimeout(() => setSuccessAnimation(false), 600);
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
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
          Record Sale
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Log sales quickly with tap, voice, receipt photo, or quick entry
        </p>
      </div>

      {/* Undo Toast */}
      {undoToastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-md bg-text px-4 py-3 text-surface shadow-subtle animate-in slide-in-from-bottom duration-200"
        >
          <span className="text-sm font-medium">Sale recorded successfully</span>
          <Button size="sm" variant="secondary" onClick={handleUndo} className="h-7 gap-1 text-xs font-semibold">
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
        </div>
      )}

      {/* Mode Selector Tabs with Sliding Pill (Segmented Control) */}
      <div ref={sellModeRef} className="relative flex rounded-md border border-border bg-surface-2 p-1">
        <SlidingPill activeId={mode} containerRef={sellModeRef} pillClassName="bg-surface shadow-subtle" />
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
                  ? 'text-brand font-bold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Icon className="h-4 w-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      {errorMessage && (
        <div className="rounded-md bg-danger-soft p-3 text-sm text-danger border border-danger/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loadingItems ? (
        <SellSkeleton />
      ) : (
        <>
          {/* 1. TAP MODE (Default, Fast Path) */}
          {mode === 'tap' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.slice(0, 16).map((item) => {
                  const isSelected = selectedTapItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedTapItem(item)}
                      className={`cursor-pointer rounded-md border p-3.5 text-left transition-all duration-120 ${
                        isSelected
                          ? 'border-brand bg-brand-soft/30 shadow-subtle ring-1 ring-brand'
                          : 'border-border bg-surface hover:border-brand/40'
                      }`}
                    >
                      <div className="font-semibold text-text line-clamp-1 text-sm">{item.name}</div>
                      <div className="mt-1 font-bold text-brand text-sm tabular-nums">
                        {formatMoney(item.sell_price_minor)}
                      </div>
                      <div className="mt-1 text-xs text-text-muted tabular-nums">
                        Stock: {item.current_qty} {item.unit}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedTapItem && (
                <div className="rounded-md border border-border bg-surface p-5 shadow-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-text text-base sm:text-lg">{selectedTapItem.name}</h3>
                      <div className="text-xs text-text-muted tabular-nums">
                        {formatMoney(selectedTapItem.sell_price_minor)} / {selectedTapItem.unit}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center border border-border rounded-sm bg-surface-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        aria-label="Decrease quantity"
                        className="hit-slop p-2 hover:bg-border text-text transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-bold text-sm tabular-nums text-text">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        aria-label="Increase quantity"
                        className="hit-slop p-2 hover:bg-border text-text transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Credit Toggle */}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-medium text-text">Sell on Credit</span>
                    <input
                      type="checkbox"
                      checked={isCredit}
                      onChange={(e) => setIsCredit(e.target.checked)}
                      className="h-4 w-4 rounded-sm text-brand accent-brand cursor-pointer"
                    />
                  </div>

                  {isCredit && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <label className="text-xs font-semibold text-text-muted uppercase">Customer</label>
                      <select
                        onChange={(e) => {
                          const cust = customers.find((c) => c.id === e.target.value);
                          setSelectedCustomer(cust || null);
                        }}
                        className="w-full rounded-sm border border-border bg-surface p-2 text-sm text-text"
                      >
                        <option value="">Select customer or enter new below</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {!selectedCustomer && (
                        <Input
                          placeholder="Or enter new customer name"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                        />
                      )}
                    </div>
                  )}

                  <Button
                    size="lg"
                    onClick={handleTapSale}
                    className="w-full text-base font-bold tabular-nums"
                  >
                    Confirm Sale • {formatMoney((selectedTapItem.sell_price_minor || 0) * quantity)}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 2. SPEAK MODE */}
          {mode === 'speak' && confirmRows.length === 0 && (
            <div className="rounded-md border border-border bg-surface p-8 text-center shadow-subtle space-y-4">
              <div
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full transition-transform ${
                  recording ? 'bg-danger-soft text-danger animate-pulse scale-105' : 'bg-brand-soft text-brand'
                }`}
              >
                <Mic className="h-9 w-9" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-text">
                  {recording ? `Listening… (${voiceTimer}s)` : 'Record voice note'}
                </h2>
                <p className="mt-1 text-xs text-text-muted max-w-sm mx-auto">
                  Say your sales in English, Nigerian Pidgin, or mixed: &quot;Sell 2 Indomie 500 each and 1 peak milk&quot;.
                </p>
              </div>

              <div className="pt-2">
                {!recording ? (
                  <Button size="lg" onClick={startRecording} disabled={parsing} className="gap-2">
                    <Mic className="h-4 w-4" /> Start Recording (Max 60s)
                  </Button>
                ) : (
                  <Button size="lg" variant="destructive" onClick={stopRecording} className="gap-2">
                    Stop & Parse Recording
                  </Button>
                )}
              </div>

              {parsing && (
                <div className="text-xs text-text-muted flex items-center justify-center gap-2 pt-2">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  <span>Listening… → Reading… → Done</span>
                </div>
              )}
            </div>
          )}

          {/* 3. SNAP MODE */}
          {mode === 'snap' && confirmRows.length === 0 && (
            <div className="rounded-md border border-border bg-surface p-8 text-center shadow-subtle space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Camera className="h-9 w-9" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-text">Photograph receipt or sales book</h2>
                <p className="mt-1 text-xs text-text-muted max-w-sm mx-auto">
                  Take a clear picture of handwritten sales notes, notebooks, or receipts.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-on-brand shadow-subtle hover:bg-brand-hover transition-colors">
                  <Camera className="mr-2 h-4 w-4" /> Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageCapture}
                    className="hidden"
                  />
                </label>
                <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-semibold text-text hover:bg-surface-2 transition-colors">
                  <ImageUp className="mr-2 h-4 w-4 text-text-muted" /> Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageCapture}
                    className="hidden"
                  />
                </label>
              </div>

              {parsing && (
                <div className="text-xs text-text-muted flex items-center justify-center gap-2 pt-2">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  <span>Reading your note with Gemini...</span>
                </div>
              )}
            </div>
          )}

          {/* 4. TYPE MODE */}
          {mode === 'type' && confirmRows.length === 0 && (
            <div className="space-y-6">
              {/* Structured Quick Sale Form (Section 8.1) */}
              <div className="rounded-md border border-border bg-surface p-5 shadow-subtle space-y-4">
                <div>
                  <h3 className="font-bold text-text text-base">Structured Quick Sale</h3>
                  <p className="text-xs text-text-muted">Enter a single structured transaction quickly</p>
                </div>

                <form onSubmit={handleStructuredSale} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-text-muted">Select Item</label>
                      <select
                        value={structuredItem}
                        onChange={(e) => {
                          const id = e.target.value;
                          setStructuredItem(id);
                          const itm = items.find((i) => i.id === id);
                          if (itm) {
                            setStructuredPrice(itm.sell_price_minor ? itm.sell_price_minor / 100 : 0);
                          }
                        }}
                        className="mt-1 w-full rounded-sm border border-border bg-surface p-2 text-sm text-text"
                        required
                      >
                        <option value="">Choose item...</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({formatMoney(i.sell_price_minor)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-muted">Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        value={structuredQty}
                        onChange={(e) => setStructuredQty(Math.max(1, parseFloat(e.target.value) || 1))}
                        className="mt-1 tabular-nums"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-text-muted">Unit Price (NGN)</label>
                      <Input
                        type="number"
                        placeholder="Unit price in NGN"
                        value={structuredPrice}
                        onChange={(e) => setStructuredPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        className="mt-1 tabular-nums"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-muted">Payment Type</label>
                      <select
                        value={structuredPayment}
                        onChange={(e) => setStructuredPayment(e.target.value as any)}
                        className="mt-1 w-full rounded-sm border border-border bg-surface p-2 text-sm text-text"
                      >
                        <option value="cash">Cash</option>
                        <option value="transfer">Bank Transfer</option>
                        <option value="credit">Credit Sale</option>
                      </select>
                    </div>
                  </div>

                  {structuredPayment === 'credit' && (
                    <div>
                      <label className="text-xs font-semibold text-text-muted">Customer Name</label>
                      <Input
                        placeholder="Enter customer name"
                        value={structuredCustomer}
                        onChange={(e) => setStructuredCustomer(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full font-bold" disabled={!structuredItem}>
                    Record Sale
                  </Button>
                </form>
              </div>

              {/* Free Text AI Parse */}
              <div className="rounded-md border border-border bg-surface p-5 shadow-subtle space-y-3">
                <h3 className="font-semibold text-text text-sm">Free Text Quick Parse</h3>
                <p className="text-xs text-text-muted">
                  Or type naturally: &quot;2 rice 5k credit Mama Ngozi&quot;
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 3 Indomie 1500 cash, 1 Peak milk 600"
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                  />
                  <Button onClick={handleParseText} disabled={parsing || !freeText.trim()} className="font-semibold">
                    {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Parse'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* CONFIRM SCREEN / BOTTOM SHEET (For Voice, Snap, and Free Text via Vaul Drawer) */}
      <Drawer
        open={confirmRows.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmRows([]);
            setParseResponse(null);
          }
        }}
      >
        <DrawerContent className="max-w-2xl mx-auto">
          <DrawerHeader>
            <DrawerTitle>Confirm Entries</DrawerTitle>
            {parseResponse?.transcript && (
              <DrawerDescription className="mt-1 text-xs italic bg-surface-2 p-2 rounded-sm border border-border">
                &ldquo;{parseResponse.transcript}&rdquo;
              </DrawerDescription>
            )}
          </DrawerHeader>

          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto">
            {confirmRows.map((row, idx) => (
              <div key={idx} className="rounded-sm border border-border p-3 bg-surface-2/40 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted">Item Matched</label>
                    <select
                      value={row.matchedItemId || ''}
                      onChange={(e) => {
                        const next = [...confirmRows];
                        next[idx].matchedItemId = e.target.value || null;
                        setConfirmRows(next);
                      }}
                      className="mt-1 w-full rounded-sm border border-border bg-surface p-1.5 text-xs text-text"
                    >
                      <option value="">{row.itemText || 'Select matched item'}</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-muted">Quantity</label>
                    <Input
                      type="number"
                      value={row.quantity || 1}
                      onChange={(e) => {
                        const next = [...confirmRows];
                        next[idx].quantity = parseFloat(e.target.value) || 1;
                        setConfirmRows(next);
                      }}
                      className="mt-1 h-8 text-xs tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-muted">Unit Price (NGN)</label>
                    <Input
                      type="number"
                      value={row.unitAmount || 0}
                      onChange={(e) => {
                        const next = [...confirmRows];
                        next[idx].unitAmount = parseFloat(e.target.value) || 0;
                        setConfirmRows(next);
                      }}
                      className="mt-1 h-8 text-xs tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-muted">Payment Type</label>
                    <select
                      value={row.paymentType || 'cash'}
                      onChange={(e) => {
                        const next = [...confirmRows];
                        next[idx].paymentType = e.target.value;
                        setConfirmRows(next);
                      }}
                      className="mt-1 w-full rounded-sm border border-border bg-surface p-1.5 text-xs text-text"
                    >
                      <option value="cash">Cash</option>
                      <option value="transfer">Bank Transfer</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                </div>

                {row.paymentType === 'credit' && (
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted">Customer Name</label>
                    <Input
                      placeholder="Customer name"
                      value={row.customerName || ''}
                      onChange={(e) => {
                        const next = [...confirmRows];
                        next[idx].customerName = e.target.value;
                        setConfirmRows(next);
                      }}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <DrawerFooter className="flex-row justify-end gap-2.5 pt-3">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmRows([]);
                setParseResponse(null);
              }}
            >
              Discard
            </Button>
            <Button onClick={handleSaveConfirmed} disabled={savingBatch} className="font-bold">
              {savingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save All Confirmed
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* One-time Peak-end celebration check overlay */}
      {successAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-on-brand shadow-subtle animate-in zoom-in duration-200">
            <Check className="h-8 w-8 stroke-[3]" />
          </div>
        </div>
      )}
    </div>
  );
}
