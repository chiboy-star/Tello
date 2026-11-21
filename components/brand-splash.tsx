'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

export const BRAND_NAME = 'Tallo';

interface BrandSplashProps {
  forced?: boolean;
}

export function BrandSplash({ forced }: BrandSplashProps) {
  const [active, setActive] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const dismissSplash = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setActive(false);
      delete document.documentElement.dataset.splash;
      const appRoot = document.getElementById('app-root');
      if (appRoot) {
        appRoot.removeAttribute('inert');
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
    // Check if splash should run
    const searchParams = new URLSearchParams(window.location.search);
    const splashParam = searchParams.get('splash') === '1' || forced;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari standalone detection
      navigator.standalone === true;

    let shouldShow = false;

    if (splashParam) {
      shouldShow = true;
    } else if (isStandalone) {
      const pwaCold = !sessionStorage.getItem('tallo.pwa.cold');
      if (pwaCold) {
        shouldShow = true;
        sessionStorage.setItem('tallo.pwa.cold', '1');
      }
    } else {
      const firstVisit = !localStorage.getItem('tallo.intro.v1');
      if (firstVisit) {
        shouldShow = true;
        localStorage.setItem('tallo.intro.v1', '1');
      }
    }

    if (!shouldShow && document.documentElement.dataset.splash !== '1') {
      return;
    }

    setIsPwa(isStandalone);
    setActive(true);

    // Apply inert to background root if present
    const appRoot = document.getElementById('app-root');
    if (appRoot) {
      appRoot.setAttribute('inert', '');
    }

    const totalDuration = isStandalone ? 1200 : 1900;

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

    // Hard cap 3.0s
    const hardCapTimer = setTimeout(() => {
      dismissSplash();
    }, 3000);
    timerRef.current.push(hardCapTimer);

    const timers = timerRef.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [forced, dismissSplash]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = () => handleSkip();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, handleSkip]);

  if (!active) return null;

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

            {/* Inner Rotating Group */}
            <g className="splash-inner-group">
              {/* Four White Strokes (Drop in stacked horizontally, stand upright on rotation) */}
              <line
                x1="150"
                y1="138"
                x2="150"
                y2="374"
                stroke="#FFFFFF"
                strokeWidth="36"
                strokeLinecap="round"
                className="splash-bar splash-bar-1"
              />
              <line
                x1="226"
                y1="138"
                x2="226"
                y2="374"
                stroke="#FFFFFF"
                strokeWidth="36"
                strokeLinecap="round"
                className="splash-bar splash-bar-2"
              />
              <line
                x1="302"
                y1="138"
                x2="302"
                y2="374"
                stroke="#FFFFFF"
                strokeWidth="36"
                strokeLinecap="round"
                className="splash-bar splash-bar-3"
              />
              <line
                x1="378"
                y1="138"
                x2="378"
                y2="374"
                stroke="#FFFFFF"
                strokeWidth="36"
                strokeLinecap="round"
                className="splash-bar splash-bar-4"
              />

              {/* Diagonal Amber Strike */}
              <line
                x1="112"
                y1="330"
                x2="416"
                y2="182"
                stroke="#F5B83D"
                strokeWidth="36"
                strokeLinecap="round"
                className="splash-strike"
              />
            </g>
          </svg>
        </div>

        {/* Wordmark */}
        <div className="splash-wordmark overflow-hidden pl-3 sm:pl-4">
          <span className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text)]">
            {BRAND_NAME}
          </span>
        </div>
      </div>

      {/* Progress line if cold PWA launch exceeds 2.5s */}
      {showProgress && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-32 h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--brand)] animate-pulse rounded-full w-full" />
        </div>
      )}
    </div>
  );
}
