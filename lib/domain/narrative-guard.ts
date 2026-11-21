import { ReportFacts } from './insights';
import { formatMoney } from './money';

/**
 * Deterministic fallback narrative template built purely from report facts.
 */
export function generateTemplateNarrative(facts: ReportFacts, currency = 'NGN'): string {
  const parts: string[] = [];

  if (facts.dataQuality === 'thin') {
    parts.push(
      `Sales data for this ${facts.period} is still thin with ${facts.totals.saleCount} sales recorded, so estimates will improve as you log more activity.`
    );
  } else {
    const rev = formatMoney(facts.totals.revenueMinor, currency);
    if (facts.vsPrevious.revenuePct !== null) {
      const dir = facts.vsPrevious.revenuePct >= 0 ? 'up' : 'down';
      const pct = Math.abs(Math.round(facts.vsPrevious.revenuePct * 100));
      parts.push(`Your total revenue was ${rev}, which is ${dir} ${pct}% compared to the previous ${facts.period}.`);
    } else {
      parts.push(`Your shop generated a total revenue of ${rev} across ${facts.totals.saleCount} sales.`);
    }
  }

  if (facts.topSellers.byRevenue.length > 0) {
    const top = facts.topSellers.byRevenue[0];
    parts.push(`Your best-selling item by revenue was ${top.name} with ${top.units} units sold.`);
  }

  if (facts.restockSuggestions.length > 0) {
    const urgent = facts.restockSuggestions[0];
    parts.push(`Keep an eye on ${urgent.name}, which is currently ${urgent.status} with about ${urgent.daysLeft ?? 0} days of stock remaining.`);
  } else {
    parts.push(`Your stock levels are currently well balanced across your catalog.`);
  }

  if (facts.debts.totalOutstandingMinor > 0) {
    const debtStr = formatMoney(facts.debts.totalOutstandingMinor, currency);
    parts.push(`You have ${debtStr} in total unpaid customer debts.`);
  }

  return parts.slice(0, 5).join(' ');
}

/**
 * Extracts numbers from text to verify against numbers present in facts JSON.
 */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/\b\d+(?:[\.,]\d+)?\b/g);
  if (!matches) return [];
  return matches
    .map((m) => parseFloat(m.replace(/,/g, '')))
    .filter((n) => !isNaN(n));
}

/**
 * Checks whether LLM generated narrative contains invented numbers.
 * Discards and falls back to template if any number is unauthorized.
 */
export function validateNarrativeGuard(narrative: string, facts: ReportFacts): boolean {
  if (!narrative || narrative.trim().length === 0) return false;

  const narrativeNums = extractNumbers(narrative);
  if (narrativeNums.length === 0) return true; // No numbers mentioned is safe

  // Extract all numbers present in facts JSON
  const factsString = JSON.stringify(facts);
  const factsNums = new Set(extractNumbers(factsString));

  // Also include major units of minors (e.g. 5000 from 500000 minor)
  const expandedFactsNums = new Set<number>();
  factsNums.forEach((n) => {
    expandedFactsNums.add(n);
    expandedFactsNums.add(Math.round(n));
    expandedFactsNums.add(Math.round(n / 100)); // minor to major
    expandedFactsNums.add(Number((n / 100).toFixed(2)));
    expandedFactsNums.add(Math.round(n * 100)); // percentage conversion
  });

  // Verify each number in narrative
  for (const num of narrativeNums) {
    const rounded = Math.round(num);
    const isAllowed =
      expandedFactsNums.has(num) ||
      expandedFactsNums.has(rounded) ||
      expandedFactsNums.has(Number(num.toFixed(1))) ||
      // Standard small ordinal or sentence counts
      num === 1 || num === 2 || num === 3 || num === 5 || num === 7 || num === 14 || num === 30;

    if (!isAllowed) {
      return false; // Invented number detected!
    }
  }

  return true;
}
