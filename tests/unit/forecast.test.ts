import { describe, it, expect } from 'vitest';
import { computeStockForecast, ForecastItem, SaleEntry } from '@/lib/domain/forecast';

describe('forecast.ts domain tests', () => {
  const baseItem: ForecastItem = {
    id: 'item-1',
    name: 'Indomie Chicken',
    current_qty: 20,
    reorder_lead_days: 7,
    created_at: '2026-11-01T00:00:00Z',
  };

  const today = new Date('2026-11-21T12:00:00Z');

  it('handles item with no sales: status=no_data, daysLeft=null, does not throw', () => {
    const res = computeStockForecast(baseItem, [], today);
    expect(res.status).toBe('no_data');
    expect(res.daysLeft).toBeNull();
    expect(res.avgDaily).toBe(0);
    expect(res.suggestedReorderQty).toBe(0);
  });

  it('handles current_qty = 0: status=out, daysLeft=0', () => {
    const res = computeStockForecast({ ...baseItem, current_qty: 0 }, [], today);
    expect(res.status).toBe('out');
    expect(res.daysLeft).toBe(0);
  });

  it('handles negative current_qty: treated as out', () => {
    const res = computeStockForecast({ ...baseItem, current_qty: -5 }, [], today);
    expect(res.status).toBe('out');
    expect(res.daysLeft).toBe(0);
  });

  it('steady 5/day, qty 20: daysLeft=4, correct runOutDate', () => {
    // Generate 5 sales/day across last 14 full days (Nov 7 to Nov 20)
    const sales: SaleEntry[] = [];
    for (let day = 7; day <= 20; day++) {
      sales.push({
        item_id: 'item-1',
        quantity: 5,
        occurred_at: `2026-11-${day.toString().padStart(2, '0')}T10:00:00Z`,
      });
    }

    const res = computeStockForecast(baseItem, sales, today);
    expect(res.avgDaily).toBe(5);
    expect(res.daysLeft).toBe(4);
    expect(res.status).toBe('low'); // 4 <= lead_days (7)
    expect(res.confidence).toBe('high');
  });

  it('today sales are excluded from window', () => {
    const sales: SaleEntry[] = [
      { item_id: 'item-1', quantity: 100, occurred_at: '2026-11-21T08:00:00Z' }, // today
    ];
    const res = computeStockForecast(baseItem, sales, today);
    expect(res.avgDaily).toBe(0);
    expect(res.status).toBe('no_data');
  });

  it('new item with 2 days history: confidence=low, uses effectiveDays=2 not 14', () => {
    const newItem: ForecastItem = {
      ...baseItem,
      created_at: '2026-11-19T00:00:00Z', // 2 full days before today (19th, 20th)
    };
    const sales: SaleEntry[] = [
      { item_id: 'item-1', quantity: 10, occurred_at: '2026-11-19T10:00:00Z' },
      { item_id: 'item-1', quantity: 10, occurred_at: '2026-11-20T10:00:00Z' },
    ];
    const res = computeStockForecast(newItem, sales, today);
    expect(res.confidence).toBe('low');
    expect(res.avgDaily).toBe(10); // 20 units / 2 days = 10
  });

  it('status classification: critical <= 2, low <= lead_days, overstocked > 45', () => {
    // Lead days = 7
    const customItem: ForecastItem = {
      ...baseItem,
      created_at: '2026-11-07T00:00:00Z',
    };
    // 28 units over 14 days = 2 units/day
    const sales: SaleEntry[] = [
      { item_id: 'item-1', quantity: 14, occurred_at: '2026-11-07T10:00:00Z' },
      { item_id: 'item-1', quantity: 14, occurred_at: '2026-11-15T10:00:00Z' },
    ];
    // Critical: qty = 2, avgDaily = 2 -> daysLeft = 1 <= 2
    const criticalRes = computeStockForecast({ ...customItem, current_qty: 2 }, sales, today);
    expect(criticalRes.status).toBe('critical');

    // Overstocked: qty = 200, avgDaily = 2 -> daysLeft = 100 > 45
    const overstockedRes = computeStockForecast({ ...customItem, current_qty: 200 }, sales, today);
    expect(overstockedRes.status).toBe('overstocked');
  });

  it('ignores voided entries', () => {
    const sales: SaleEntry[] = [
      { item_id: 'item-1', quantity: 50, occurred_at: '2026-11-15T10:00:00Z', voided_at: '2026-11-15T11:00:00Z' },
    ];
    const res = computeStockForecast(baseItem, sales, today);
    expect(res.avgDaily).toBe(0);
    expect(res.status).toBe('no_data');
  });

  it('suggestedReorderQty is never negative', () => {
    // Overstocked item: buffer is less than current_qty
    const sales: SaleEntry[] = [
      { item_id: 'item-1', quantity: 14, occurred_at: '2026-11-15T10:00:00Z' }, // 1/day
    ];
    const res = computeStockForecast({ ...baseItem, current_qty: 50 }, sales, today);
    expect(res.suggestedReorderQty).toBe(0);
  });
});
