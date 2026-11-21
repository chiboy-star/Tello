import { describe, it, expect } from 'vitest';
import { computeReportFacts, CustomerRow, EntryRow } from '@/lib/domain/insights';
import { ForecastItem } from '@/lib/domain/forecast';

describe('Comprehensive Insights Domain Tests (CODEBASE_SPEC Section 13)', () => {
  const items: ForecastItem[] = [
    { id: 'item-1', name: 'Indomie Chicken', current_qty: 2, reorder_lead_days: 7, created_at: '2026-11-01' },
    { id: 'item-2', name: 'Rice', current_qty: 100, reorder_lead_days: 7, created_at: '2026-11-01' },
    { id: 'item-3', name: 'Unsold Item', current_qty: 10, reorder_lead_days: 7, created_at: '2026-11-01' },
  ];

  const customers: CustomerRow[] = [
    { id: 'c1', name: 'Alhaji Musa', phone: '08099999999' },
  ];

  const periodStart = new Date('2026-11-16T00:00:00Z');
  const periodEnd = new Date('2026-11-22T23:59:59Z');
  const prevPeriodStart = new Date('2026-11-09T00:00:00Z');
  const prevPeriodEnd = new Date('2026-11-15T23:59:59Z');

  it('risers and fallers respect the 5-unit minimum and +/-30% threshold', () => {
    const entries: EntryRow[] = [
      // Current period: item-1 sold 10 units (up from 5 in previous period -> +100% riser)
      { id: 'e1', type: 'sale', item_id: 'item-1', quantity: 10, total_minor: 100000, occurred_at: '2026-11-17' },
      // Previous period: item-1 sold 5 units
      { id: 'e2', type: 'sale', item_id: 'item-1', quantity: 5, total_minor: 50000, occurred_at: '2026-11-10' },

      // Current period: item-2 sold 2 units (down from 10 in previous period -> -80% faller)
      { id: 'e3', type: 'sale', item_id: 'item-2', quantity: 2, total_minor: 40000, occurred_at: '2026-11-18' },
      // Previous period: item-2 sold 10 units
      { id: 'e4', type: 'sale', item_id: 'item-2', quantity: 10, total_minor: 200000, occurred_at: '2026-11-11' },
    ];

    const facts = computeReportFacts({
      period: 'week',
      periodStart,
      periodEnd,
      prevPeriodStart,
      prevPeriodEnd,
      items,
      customers,
      entries,
    });

    expect(facts.risers.some((r) => r.itemId === 'item-1' && r.changePct >= 0.3)).toBe(true);
    expect(facts.fallers.some((f) => f.itemId === 'item-2' && f.changePct <= -0.3)).toBe(true);
  });

  it('previous-period zero sales gives null percent, never NaN or Infinity', () => {
    const entries: EntryRow[] = [
      { id: 'e1', type: 'sale', item_id: 'item-1', quantity: 15, total_minor: 150000, occurred_at: '2026-11-17' },
    ];

    const facts = computeReportFacts({
      period: 'week',
      periodStart,
      periodEnd,
      prevPeriodStart,
      prevPeriodEnd,
      items,
      customers,
      entries, // previous period has 0 sales
    });

    expect(facts.vsPrevious.revenuePct).toBeNull();
    expect(facts.vsPrevious.unitsPct).toBeNull();
  });

  it('flags dataQuality=thin when fewer than 7 days of data or fewer than 10 sale entries', () => {
    // Case A: 10 sales on only 2 distinct days -> thin
    const tenSalesTwoDays: EntryRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: `e-${i}`,
      type: 'sale',
      item_id: 'item-1',
      quantity: 1,
      total_minor: 10000,
      occurred_at: i < 5 ? '2026-11-16' : '2026-11-17',
    }));

    const factsA = computeReportFacts({
      period: 'week',
      periodStart,
      periodEnd,
      prevPeriodStart,
      prevPeriodEnd,
      items,
      customers,
      entries: tenSalesTwoDays,
    });
    expect(factsA.dataQuality).toBe('thin');

    // Case B: 7 sales across 7 distinct days (< 10 entries) -> thin
    const sevenSalesSevenDays: EntryRow[] = ['16', '17', '18', '19', '20', '21', '22'].map((day, i) => ({
      id: `e-day-${i}`,
      type: 'sale',
      item_id: 'item-1',
      quantity: 1,
      total_minor: 10000,
      occurred_at: `2026-11-${day}`,
    }));

    const factsB = computeReportFacts({
      period: 'week',
      periodStart,
      periodEnd,
      prevPeriodStart,
      prevPeriodEnd,
      items,
      customers,
      entries: sevenSalesSevenDays,
    });
    expect(factsB.dataQuality).toBe('thin');

    // Case C: 10 sales across 7 distinct days -> ok
    const tenSalesSevenDays: EntryRow[] = [
      ...sevenSalesSevenDays,
      { id: 'extra-1', type: 'sale', item_id: 'item-1', quantity: 1, total_minor: 10000, occurred_at: '2026-11-16' },
      { id: 'extra-2', type: 'sale', item_id: 'item-1', quantity: 1, total_minor: 10000, occurred_at: '2026-11-17' },
      { id: 'extra-3', type: 'sale', item_id: 'item-1', quantity: 1, total_minor: 10000, occurred_at: '2026-11-18' },
    ];

    const factsC = computeReportFacts({
      period: 'week',
      periodStart,
      periodEnd,
      prevPeriodStart,
      prevPeriodEnd,
      items,
      customers,
      entries: tenSalesSevenDays,
    });
    expect(factsC.dataQuality).toBe('ok');
  });

  it('populates restockSuggestions (out/critical/low) and reduceSuggestions (overstocked/zero sales with stock)', () => {
    const entries: EntryRow[] = [
      // item-1 has high sales so daysLeft is very low (critical/low)
      { id: 'e1', type: 'sale', item_id: 'item-1', quantity: 14, total_minor: 140000, occurred_at: '2026-11-15' },
    ];

    const facts = computeReportFacts({
      period: 'week',
      periodStart,
      periodEnd,
      prevPeriodStart,
      prevPeriodEnd,
      items,
      customers,
      entries,
    });

    // item-1 has current_qty 2 and avgDaily 1 -> daysLeft 2 -> critical/low -> in restockSuggestions
    expect(facts.restockSuggestions.some((s) => s.itemId === 'item-1')).toBe(true);

    // item-3 has current_qty 10 but zero sales in period -> in reduceSuggestions
    expect(facts.reduceSuggestions.some((s) => s.itemId === 'item-3')).toBe(true);
  });
});
