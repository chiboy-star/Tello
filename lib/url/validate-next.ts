/**
 * Validates the `next` redirect target parameter.
 * Security rules:
 * - Must start with a single '/'
 * - Must NOT start with '//' (protocol-relative URL)
 * - Must NOT contain a scheme/protocol (e.g. 'https:', 'javascript:', 'data:')
 */
export function validateNextUrl(
  nextParam: string | null | undefined,
  defaultUrl: string = '/home'
): string {
  if (!nextParam || typeof nextParam !== 'string') {
    return defaultUrl;
  }

  const trimmed = nextParam.trim();

  // Reject empty string or values not starting with '/'
  if (!trimmed.startsWith('/')) {
    return defaultUrl;
  }

  // Reject protocol-relative URLs (starts with '//')
  if (trimmed.startsWith('//')) {
    return defaultUrl;
  }

  // Reject URLs containing URI schemes (e.g. 'https://', 'javascript:')
  if (trimmed.includes('://') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return defaultUrl;
  }

  // Reject control characters or newlines
  if (/[\r\n\t]/.test(trimmed)) {
    return defaultUrl;
  }

  return trimmed;
}
