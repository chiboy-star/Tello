/**
 * Global application configuration and feature policies.
 */

export const SPLASH_POLICY = {
  /**
   * Session storage key tracking whether the splash has played in the current browser tab/session.
   * Set when the splash starts. A reload in the same tab does not replay it.
   */
  sessionKey: 'tallo.splash.session',

  /**
   * Local storage key meaning "has ever seen the splash on this device".
   * Note: This key does NOT suppress the splash on web; it is an informational flag only.
   */
  hasEverSeenKey: 'tallo.intro.v1',

  /**
   * URL query parameter keys to force or suppress the splash.
   * `?splash=1` forces playback.
   * `?splash=0` suppresses playback (useful for fast E2E test runs).
   */
  forceParam: 'splash=1',
  suppressParam: 'splash=0',

  /**
   * Animation durations in milliseconds.
   */
  webDurationMs: 1900,
  pwaDurationMs: 1200,
  reducedMotionDurationMs: 800,
  maxFallbackTimeoutMs: 3500,
} as const;
