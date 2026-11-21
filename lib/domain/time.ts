import {
  startOfWeek as dfStartOfWeek,
  endOfWeek as dfEndOfWeek,
  startOfMonth as dfStartOfMonth,
  endOfMonth as dfEndOfMonth,
} from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Africa/Lagos';

/**
 * Returns the local date string (YYYY-MM-DD) for a given timestamp in the user's timezone.
 */
export function getLocalDateString(date: Date | string | number, tz = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatInTimeZone(d, tz, 'yyyy-MM-dd');
}

/**
 * Returns start of week (Monday) for a given date in the user's timezone.
 */
export function getStartOfWeek(date: Date, tz = DEFAULT_TIMEZONE): Date {
  const zoned = toZonedTime(date, tz);
  const start = dfStartOfWeek(zoned, { weekStartsOn: 1 }); // Monday
  return fromZonedTime(start, tz);
}

export interface PeriodRange {
  start: Date;
  end: Date;
  startDateString: string;
  endDateString: string;
}

/**
 * Computes period start and end for week or month bucketing in user timezone.
 */
export function periodRange(
  period: 'week' | 'month',
  anchorDate: Date = new Date(),
  tz = DEFAULT_TIMEZONE
): PeriodRange {
  const zoned = toZonedTime(anchorDate, tz);
  let startZoned: Date;
  let endZoned: Date;

  if (period === 'week') {
    startZoned = dfStartOfWeek(zoned, { weekStartsOn: 1 });
    endZoned = dfEndOfWeek(zoned, { weekStartsOn: 1 });
  } else {
    startZoned = dfStartOfMonth(zoned);
    endZoned = dfEndOfMonth(zoned);
  }

  const startUtc = fromZonedTime(startZoned, tz);
  const endUtc = fromZonedTime(endZoned, tz);

  return {
    start: startUtc,
    end: endUtc,
    startDateString: formatInTimeZone(startUtc, tz, 'yyyy-MM-dd'),
    endDateString: formatInTimeZone(endUtc, tz, 'yyyy-MM-dd'),
  };
}
