'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SPLASH_POLICY } from '@/lib/config';
import { isAppReady } from '@/components/app-ready';

export const BRAND_NAME = 'Tallo';

interface BrandSplashProps {
  forced?: boolean;
}

export function BrandSplash({ forced }: BrandSplashProps) {
  const [dismissed, setDismissed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const introDoneRef = useRef(false);
  const appReadyRef = useRef(false);
  const closingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const dismissSplash = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setIsReducedMotion(reducedMotion);
    setIsPwa(isStandalone);

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

    // Mark active in DOM
    document.documentElement.dataset.splash = '1';

    const appRoot = document.getElementById('app-root');
    if (appRoot) {
      appRoot.setAttribute('inert', '');
    }

    // Minimum intro duration
    const introDuration = reducedMotion
      ? 0
      : isStandalone
      ? SPLASH_POLICY.pwaDurationMs // 1100ms
      : SPLASH_POLICY.webDurationMs; // 1900ms

    // Check if app already signaled ready before splash mounted
    if (isAppReady()) {
      appReadyRef.current = true;
    }

    const checkReadyAndDismiss = () => {
      if (closingRef.current) return;
      if (introDoneRef.current && appReadyRef.current) {
        dismissSplash();
      } else if (introDoneRef.current && !appReadyRef.current) {
        if (!reducedMotion) {
          setIsLooping(true);
        }
      }
    };

    // Listen for custom app-ready signal
    const onAppReady = () => {
      appReadyRef.current = true;
      checkReadyAndDismiss();
    };

    window.addEventListener('tallo:app-ready', onAppReady);

    // Timer 1: Minimum intro choreography time
    const introTimer = setTimeout(() => {
      introDoneRef.current = true;
      checkReadyAndDismiss();
    }, introDuration);
    timerRef.current.push(introTimer);

    // Timer 2: 8s safety cap
    const safetyCapTimer = setTimeout(() => {
      if (!closingRef.current) {
        console.warn('[BrandSplash] Safety cap 8s reached before app ready signal. Fading splash.');
        dismissSplash();
      }
    }, SPLASH_POLICY.maxSafetyTimeoutMs);
    timerRef.current.push(safetyCapTimer);

    const timers = timerRef.current;
    return () => {
      window.removeEventListener('tallo:app-ready', onAppReady);
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
      } ${isPwa ? 'pwa-timing' : 'normal-timing'} ${isLooping ? 'splash-looping' : ''} ${
        isReducedMotion ? 'reduced-motion' : ''
      }`}
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
              {/* Four Vertical Tally Marks */}
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
    </div>
  );
}
