import { describe, it, expect } from 'vitest';
import { toMinor, fromMinor, formatMoney, parseSpokenAmount } from '@/lib/domain/money';

describe('money.ts domain tests', () => {
  it('converts major to minor correctly with rounding', () => {
    expect(toMinor(12.34)).toBe(1234);
    expect(toMinor(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30
    expect(toMinor(10.555)).toBe(1056);
    expect(toMinor(10.554)).toBe(1055);
    expect(toMinor(10.5)).toBe(1050);
  });

  it('converts minor to major correctly', () => {
    expect(fromMinor(1234)).toBe(12.34);
    expect(fromMinor(500000)).toBe(5000);
    expect(fromMinor(0)).toBe(0);
  });

  it('formats NGN money correctly', () => {
    const formatted = formatMoney(500000, 'NGN', 'en-NG');
    expect(formatted).toContain('5,000');
  });

  it('parses spoken and shorthand amounts', () => {
    expect(parseSpokenAmount('5k')).toBe(500000);
    expect(parseSpokenAmount('2.5k')).toBe(250000);
    expect(parseSpokenAmount('500')).toBe(50000);
    expect(parseSpokenAmount('1m')).toBeNull(); // 1m is not supported per spec
    expect(parseSpokenAmount('garbage text')).toBeNull();
    expect(parseSpokenAmount('')).toBeNull();
  });
});
