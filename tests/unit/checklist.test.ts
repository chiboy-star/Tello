import { describe, it, expect } from 'vitest';
import { computeChecklist } from '@/lib/domain/checklist';

describe('Part 3: computeChecklist business logic', () => {
  it('fresh user (0 items, 0 sales, 0 customers, 0 ai) produces 0/5', () => {
    const res = computeChecklist({
      items: [],
      entries: [],
      customersCount: 0,
      hasAiUsage: false,
    });

    expect(res.completedCount).toBe(0);
    expect(res.allDone).toBe(false);
    expect(res.steps.addItems).toBe(false);
    expect(res.steps.reviewPrices).toBe(false);
    expect(res.steps.logSale).toBe(false);
    expect(res.steps.addCustomer).toBe(false);
    expect(res.steps.tryAi).toBe(false);
  });

  it('adds 5 items with estimates: addItems is true, but reviewPrices is false', () => {
    const res = computeChecklist({
      items: [
        { id: '1', sell_price_source: 'estimate', sell_price_minor: 1000 },
        { id: '2', sell_price_source: 'estimate', sell_price_minor: 2000 },
        { id: '3', sell_price_source: 'estimate', sell_price_minor: 3000 },
        { id: '4', sell_price_source: 'estimate', sell_price_minor: 4000 },
        { id: '5', sell_price_source: 'estimate', sell_price_minor: 5000 },
      ],
      entries: [],
      customersCount: 0,
    });

    expect(res.steps.addItems).toBe(true);
    expect(res.steps.reviewPrices).toBe(false);
    expect(res.completedCount).toBe(1);
  });

  it('reviewPrices requires at least one priced item and ZERO items with estimate or null price', () => {
    // 4 confirmed, 1 estimate -> false
    const res1 = computeChecklist({
      items: [
        { id: '1', sell_price_source: 'user', sell_price_minor: 1000 },
        { id: '2', sell_price_source: 'catalog_confirmed', sell_price_minor: 2000 },
        { id: '3', sell_price_source: 'catalog_confirmed', sell_price_minor: 3000 },
        { id: '4', sell_price_source: 'catalog_confirmed', sell_price_minor: 4000 },
        { id: '5', sell_price_source: 'estimate', sell_price_minor: 5000 },
      ],
      entries: [],
      customersCount: 0,
    });
    expect(res1.steps.reviewPrices).toBe(false);

    // all 5 confirmed and priced -> true
    const res2 = computeChecklist({
      items: [
        { id: '1', sell_price_source: 'user', sell_price_minor: 1000 },
        { id: '2', sell_price_source: 'catalog_confirmed', sell_price_minor: 2000 },
        { id: '3', sell_price_source: 'catalog_confirmed', sell_price_minor: 3000 },
        { id: '4', sell_price_source: 'catalog_confirmed', sell_price_minor: 4000 },
        { id: '5', sell_price_source: 'catalog_confirmed', sell_price_minor: 5000 },
      ],
      entries: [],
      customersCount: 0,
    });
    expect(res2.steps.reviewPrices).toBe(true);
  });

  it('sale entry marks logSale true only if not voided', () => {
    const resVoid = computeChecklist({
      items: [],
      entries: [{ type: 'sale', voided_at: '2026-11-22T10:00:00Z' }],
      customersCount: 0,
    });
    expect(resVoid.steps.logSale).toBe(false);

    const resValid = computeChecklist({
      items: [],
      entries: [{ type: 'sale', voided_at: null }],
      customersCount: 0,
    });
    expect(resValid.steps.logSale).toBe(true);
  });

  it('all 5 complete yields 5/5 and allDone = true', () => {
    const res = computeChecklist({
      items: [
        { id: '1', sell_price_source: 'user', sell_price_minor: 1000 },
        { id: '2', sell_price_source: 'user', sell_price_minor: 2000 },
        { id: '3', sell_price_source: 'user', sell_price_minor: 3000 },
        { id: '4', sell_price_source: 'user', sell_price_minor: 4000 },
        { id: '5', sell_price_source: 'user', sell_price_minor: 5000 },
      ],
      entries: [
        { type: 'sale', source: 'voice', voided_at: null },
      ],
      customersCount: 1,
      hasAiUsage: true,
    });

    expect(res.completedCount).toBe(5);
    expect(res.allDone).toBe(true);
  });
});
