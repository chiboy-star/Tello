import { QueryClient } from '@tanstack/react-query';
import { persistQueryCache } from './cache-persister';

/**
 * Tallo Mutation Invalidation & Optimistic Cache Helper (Part 1.2)
 * One single source of truth for query freshness and optimistic updates.
 */

export interface OptimisticSaleParams {
  totalMinor: number;
  paymentType?: 'cash' | 'transfer' | 'credit';
  isCredit?: boolean;
  itemStockUpdates?: Array<{ id: string; qtySold: number }>;
}

export const MUTATION_MAP = {
  commit_sale: ['dashboard', 'checklist', 'items', 'entries', 'customers', 'reports'],
  quick_sell: ['dashboard', 'checklist', 'items', 'entries', 'reports'],
  void_entry: ['dashboard', 'checklist', 'items', 'entries', 'customers', 'debts', 'reports'],
  void: ['dashboard', 'checklist', 'items', 'entries', 'customers', 'debts', 'reports'],
  adjust_stock: ['items', 'entries', 'stock_activity', 'dashboard'],
  add_edit_item: ['items', 'checklist', 'dashboard', 'catalog'],
  archive_item: ['items', 'checklist', 'dashboard', 'catalog'],
  bulk_add_items: ['items', 'checklist', 'dashboard', 'catalog'],
  price_change: ['items', 'checklist', 'dashboard'],
  add_customer: ['customers', 'debts', 'checklist', 'dashboard'],
  debt_payment: ['customers', 'debts', 'entries', 'reports', 'dashboard'],
  record_purchase: ['items', 'purchases', 'stock_activity', 'entries', 'reports', 'dashboard', 'checklist'],
  purchase: ['items', 'purchases', 'stock_activity', 'entries', 'reports', 'dashboard', 'checklist'],
  settings: ['settings', 'dashboard'],
  reports_regenerate: ['reports', 'dashboard'],
  onboarding: ['items', 'dashboard', 'checklist', 'customers', 'settings'],
} as const;

export type MutationType = keyof typeof MUTATION_MAP;

/**
 * Optimistically updates dashboard numbers (revenue, count, credit) and item stock.
 */
export function optimisticUpdateOnSale(client: QueryClient, params: OptimisticSaleParams) {
  // 1. Optimistically update Dashboard query
  client.setQueryData(['dashboard'], (old: any) => {
    if (!old) return old;
    const oldToday = old.today || { revenueMinor: 0, salesCount: 0, creditGivenMinor: 0 };
    const oldChecklist = old.checklist || { steps: {} };

    return {
      ...old,
      today: {
        ...oldToday,
        revenueMinor: (Number(oldToday.revenueMinor) || 0) + params.totalMinor,
        salesCount: (Number(oldToday.salesCount) || 0) + 1,
        creditGivenMinor: params.isCredit
          ? (Number(oldToday.creditGivenMinor) || 0) + params.totalMinor
          : oldToday.creditGivenMinor || 0,
      },
      checklist: {
        ...oldChecklist,
        hasSale: true,
        steps: {
          ...oldChecklist.steps,
          logSale: true,
        },
      },
    };
  });

  // 2. Optimistically update item stock in query cache
  if (params.itemStockUpdates && params.itemStockUpdates.length > 0) {
    const updateMap = new Map(params.itemStockUpdates.map((u) => [u.id, u.qtySold]));
    client.setQueryData(['items', 'all'], (old: any) => {
      if (!old || !old.items) return old;
      return {
        ...old,
        items: old.items.map((i: any) => {
          const qtySold = updateMap.get(i.id);
          if (qtySold !== undefined) {
            return {
              ...i,
              current_qty: Math.max(0, (Number(i.current_qty) || 0) - qtySold),
            };
          }
          return i;
        }),
      };
    });
  }

  // 3. Persist updated cache to IndexedDB
  persistQueryCache(client).catch(() => {});
}

/**
 * Invalidates queries according to the mutation map and persists fresh cache.
 */
export async function invalidateAfterMutation(client: QueryClient, type: MutationType) {
  const keys = MUTATION_MAP[type] || ['dashboard'];

  await Promise.all(
    keys.map((k) =>
      client.invalidateQueries({
        queryKey: [k],
        refetchType: 'all',
      })
    )
  );

  // Sync fresh state to IndexedDB persister
  await persistQueryCache(client).catch(() => {});
}
