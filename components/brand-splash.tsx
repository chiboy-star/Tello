'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SPLASH_POLICY } from '@/lib/config';

export const BRAND_NAME = 'Tallo';

interface BrandSplashProps {
  forced?: boolean;
}

export function BrandSplash({ forced }: BrandSplashProps) {
  // Start dismissed as false so HTML is always server-rendered into root layout
  const [dismissed, setDismissed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const dismissSplash = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setDismissed(true);
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.splash = '0';
        const appRoot = document.getElementById('app-root');
        if (appRoot) {
          appRoot.removeAttribute('inert');
        }
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SPLASH_POLICY.hasEverSeenKey, '1');
        } catch {}
      }
    }, 200);
  }, []);

  const handleSkip = useCallback(() => {
    // Skippable on first web visit (or presentation)
    if (!isPwa) {
      dismissSplash();
    }
  }, [isPwa, dismissSplash]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const hasForce = searchParams.get('splash') === '1' || forced;
    const hasSuppress = searchParams.get('splash') === '0';
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari standalone detection
      navigator.standalone === true;

    const isDataSplashSet = document.documentElement.dataset.splash === '1';

    let shouldShow = false;
    if (hasSuppress) {
      shouldShow = false;
    } else if (hasForce || isDataSplashSet) {
      shouldShow = true;
      try {
        sessionStorage.setItem(SPLASH_POLICY.sessionKey, '1');
      } catch {}
    } else {
      const sessionSeen = sessionStorage.getItem(SPLASH_POLICY.sessionKey);
      if (!sessionSeen) {
        shouldShow = true;
        try {
          sessionStorage.setItem(SPLASH_POLICY.sessionKey, '1');
          localStorage.setItem(SPLASH_POLICY.hasEverSeenKey, '1');
        } catch {}
      }
    }

    if (!shouldShow) {
      setDismissed(true);
      document.documentElement.dataset.splash = '0';
      return;
    }

    // Ensure data-splash is active
    document.documentElement.dataset.splash = '1';
    setIsPwa(isStandalone);

    // Apply inert to background root if present
    const appRoot = document.getElementById('app-root');
    if (appRoot) {
      appRoot.setAttribute('inert', '');
    }

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const totalDuration = isReducedMotion
      ? SPLASH_POLICY.reducedMotionDurationMs
      : isStandalone
      ? SPLASH_POLICY.pwaDurationMs
      : SPLASH_POLICY.webDurationMs;

    // Show thin progress line if cold PWA launch takes over 2.5s
    const progressTimer = setTimeout(() => {
      setShowProgress(true);
    }, 2500);
    timerRef.current.push(progressTimer);

    // Dismissal timer
    const closeTimer = setTimeout(() => {
      dismissSplash();
    }, totalDuration);
    timerRef.current.push(closeTimer);

    // Hard cap 3.5s per spec
    const hardCapTimer = setTimeout(() => {
      dismissSplash();
    }, SPLASH_POLICY.maxFallbackTimeoutMs);
    timerRef.current.push(hardCapTimer);

    const timers = timerRef.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [forced, dismissSplash]);

  useEffect(() => {
    if (dismissed) return;
    const onKeyDown = () => handleSkip();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dismissed, handleSkip]);

  if (dismissed) return null;

  return (
    <div
      id="brand-splash"
      role="status"
      aria-label="Loading Tallo"
      onClick={handleSkip}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg)] transition-opacity duration-200 select-none ${
        closing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${isPwa ? 'pwa-timing' : 'normal-timing'}`}
    >
      <div className="splash-lockup flex items-center justify-center">
        {/* Tally Mark Icon Container */}
        <div className="splash-mark relative h-20 w-20 sm:h-24 sm:w-24">
          <svg
            viewBox="0 0 512 512"
            className="h-full w-full splash-svg overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Green Squircle */}
            <rect
              width="512"
              height="512"
              rx="112"
              fill="#0E7C57"
              className="splash-squircle"
            />

            {/* Inner Rotating Group (starts at -90deg, rotates to 0deg) */}
            <g className="splash-inner-group">
              {/* Four Vertical Tally Marks (Stacked Horizontally during entry) */}
              <rect
                x="100"
                y="96"
                width="40"
                height="320"
                rx="20"
                fill="#F7F6F2"
                className="splash-bar splash-bar-1"
              />
              <rect
                x="184"
                y="96"
                width="40"
                height="320"
                rx="20"
                fill="#F7F6F2"
                className="splash-bar splash-bar-2"
              />
              <rect
                x="268"
                y="96"
                width="40"
                height="320"
                rx="20"
                fill="#F7F6F2"
                className="splash-bar splash-bar-3"
              />
              <rect
                x="352"
                y="96"
                width="40"
                height="320"
                rx="20"
                fill="#F7F6F2"
                className="splash-bar splash-bar-4"
              />

              {/* Amber Diagonal Strike (slashes across stack) */}
              <line
                x1="80"
                y1="420"
                x2="432"
                y2="92"
                stroke="#F5B83D"
                strokeWidth="44"
                strokeLinecap="round"
                className="splash-strike"
              />
            </g>
          </svg>
        </div>

        {/* Wordmark (slides in during mark upright rotation) */}
        <div className="splash-wordmark-container overflow-hidden pl-4 sm:pl-6">
          <span className="splash-wordmark block font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text)]">
            {BRAND_NAME}
          </span>
        </div>
      </div>

      {/* Thin progress line if cold launch stalls > 2.5s */}
      {showProgress && (
        <div
          role="progressbar"
          aria-label="Starting application"
          className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-[var(--border)] overflow-hidden rounded-full"
        >
          <div className="splash-progress-bar h-full bg-[var(--brand)] w-full"></div>
        </div>
      )}
    </div>
  );
}
