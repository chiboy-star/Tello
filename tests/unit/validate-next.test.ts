import { describe, it, expect } from 'vitest';
import { validateNextUrl } from '@/lib/url/validate-next';

describe('validateNextUrl Specification Tests', () => {
  it('accepts safe relative paths starting with single /', () => {
    expect(validateNextUrl('/home')).toBe('/home');
    expect(validateNextUrl('/sell')).toBe('/sell');
    expect(validateNextUrl('/stock?status=low')).toBe('/stock?status=low');
    expect(validateNextUrl('/debts/123')).toBe('/debts/123');
    expect(validateNextUrl('/reports?period=month')).toBe('/reports?period=month');
  });

  it('rejects null, undefined, or empty string and returns defaultUrl', () => {
    expect(validateNextUrl(null)).toBe('/home');
    expect(validateNextUrl(undefined)).toBe('/home');
    expect(validateNextUrl('')).toBe('/home');
    expect(validateNextUrl('   ')).toBe('/home');
    expect(validateNextUrl(null, '/custom')).toBe('/custom');
  });

  it('rejects protocol-relative URLs starting with //', () => {
    expect(validateNextUrl('//evil.com')).toBe('/home');
    expect(validateNextUrl('//evil.com/phish')).toBe('/home');
    expect(validateNextUrl('///evil.com')).toBe('/home');
  });

  it('rejects absolute URLs containing schemes', () => {
    expect(validateNextUrl('https://evil.com')).toBe('/home');
    expect(validateNextUrl('http://attacker.com/home')).toBe('/home');
    expect(validateNextUrl('javascript:alert(1)')).toBe('/home');
    expect(validateNextUrl('data:text/html,<script>evil()</script>')).toBe('/home');
  });

  it('rejects strings that do not start with /', () => {
    expect(validateNextUrl('home')).toBe('/home');
    expect(validateNextUrl('evil.com')).toBe('/home');
  });
});
