export interface ChecklistState {
  itemsCount: number;
  hasUnreviewedPrices: boolean;
  hasPricedItems: boolean;
  hasSale: boolean;
  hasCustomer: boolean;
  hasAiEntry: boolean;
  steps: {
    addItems: boolean;
    reviewPrices: boolean;
    logSale: boolean;
    addCustomer: boolean;
    tryAi: boolean;
  };
  completedCount: number;
  totalCount: number;
  allDone: boolean;
}

export function computeChecklist(params: {
  items: Array<{ id: string; sell_price_source?: string | null; sell_price_minor?: number | null; archived_at?: string | null; is_archived?: boolean | null }>;
  entries: Array<{ type: string; source?: string | null; voided_at?: string | null }>;
  customersCount: number;
  hasAiUsage?: boolean;
}): ChecklistState {
  const activeItems = params.items.filter((i) => !i.archived_at && !i.is_archived);
  const itemsCount = activeItems.length;

  const hasPricedItems = activeItems.some((i) => typeof i.sell_price_minor === 'number' && i.sell_price_minor > 0);
  const hasUnreviewedPrices = activeItems.some(
    (i) => i.sell_price_source === 'estimate' || i.sell_price_minor === null || i.sell_price_minor === 0
  );

  // Review your prices: true only when the shop has at least one priced item and ZERO items with sell_price_source = 'estimate' or missing price
  const reviewPricesDone = itemsCount > 0 && hasPricedItems && !hasUnreviewedPrices;

  const validEntries = params.entries.filter((e) => !e.voided_at);
  const hasSale = validEntries.some((e) => e.type === 'sale');
  const hasCustomer = params.customersCount > 0;
  const hasAiEntry =
    validEntries.some((e) => e.source === 'voice' || e.source === 'image' || e.source === 'photo') ||
    !!params.hasAiUsage;

  const steps = {
    addItems: itemsCount >= 5,
    reviewPrices: reviewPricesDone,
    logSale: hasSale,
    addCustomer: hasCustomer,
    tryAi: hasAiEntry,
  };

  const completedCount = Object.values(steps).filter(Boolean).length;

  return {
    itemsCount,
    hasUnreviewedPrices,
    hasPricedItems,
    hasSale,
    hasCustomer,
    hasAiEntry,
    steps,
    completedCount,
    totalCount: 5,
    allDone: completedCount === 5,
  };
}
