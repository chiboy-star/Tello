import { get, set, del } from 'idb-keyval';

export interface QueuedSale {
  batchId: string;
  entries: Array<{
    type: 'sale';
    itemId?: string | null;
    newItemName?: string | null;
    quantity: number;
    unitAmountMinor: number;
    totalMinor: number;
    paymentType: 'cash' | 'transfer' | 'credit';
    customerId?: string | null;
    customerName?: string | null;
    source: 'tap' | 'text' | 'voice' | 'image' | 'bot';
    occurredAt: string;
  }>;
  queuedAt: string;
}

const QUEUE_KEY = 'tallo_offline_sales_queue';

export async function getOfflineQueue(): Promise<QueuedSale[]> {
  try {
    const queue = await get<QueuedSale[]>(QUEUE_KEY);
    return queue || [];
  } catch {
    return [];
  }
}

export async function enqueueOfflineSale(sale: QueuedSale): Promise<void> {
  const queue = await getOfflineQueue();
  queue.push(sale);
  await set(QUEUE_KEY, queue);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('tallo-queue-updated'));
  }
}

export async function flushOfflineQueue(): Promise<{ flushed: number; failed: number }> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return { flushed: 0, failed: 0 };

  const remaining: QueuedSale[] = [];
  let flushed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const res = await fetch('/api/entries/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': item.batchId,
        },
        body: JSON.stringify({ entries: item.entries }),
      });

      if (res.ok) {
        flushed += 1;
      } else {
        remaining.push(item);
        failed += 1;
      }
    } catch {
      remaining.push(item);
      failed += 1;
    }
  }

  if (remaining.length === 0) {
    await del(QUEUE_KEY);
  } else {
    await set(QUEUE_KEY, remaining);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('tallo-queue-updated'));
  }

  return { flushed, failed };
}
