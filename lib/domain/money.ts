/**
 * Domain Logic: Money Operations
 * All monetary amounts are stored as integer minor units (e.g. kobo for NGN).
 * Rounding: half away from zero. Never use floating math on stored values.
 */

export function toMinor(major: number): number {
  if (isNaN(major)) return 0;
  // Round half away from zero: Math.sign(x) * Math.round(Math.abs(x))
  const sign = major < 0 ? -1 : 1;
  const scaled = Math.abs(major) * 100;
  // Account for floating precision like 0.1 + 0.2 = 0.30000000000000004
  const rounded = Math.round(Number(scaled.toFixed(6)));
  return sign * rounded;
}

export function fromMinor(minor: number | bigint): number {
  const num = typeof minor === 'bigint' ? Number(minor) : minor;
  if (isNaN(num)) return 0;
  return num / 100;
}

export function formatMoney(
  minor: number | bigint | null | undefined,
  currency = 'NGN',
  locale = 'en-NG'
): string {
  if (minor === null || minor === undefined) return '₦0.00';
  const major = fromMinor(minor);
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `₦${major.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Parses spoken or shorthand amounts such as "5k" -> 500000 minor units (5,000 NGN)
 * "2.5k" -> 250000 minor units (2,500 NGN)
 * "500" -> 50000 minor units (500 NGN)
 * "1m" -> null (unsupported per spec)
 */
export function parseSpokenAmount(input: string): number | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();

  // Unsupported formats like "1m"
  if (trimmed.endsWith('m')) {
    return null;
  }

  // Handle 'k' multiplier
  const kMatch = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)\s*k$/);
  if (kMatch) {
    const val = parseFloat(kMatch[1]);
    if (isNaN(val)) return null;
    return toMinor(val * 1000);
  }

  // Direct number
  const numMatch = trimmed.match(/^[0-9]+(?:\.[0-9]+)?$/);
  if (numMatch) {
    const val = parseFloat(numMatch[0]);
    if (isNaN(val)) return null;
    return toMinor(val);
  }

  return null;
}
