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
const ATTENTION_KEY = 'tallo_offline_needs_attention';

export interface NeedsAttentionSale {
  batchId: string;
  sale: QueuedSale;
  reason: string;
  failedAt: string;
}

export async function getNeedsAttention(): Promise<NeedsAttentionSale[]> {
  try {
    const list = await get<NeedsAttentionSale[]>(ATTENTION_KEY);
    return list || [];
  } catch {
    return [];
  }
}

export async function removeNeedsAttentionItem(batchId: string): Promise<void> {
  const list = await getNeedsAttention();
  const filtered = list.filter((item) => item.batchId !== batchId);
  await set(ATTENTION_KEY, filtered);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('tallo-needs-attention-updated'));
  }
}

export async function updateNeedsAttentionQty(
  batchId: string,
  newQty: number
): Promise<void> {
  const list = await getNeedsAttention();
  const target = list.find((item) => item.batchId === batchId);
  if (target) {
    target.sale.entries.forEach((e) => {
      e.quantity = newQty;
      e.totalMinor = Math.round(newQty * e.unitAmountMinor);
    });
    // Remove from attention and re-enqueue to offline queue to retry commit
    const filtered = list.filter((item) => item.batchId !== batchId);
    await set(ATTENTION_KEY, filtered);
    await enqueueOfflineSale(target.sale);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tallo-needs-attention-updated'));
    }
  }
}

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

let isFlushing = false;

export async function flushOfflineQueue(): Promise<{ flushed: number; failed: number }> {
  if (isFlushing) return { flushed: 0, failed: 0 };
  isFlushing = true;
  try {
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
          let errData: any = null;
          try {
            errData = await res.json();
          } catch {}

          if (
            res.status === 400 ||
            res.status === 422 ||
            errData?.error?.code === 'INSUFFICIENT_STOCK' ||
            errData?.code === 'INSUFFICIENT_STOCK' ||
            errData?.message?.includes('INSUFFICIENT_STOCK')
          ) {
            const reason =
              errData?.error?.message ||
              errData?.message ||
              'Insufficient stock available for this sale.';
            const attentionList = await getNeedsAttention();
            attentionList.push({
              batchId: item.batchId,
              sale: item,
              reason,
              failedAt: new Date().toISOString(),
            });
            await set(ATTENTION_KEY, attentionList);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('tallo-needs-attention-updated'));
            }
            failed += 1;
          } else {
            remaining.push(item);
            failed += 1;
          }
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
  } finally {
    isFlushing = false;
  }
}
