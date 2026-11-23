import { describe, it, expect } from 'vitest';
import { computeReportFacts } from '@/lib/domain/insights';

describe('Reports computeReportFacts velocityUnitsPerDay regression test', () => {
  it('correctly maps forecast avgDaily to velocityUnitsPerDay and never returns undefined', () => {
    const items = [
      {
        id: 'item-slow-1',
        name: 'Slow Moving Custard',
        current_qty: 15,
        reorder_lead_days: 7,
        created_at: '2026-10-01T00:00:00Z',
      },
    ];

    const entries = [
      {
        id: 'entry-1',
        user_id: 'user-1',
        type: 'sale',
        item_id: 'item-slow-1',
        quantity: 1,
        total_minor: 150000,
        payment_type: 'cash',
        occurred_at: '2026-11-10T10:00:00Z',
        created_at: '2026-11-10T10:00:00Z',
        voided_at: null,
      },
    ];

    const facts = computeReportFacts({
      period: 'week',
      periodStart: new Date('2026-11-16T00:00:00Z'),
      periodEnd: new Date('2026-11-23T00:00:00Z'),
      prevPeriodStart: new Date('2026-11-09T00:00:00Z'),
      prevPeriodEnd: new Date('2026-11-16T00:00:00Z'),
      items: items as any,
      customers: [],
      entries: entries as any,
      today: new Date('2026-11-23T00:00:00Z'),
      tz: 'Africa/Lagos',
    });

    // Check reduceSuggestions: velocityUnitsPerDay must be a defined finite number, not undefined
    expect(facts.reduceSuggestions.length).toBeGreaterThan(0);
    const suggestion = facts.reduceSuggestions[0];
    expect(suggestion.velocityUnitsPerDay).toBeDefined();
    expect(typeof suggestion.velocityUnitsPerDay).toBe('number');
    expect(isNaN(suggestion.velocityUnitsPerDay)).toBe(false);
  });
});
