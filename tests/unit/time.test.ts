import { describe, it, expect } from 'vitest';
import { getLocalDateString, getStartOfWeek, periodRange } from '@/lib/domain/time';

describe('time.ts domain tests', () => {
  it('correctly attributes a sale at 23:30 Lagos time to local day, not next UTC day', () => {
    // 23:30 Lagos (UTC+1) is 22:30 UTC of the same day
    const lagosLateNight = new Date('2026-11-20T22:30:00Z'); // 23:30 Lagos time
    const localDay = getLocalDateString(lagosLateNight, 'Africa/Lagos');
    expect(localDay).toBe('2026-11-20');

    // 00:30 Lagos (UTC+1) is 23:30 UTC of previous day
    const lagosEarlyMorning = new Date('2026-11-20T23:30:00Z'); // 00:30 Lagos Nov 21
    const localNextDay = getLocalDateString(lagosEarlyMorning, 'Africa/Lagos');
    expect(localNextDay).toBe('2026-11-21');
  });

  it('getStartOfWeek returns Monday', () => {
    // 2026-11-21 is Saturday, start of week (Monday) is 2026-11-16
    const date = new Date('2026-11-21T12:00:00Z');
    const monday = getStartOfWeek(date, 'Africa/Lagos');
    expect(monday.getDay()).toBe(1); // Monday is 1
  });

  it('computes period range correctly for week and month', () => {
    const anchor = new Date('2026-11-21T12:00:00Z');
    const week = periodRange('week', anchor, 'Africa/Lagos');
    expect(week.startDateString).toBe('2026-11-16'); // Monday
    expect(week.endDateString).toBe('2026-11-22');   // Sunday

    const month = periodRange('month', anchor, 'Africa/Lagos');
    expect(month.startDateString).toBe('2026-11-01');
    expect(month.endDateString).toBe('2026-11-30');
  });
});
