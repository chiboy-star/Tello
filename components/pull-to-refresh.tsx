'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { flushOfflineQueue } from '@/lib/offline/queue';

interface PullToRefreshProps {
  children: React.ReactNode;
}

export function PullToRefresh({ children }: PullToRefreshProps) {
  const queryClient = useQueryClient();
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const [isPulling, setIsPulling] = useState(false);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari detection
      navigator.standalone === true;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    setIsStandalone(standalone && isTouch);
    setIsReducedMotion(reduced);
  }, []);

  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullY(72);

    if (!navigator.onLine) {
      setOfflineNotice(true);
      setTimeout(() => {
        setOfflineNotice(false);
        setIsRefreshing(false);
        setPullY(0);
      }, 1200);
      return;
    }

    const minWait = new Promise((resolve) => setTimeout(resolve, 400));
    const safetyCap = new Promise((resolve) => setTimeout(resolve, 8000));

    const refreshWork = Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['checklist'] }),
      queryClient.invalidateQueries({ queryKey: ['items'] }),
      flushOfflineQueue(),
    ]);

    await Promise.race([Promise.all([refreshWork, minWait]), safetyCap]);

    // 200ms finish transition
    setIsFinishing(true);
    setTimeout(() => {
      setIsFinishing(false);
      setIsRefreshing(false);
      setPullY(0);
    }, 200);
  }, [queryClient]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isStandalone || isRefreshing) return;

    // Check if at scroll top
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 0) return;

    // Do not trigger if any Drawer or Dialog is currently open
    if (document.querySelector('[role="dialog"]') || document.querySelector('[data-vaul-drawer]')) {
      return;
    }

    startYRef.current = e.touches[0].clientY;
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 0) {
      setIsPulling(false);
      setPullY(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    if (deltaY > 0) {
      // Resistance curve: pull distance is 0.5 of finger distance
      const distance = Math.min(96, deltaY * 0.5);
      setPullY(distance);
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling || isRefreshing) return;
    setIsPulling(false);

    if (pullY >= 72) {
      triggerRefresh();
    } else {
      setPullY(0);
    }
  };

  // Normalized progress (0 to 1)
  const progress = Math.min(1, pullY / 72);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overscroll-y-contain"
    >
      {/* Pull To Refresh Header Indicator (Only visible when pulled or refreshing) */}
      {isStandalone && (pullY > 0 || isRefreshing) && (
        <div
          aria-hidden="true"
          style={{
            transform: `translateY(${pullY - 56}px)`,
            opacity: Math.min(1, pullY / 40),
            transition: isPulling ? 'none' : 'transform 200ms ease-out, opacity 200ms ease-out',
          }}
          className="fixed top-0 inset-x-0 z-40 flex items-center justify-center pointer-events-none"
        >
          <div className="flex flex-col items-center justify-center rounded-full bg-[var(--surface)] p-2 shadow-md border border-[var(--border)]">
            {offlineNotice ? (
              <span className="text-[11px] font-semibold text-[var(--warning)] px-2 py-0.5">
                You&apos;re offline
              </span>
            ) : isReducedMotion ? (
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="w-5 h-5 rounded bg-[var(--brand)]" />
                <div className="w-12 h-1 bg-[var(--surface-2)] rounded overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand)] transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              /* Tally Brand Logo Indicator */
              <svg
                viewBox="0 0 512 512"
                width={36}
                height={36}
                className={`overflow-visible ${isRefreshing ? 'animate-pulse' : ''}`}
                fill="none"
              >
                {/* Background Squircle */}
                <rect width="512" height="512" rx="112" fill="#0E7C57" />

                {/* 4 Vertical Tally Marks drawn sequentially */}
                <g stroke="#FFFFFF" strokeWidth="36" strokeLinecap="round">
                  {progress >= 0.2 && <line x1="150" y1="138" x2="150" y2="374" />}
                  {progress >= 0.4 && <line x1="226" y1="138" x2="226" y2="374" />}
                  {progress >= 0.6 && <line x1="302" y1="138" x2="302" y2="374" />}
                  {progress >= 0.8 && <line x1="378" y1="138" x2="378" y2="374" />}
                </g>

                {/* Amber Diagonal Strike (appears at threshold >= 72px / progress >= 0.95 or when refreshing) */}
                {(progress >= 0.95 || isRefreshing || isFinishing) && (
                  <line
                    x1="112"
                    y1="330"
                    x2="416"
                    y2="182"
                    stroke="#F5B83D"
                    strokeWidth="36"
                    strokeLinecap="round"
                    className={isRefreshing ? 'animate-pulse' : isFinishing ? 'stroke-[42]' : ''}
                  />
                )}
              </svg>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
