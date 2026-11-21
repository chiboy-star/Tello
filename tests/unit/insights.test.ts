import { describe, it, expect } from 'vitest';
import { computeReportFacts, CustomerRow, EntryRow } from '@/lib/domain/insights';
import { ForecastItem } from '@/lib/domain/forecast';
import { generateTemplateNarrative, validateNarrativeGuard } from '@/lib/domain/narrative-guard';

describe('insights.ts and narrative guard tests', () => {
  const items: ForecastItem[] = [
    { id: 'item-1', name: 'Indomie Chicken', current_qty: 10, reorder_lead_days: 7, created_at: '2026-11-01' },
    { id: 'item-2', name: 'Rice', current_qty: 5, reorder_lead_days: 7, created_at: '2026-11-01' },
  ];

  const customers: CustomerRow[] = [
    { id: 'cust-1', name: 'Mama Ngozi', phone: '08012345678' },
  ];

  const periodStart = new Date('2026-11-16T00:00:00Z');
  const periodEnd = new Date('2026-11-22T23:59:59Z');
  const prevPeriodStart = new Date('2026-11-09T00:00:00Z');
  const prevPeriodEnd = new Date('2026-11-15T23:59:59Z');

  it('computes totals, top sellers, and comparisons correctly from fixtures', () => {
    const entries: EntryRow[] = [
      // Current period
      { id: 'e1', type: 'sale', item_id: 'item-1', quantity: 10, total_minor: 1000000, payment_type: 'cash', occurred_at: '2026-11-17' },
      { id: 'e2', type: 'sale', item_id: 'item-2', quantity: 5, total_minor: 800000, payment_type: 'credit', customer_id: 'cust-1', occurred_at: '2026-11-18' },
      { id: 'e3', type: 'debt_payment', customer_id: 'cust-1', total_minor: 300000, occurred_at: '2026-11-19' },
      { id: 'e4', type: 'restock', item_id: 'item-1', quantity: 20, total_minor: 1500000, occurred_at: '2026-11-17' },
      // Previous period
      { id: 'e5', type: 'sale', item_id: 'item-1', quantity: 5, total_minor: 500000, payment_type: 'cash', occurred_at: '2026-11-10' },
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

    expect(facts.totals.revenueMinor).toBe(1800000); // 10k + 8k = 18k NGN
    expect(facts.totals.units).toBe(15);
    expect(facts.totals.saleCount).toBe(2);
    expect(facts.totals.creditGivenMinor).toBe(800000);
    expect(facts.totals.creditCollectedMinor).toBe(300000);
    expect(facts.totals.restockSpendMinor).toBe(1500000);

    // Comparisons
    expect(facts.vsPrevious.revenuePct).toBe(2.6); // (18k - 5k) / 5k = 2.6 (+260%)
    expect(facts.topSellers.byRevenue[0].name).toBe('Indomie Chicken');
    expect(facts.debts.totalOutstandingMinor).toBe(500000); // 8k - 3k = 5k
  });

  it('flags dataQuality=thin when entries are below thresholds', () => {
    const facts = computeReportFacts({
      period: 'week',
      periodStart,
      periodEnd,
      prevPeriodStart,
      prevPeriodEnd,
      items,
      customers,
      entries: [
        { id: 'e1', type: 'sale', item_id: 'item-1', quantity: 2, total_minor: 200000, occurred_at: '2026-11-17' },
      ],
    });

    expect(facts.dataQuality).toBe('thin');
  });

  it('narrative guard rejects narrative with invented numbers and approves valid ones', () => {
    const entries: EntryRow[] = [
      { id: 'e1', type: 'sale', item_id: 'item-1', quantity: 10, total_minor: 1000000, payment_type: 'cash', occurred_at: '2026-11-17' },
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

    // Valid narrative using real facts numbers (10,000 NGN, 10 units)
    const validNarrative = 'Your total revenue for this week reached 10000 with 10 units sold.';
    expect(validateNarrativeGuard(validNarrative, facts)).toBe(true);

    // Invented number 999999
    const invalidNarrative = 'Your shop made 999999 NGN profit this week.';
    expect(validateNarrativeGuard(invalidNarrative, facts)).toBe(false);

    // Template narrative always generates safely
    const template = generateTemplateNarrative(facts, 'NGN');
    expect(template).toBeTruthy();
    expect(validateNarrativeGuard(template, facts)).toBe(true);
  });
});
