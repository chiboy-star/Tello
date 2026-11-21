import { describe, it, expect } from 'vitest';
import { computeCustomerDebt, DebtEntry } from '@/lib/domain/debts';

describe('debts.ts domain tests', () => {
  const customerId = 'cust-1';

  it('computes balance = credit sales - payments, ignoring voided entries', () => {
    const entries: DebtEntry[] = [
      { id: '1', type: 'sale', total_minor: 500000, payment_type: 'credit', occurred_at: '2026-11-01' },
      { id: '2', type: 'sale', total_minor: 300000, payment_type: 'credit', occurred_at: '2026-11-05' },
      { id: '3', type: 'debt_payment', total_minor: 200000, occurred_at: '2026-11-06' },
      // Voided sale should be ignored
      { id: '4', type: 'sale', total_minor: 1000000, payment_type: 'credit', occurred_at: '2026-11-07', voided_at: '2026-11-07' },
    ];

    const res = computeCustomerDebt(customerId, entries);
    expect(res.balanceMinor).toBe(600000); // 500k + 300k - 200k = 600k
  });

  it('handles overpayment cleanly (negative balance)', () => {
    const entries: DebtEntry[] = [
      { id: '1', type: 'sale', total_minor: 200000, payment_type: 'credit', occurred_at: '2026-11-01' },
      { id: '2', type: 'debt_payment', total_minor: 300000, occurred_at: '2026-11-02' },
    ];

    const res = computeCustomerDebt(customerId, entries);
    expect(res.balanceMinor).toBe(-100000);
    expect(res.oldestUnpaidAt).toBeNull();
  });

  it('calculates FIFO oldest_unpaid_at correctly with partial payments', () => {
    const entries: DebtEntry[] = [
      { id: '1', type: 'sale', total_minor: 500000, payment_type: 'credit', occurred_at: '2026-11-01T10:00:00Z' }, // 5k
      { id: '2', type: 'sale', total_minor: 300000, payment_type: 'credit', occurred_at: '2026-11-05T10:00:00Z' }, // 3k
      // Payment of 5k covers sale #1 entirely, so oldest unpaid becomes sale #2
      { id: '3', type: 'debt_payment', total_minor: 500000, occurred_at: '2026-11-06T10:00:00Z' },
    ];

    const res = computeCustomerDebt(customerId, entries);
    expect(res.balanceMinor).toBe(300000);
    expect(res.oldestUnpaidAt?.toISOString()).toBe('2026-11-05T10:00:00.000Z');
  });
});
