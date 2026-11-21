import { differenceInCalendarDays, subDays, addDays, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from './time';

export interface ForecastItem {
  id: string;
  name: string;
  current_qty: number;
  reorder_lead_days: number;
  created_at: string | Date;
}

export interface SaleEntry {
  item_id: string;
  quantity: number;
  occurred_at: string | Date;
  voided_at?: string | Date | null;
}

export type ForecastStatus = 'out' | 'critical' | 'low' | 'overstocked' | 'no_data' | 'ok';
export type ForecastConfidence = 'low' | 'medium' | 'high';

export interface ForecastResult {
  itemId: string;
  currentQty: number;
  avgDaily: number;
  daysLeft: number | null;
  runOutDate: Date | null;
  trendPct: number | null;
  confidence: ForecastConfidence;
  status: ForecastStatus;
  suggestedReorderQty: number;
}

/**
 * Deterministic, explainable stock forecast based on 14-day trailing window.
 * Excludes today (partial day).
 */
export function computeStockForecast(
  item: ForecastItem,
  sales: SaleEntry[],
  today: Date = new Date(),
  tz = DEFAULT_TIMEZONE
): ForecastResult {
  const currentQty = Number(item.current_qty) || 0;
  const leadDays = item.reorder_lead_days ?? 7;

  // Convert today to zoned date
  const zonedToday = toZonedTime(today, tz);
  const yesterday = subDays(zonedToday, 1);
  const windowStart = subDays(yesterday, 13); // 14 full days ending yesterday

  // Filter valid sales for this item in window [windowStart, yesterday]
  const validSales = sales.filter((s) => {
    if (s.item_id !== item.id) return false;
    if (s.voided_at) return false;
    const saleDate = toZonedTime(new Date(s.occurred_at), tz);
    // Exclude today's sales
    if (isSameDay(saleDate, zonedToday) || saleDate > yesterday) return false;
    return saleDate >= windowStart && saleDate <= yesterday;
  });

  // Spec formula:
  // WINDOW = 14 full days ending yesterday (today is partial; exclude it)
  // historyDays = days between max(item.created_at, first sale in window) and yesterday, inclusive
  // effectiveDays = clamp(historyDays, 1, 14)
  const itemCreatedAtZoned = toZonedTime(new Date(item.created_at), tz);
  let firstSaleInWindow: Date | null = null;
  if (validSales.length > 0) {
    const saleDates = validSales.map((s) => toZonedTime(new Date(s.occurred_at), tz).getTime());
    firstSaleInWindow = new Date(Math.min(...saleDates));
  }

  const anchorDate = firstSaleInWindow
    ? (firstSaleInWindow > itemCreatedAtZoned ? firstSaleInWindow : itemCreatedAtZoned)
    : itemCreatedAtZoned;

  const rawHistoryDays = differenceInCalendarDays(yesterday, anchorDate) + 1;
  const historyDays = Math.max(1, rawHistoryDays);
  const effectiveDays = Math.min(Math.max(historyDays, 1), 14);

  const totalUnitsSold = validSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const avgDaily = effectiveDays > 0 ? totalUnitsSold / effectiveDays : 0;

  // Confidence
  let confidence: ForecastConfidence = 'high';
  if (historyDays < 3) {
    confidence = 'low';
  } else if (historyDays < 7) {
    confidence = 'medium';
  }

  // Days left & run-out date
  let daysLeft: number | null = null;
  let runOutDate: Date | null = null;

  if (currentQty <= 0) {
    daysLeft = 0;
    runOutDate = zonedToday;
  } else if (avgDaily > 0) {
    daysLeft = currentQty / avgDaily;
    runOutDate = addDays(zonedToday, Math.floor(daysLeft));
  } else {
    daysLeft = null;
    runOutDate = null;
  }

  // Trend %: (last 7d units - previous 7d units) / previous 7d units
  const last7dStart = subDays(yesterday, 6);
  const prev7dStart = subDays(yesterday, 13);
  const prev7dEnd = subDays(yesterday, 7);

  let last7dUnits = 0;
  let prev7dUnits = 0;

  validSales.forEach((s) => {
    const sDate = toZonedTime(new Date(s.occurred_at), tz);
    if (sDate >= last7dStart && sDate <= yesterday) {
      last7dUnits += Number(s.quantity) || 0;
    } else if (sDate >= prev7dStart && sDate <= prev7dEnd) {
      prev7dUnits += Number(s.quantity) || 0;
    }
  });

  let trendPct: number | null = null;
  if (prev7dUnits > 0) {
    trendPct = (last7dUnits - prev7dUnits) / prev7dUnits;
  }

  // Status determination
  let status: ForecastStatus = 'ok';
  if (currentQty <= 0) {
    status = 'out';
  } else if (daysLeft !== null && daysLeft <= 2) {
    status = 'critical';
  } else if (daysLeft !== null && daysLeft <= leadDays) {
    status = 'low';
  } else if (daysLeft !== null && daysLeft > 45) {
    status = 'overstocked';
  } else if (daysLeft === null) {
    status = 'no_data';
  } else {
    status = 'ok';
  }

  // Suggested reorder quantity
  // suggestedReorderQty = max(0, ceil(avgDaily * (reorder_lead_days + 7) - current_qty))
  const targetBuffer = avgDaily * (leadDays + 7);
  const suggestedReorderQty = Math.max(0, Math.ceil(targetBuffer - currentQty));

  return {
    itemId: item.id,
    currentQty,
    avgDaily: Number(avgDaily.toFixed(2)),
    daysLeft: daysLeft !== null ? Number(daysLeft.toFixed(1)) : null,
    runOutDate,
    trendPct: trendPct !== null ? Number(trendPct.toFixed(2)) : null,
    confidence,
    status,
    suggestedReorderQty,
  };
}
