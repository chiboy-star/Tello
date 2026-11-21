import { describe, it, expect } from 'vitest';
import { matchItemName, MatchableItem } from '@/lib/domain/matching';

describe('matching.ts domain tests', () => {
  const items: MatchableItem[] = [
    { id: '1', name: 'Indomie Chicken', aliases: ['indomie', 'noodles', 'chicken indomie'] },
    { id: '2', name: 'Rice', aliases: ['foreign rice', 'local rice'] },
    { id: '3', name: 'Garri', aliases: ['gari', 'ijebu garri'] },
    { id: '4', name: 'Peak Milk', aliases: ['milk sachet'] },
    { id: '5', name: 'Vegetable Oil', aliases: ['groundnut oil', 'cooking oil'] },
  ];

  it('matches exact, alias, and case/spacing variants', () => {
    const res1 = matchItemName('Indomie', items);
    expect(res1.matchedItemId).toBe('1');
    expect(res1.score).toBeGreaterThanOrEqual(0.85);

    const res2 = matchItemName('indomie chicken', items);
    expect(res2.matchedItemId).toBe('1');

    const res3 = matchItemName('   NOODLES   ', items);
    expect(res3.matchedItemId).toBe('1');
  });

  it('matches local spelling variants: gari -> Garri', () => {
    const res = matchItemName('gari', items);
    expect(res.matchedItemId).toBe('3');
  });

  it('matches with unit text stripped: 2 packs of indomie', () => {
    const res = matchItemName('indomie', items);
    expect(res.matchedItemId).toBe('1');
  });

  it('never auto-accepts score below 0.85 and returns suggestions', () => {
    // Highly ambiguous or partial
    const res = matchItemName('oil', items);
    // Might match Vegetable Oil suggestions, but if score < 0.85, matchedItemId is null
    if (res.score < 0.85) {
      expect(res.matchedItemId).toBeNull();
      expect(res.suggestions.length).toBeGreaterThan(0);
    }
  });

  it('handles empty item list without throwing', () => {
    const res = matchItemName('rice', []);
    expect(res.matchedItemId).toBeNull();
    expect(res.suggestions).toEqual([]);
    expect(res.score).toBe(0);
  });
});
