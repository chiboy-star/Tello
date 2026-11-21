import { describe, it, expect } from 'vitest';
import { generateTemplateNarrative, validateNarrativeGuard } from '@/lib/domain/narrative-guard';
import { ReportFacts } from '@/lib/domain/insights';

describe('Narrative Guard & Fallback Specification Tests', () => {
  const mockFacts: ReportFacts = {
    period: 'week',
    periodStart: '2026-11-16',
    periodEnd: '2026-11-22',
    totals: {
      revenueMinor: 1500000, // 15,000 NGN
      units: 30,
      saleCount: 15,
      creditGivenMinor: 500000,
      creditCollectedMinor: 200000,
      restockSpendMinor: 1000000,
    },
    vsPrevious: {
      revenuePct: 0.25, // +25%
      unitsPct: 0.2,
    },
    topSellers: {
      byRevenue: [{ itemId: '1', name: 'Indomie Chicken', revenueMinor: 800000, units: 16 }],
      byUnits: [{ itemId: '1', name: 'Indomie Chicken', revenueMinor: 800000, units: 16 }],
    },
    risers: [],
    fallers: [],
    restockSuggestions: [
      { itemId: '2', name: 'Peak Milk', status: 'low', daysLeft: 3, suggestedReorderQty: 20 },
    ],
    reduceSuggestions: [],
    debts: {
      totalOutstandingMinor: 300000, // 3,000 NGN
      topDebtors: [{ customerId: 'c1', name: 'Mama Ngozi', balanceMinor: 300000 }],
      overdueDebtsCount: 1,
    },
    dataQuality: 'ok',
  };

  it('rejects narrative containing invented numbers not present in facts', () => {
    // 99999 or 45000 were never in facts
    const inventedNarrative = 'Your shop made 99999 in profit and sold 45000 items.';
    const isValid = validateNarrativeGuard(inventedNarrative, mockFacts);
    expect(isValid).toBe(false);
  });

  it('allows valid rounded versions of real numbers from facts', () => {
    // 15000 is major units of revenueMinor (1500000 / 100), 25 is 25% from revenuePct, 30 is units
    const validNarrative = 'Total revenue was 15000 with 30 units sold, up by 25 percent.';
    const isValid = validateNarrativeGuard(validNarrative, mockFacts);
    expect(isValid).toBe(true);
  });

  it('falls back to deterministic template when LLM errors or is unavailable', () => {
    const template = generateTemplateNarrative(mockFacts, 'NGN');
    expect(template).toBeTruthy();
    expect(template).toContain('Indomie Chicken');
    expect(template).toContain('Peak Milk');
    expect(validateNarrativeGuard(template, mockFacts)).toBe(true);
  });
});
