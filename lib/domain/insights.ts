import { differenceInCalendarDays } from 'date-fns';
import { ForecastResult, ForecastItem, computeStockForecast } from './forecast';
import { computeCustomerDebt } from './debts';

export interface EntryRow {
  id: string;
  type: 'sale' | 'restock' | 'debt_payment';
  item_id?: string | null;
  customer_id?: string | null;
  quantity?: number | null;
  unit_amount_minor?: number | null;
  total_minor: number;
  payment_type?: string;
  occurred_at: string | Date;
  voided_at?: string | Date | null;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone?: string | null;
}

export interface TopSellerItem {
  itemId: string;
  name: string;
  revenueMinor: number;
  units: number;
}

export interface RiserFallerItem {
  itemId: string;
  name: string;
  currentUnits: number;
  previousUnits: number;
  changePct: number;
}

export interface ReportFacts {
  period: 'week' | 'month';
  periodStart: string;
  periodEnd: string;
  totals: {
    revenueMinor: number;
    units: number;
    saleCount: number;
    creditGivenMinor: number;
    creditCollectedMinor: number;
    restockSpendMinor: number;
  };
  vsPrevious: {
    revenuePct: number | null;
    unitsPct: number | null;
  };
  topSellers: {
    byRevenue: TopSellerItem[];
    byUnits: TopSellerItem[];
  };
  risers: RiserFallerItem[];
  fallers: RiserFallerItem[];
  restockSuggestions: Array<{
    itemId: string;
    name: string;
    status: string;
    daysLeft: number | null;
    suggestedReorderQty: number;
  }>;
  reduceSuggestions: Array<{
    itemId: string;
    name: string;
    status: string;
    currentQty: number;
  }>;
  debts: {
    totalOutstandingMinor: number;
    topDebtors: Array<{ customerId: string; name: string; balanceMinor: number }>;
    overdueDebtsCount: number; // debts older than 14 days
  };
  dataQuality: 'ok' | 'thin';
}

/**
 * Computes deterministic business facts for a given reporting period.
 * All numbers are computed strictly in code, never by LLM.
 */
export function computeReportFacts(params: {
  period: 'week' | 'month';
  periodStart: Date;
  periodEnd: Date;
  prevPeriodStart: Date;
  prevPeriodEnd: Date;
  items: ForecastItem[];
  customers: CustomerRow[];
  entries: EntryRow[];
  today?: Date;
  tz?: string;
}): ReportFacts {
  const {
    period,
    periodStart,
    periodEnd,
    prevPeriodStart,
    prevPeriodEnd,
    items,
    customers,
    entries,
    today = new Date(),
    tz = 'Africa/Lagos',
  } = params;

  const validEntries = entries.filter((e) => !e.voided_at);

  const isCurrentPeriod = (e: EntryRow) => {
    const d = new Date(e.occurred_at);
    return d >= periodStart && d <= periodEnd;
  };

  const isPrevPeriod = (e: EntryRow) => {
    const d = new Date(e.occurred_at);
    return d >= prevPeriodStart && d <= prevPeriodEnd;
  };

  const currEntries = validEntries.filter(isCurrentPeriod);
  const prevEntries = validEntries.filter(isPrevPeriod);

  // Totals
  let revenueMinor = 0;
  let units = 0;
  let saleCount = 0;
  let creditGivenMinor = 0;
  let creditCollectedMinor = 0;
  let restockSpendMinor = 0;

  const itemSalesMap: Record<string, { revenueMinor: number; units: number }> = {};

  currEntries.forEach((e) => {
    const total = Number(e.total_minor) || 0;
    const qty = Number(e.quantity) || 0;

    if (e.type === 'sale') {
      saleCount += 1;
      revenueMinor += total;
      units += qty;
      if (e.payment_type === 'credit') {
        creditGivenMinor += total;
      }
      if (e.item_id) {
        if (!itemSalesMap[e.item_id]) {
          itemSalesMap[e.item_id] = { revenueMinor: 0, units: 0 };
        }
        itemSalesMap[e.item_id].revenueMinor += total;
        itemSalesMap[e.item_id].units += qty;
      }
    } else if (e.type === 'debt_payment') {
      creditCollectedMinor += total;
    } else if (e.type === 'restock') {
      restockSpendMinor += total;
    }
  });

  // Previous Period Totals for comparison
  let prevRevenueMinor = 0;
  let prevUnits = 0;
  const prevItemSalesMap: Record<string, number> = {};

  prevEntries.forEach((e) => {
    if (e.type === 'sale') {
      prevRevenueMinor += Number(e.total_minor) || 0;
      prevUnits += Number(e.quantity) || 0;
      if (e.item_id) {
        prevItemSalesMap[e.item_id] = (prevItemSalesMap[e.item_id] || 0) + (Number(e.quantity) || 0);
      }
    }
  });

  const revenuePct = prevRevenueMinor > 0 ? (revenueMinor - prevRevenueMinor) / prevRevenueMinor : null;
  const unitsPct = prevUnits > 0 ? (units - prevUnits) / prevUnits : null;

  // Top Sellers
  const itemLookup = new Map(items.map((i) => [i.id, i.name]));

  const sellerEntries = Object.entries(itemSalesMap).map(([itemId, stats]) => ({
    itemId,
    name: itemLookup.get(itemId) || 'Unknown item',
    revenueMinor: stats.revenueMinor,
    units: stats.units,
  }));

  const byRevenue = [...sellerEntries]
    .sort((a, b) => b.revenueMinor - a.revenueMinor || b.units - a.units)
    .slice(0, 5);

  const byUnits = [...sellerEntries]
    .sort((a, b) => b.units - a.units || b.revenueMinor - a.revenueMinor)
    .slice(0, 5);

  // Risers & Fallers (>= 5 units in either period, change >= +/- 30%)
  const risers: RiserFallerItem[] = [];
  const fallers: RiserFallerItem[] = [];

  items.forEach((item) => {
    const curU = itemSalesMap[item.id]?.units || 0;
    const prvU = prevItemSalesMap[item.id] || 0;

    if (curU >= 5 || prvU >= 5) {
      if (prvU > 0) {
        const pct = (curU - prvU) / prvU;
        if (pct >= 0.3) {
          risers.push({
            itemId: item.id,
            name: item.name,
            currentUnits: curU,
            previousUnits: prvU,
            changePct: Number(pct.toFixed(2)),
          });
        } else if (pct <= -0.3) {
          fallers.push({
            itemId: item.id,
            name: item.name,
            currentUnits: curU,
            previousUnits: prvU,
            changePct: Number(pct.toFixed(2)),
          });
        }
      } else if (curU >= 5) {
        // From 0 to >= 5 is considered a riser
        risers.push({
          itemId: item.id,
          name: item.name,
          currentUnits: curU,
          previousUnits: 0,
          changePct: 1.0,
        });
      }
    }
  });

  // Forecast-based Restock & Reduce suggestions
  const saleEntriesForForecast = validEntries
    .filter((e) => e.type === 'sale')
    .map((e) => ({
      item_id: e.item_id!,
      quantity: Number(e.quantity) || 0,
      occurred_at: e.occurred_at,
      voided_at: e.voided_at,
    }));

  const forecasts: ForecastResult[] = items.map((item) =>
    computeStockForecast(item, saleEntriesForForecast, today, tz)
  );

  const restockSuggestions = forecasts
    .filter((f) => f.status === 'out' || f.status === 'critical' || f.status === 'low')
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
    .map((f) => ({
      itemId: f.itemId,
      name: itemLookup.get(f.itemId) || 'Item',
      status: f.status,
      daysLeft: f.daysLeft,
      suggestedReorderQty: f.suggestedReorderQty,
    }));

  const reduceSuggestions = forecasts
    .filter((f) => {
      if (f.status === 'overstocked') return true;
      // Or zero sales in the period while current_qty > 0
      const curSales = itemSalesMap[f.itemId]?.units || 0;
      return curSales === 0 && f.currentQty > 0;
    })
    .map((f) => ({
      itemId: f.itemId,
      name: itemLookup.get(f.itemId) || 'Item',
      status: f.status,
      currentQty: f.currentQty,
    }));

  // Debts calculation across all ledger history
  const customerLookup = new Map(customers.map((c) => [c.id, c.name]));
  const customerDebts: Array<{ customerId: string; name: string; balanceMinor: number; oldestUnpaidAt: Date | null }> = [];

  customers.forEach((cust) => {
    const custEntries = validEntries
      .filter((e) => e.customer_id === cust.id)
      .map((e) => ({
        id: e.id,
        type: e.type,
        total_minor: e.total_minor,
        payment_type: e.payment_type,
        occurred_at: e.occurred_at,
        voided_at: e.voided_at,
      }));

    const debt = computeCustomerDebt(cust.id, custEntries);
    if (debt.balanceMinor > 0) {
      customerDebts.push({
        customerId: cust.id,
        name: customerLookup.get(cust.id) || cust.name,
        balanceMinor: debt.balanceMinor,
        oldestUnpaidAt: debt.oldestUnpaidAt,
      });
    }
  });

  const totalOutstandingMinor = customerDebts.reduce((acc, d) => acc + d.balanceMinor, 0);

  const topDebtors = [...customerDebts]
    .sort((a, b) => b.balanceMinor - a.balanceMinor)
    .slice(0, 3)
    .map((d) => ({
      customerId: d.customerId,
      name: d.name,
      balanceMinor: d.balanceMinor,
    }));

  const overdueDebtsCount = customerDebts.filter((d) => {
    if (!d.oldestUnpaidAt) return false;
    return differenceInCalendarDays(today, d.oldestUnpaidAt) > 14;
  }).length;

  // Data Quality Assessment: 'thin' if fewer than 7 days of data or fewer than 10 sale entries
  const distinctSaleDays = new Set(
    validEntries
      .filter((e) => e.type === 'sale')
      .map((e) => (typeof e.occurred_at === 'string' ? e.occurred_at.slice(0, 10) : new Date(e.occurred_at).toISOString().slice(0, 10)))
  ).size;

  const dataQuality: 'ok' | 'thin' = distinctSaleDays < 7 || saleCount < 10 ? 'thin' : 'ok';

  return {
    period,
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
    totals: {
      revenueMinor,
      units,
      saleCount,
      creditGivenMinor,
      creditCollectedMinor,
      restockSpendMinor,
    },
    vsPrevious: {
      revenuePct: revenuePct !== null ? Number(revenuePct.toFixed(2)) : null,
      unitsPct: unitsPct !== null ? Number(unitsPct.toFixed(2)) : null,
    },
    topSellers: {
      byRevenue,
      byUnits,
    },
    risers,
    fallers,
    restockSuggestions,
    reduceSuggestions,
    debts: {
      totalOutstandingMinor,
      topDebtors,
      overdueDebtsCount,
    },
    dataQuality,
  };
}
