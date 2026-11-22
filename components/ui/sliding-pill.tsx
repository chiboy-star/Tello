'use client';

import React, { useLayoutEffect, useEffect, useState, useCallback } from 'react';

// SSR-safe layout effect
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface SlidingPillProps {
  activeId: string;
  containerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  pillClassName?: string;
}

export function SlidingPill({
  activeId,
  containerRef,
  className = '',
  pillClassName = 'bg-[var(--surface)] text-[var(--brand)] shadow-subtle',
}: SlidingPillProps) {
  const [style, setStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    ready: boolean;
  }>({ left: 0, top: 0, width: 0, height: 0, ready: false });

  const [hasMounted, setHasMounted] = useState(false);

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    
    // If activeId is empty or null, do not render a pill
    if (!activeId) {
      setStyle((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }

    const target = container.querySelector(`[data-pill-id="${activeId}"]`) as HTMLElement | null;
    if (!target) {
      setStyle((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }

    // Use getBoundingClientRect relative to container for exact geometry across flex/margins/paddings
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const left = targetRect.left - containerRect.left;
    const top = targetRect.top - containerRect.top;
    const width = targetRect.width;
    const height = targetRect.height;

    setStyle({
      left,
      top,
      width,
      height,
      ready: true,
    });
  }, [activeId, containerRef]);

  useIsomorphicLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    measure();

    if (!containerRef.current) return;
    const container = containerRef.current;

    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(container);

    const handlePointerDown = (e: PointerEvent) => {
      const clickedPill = (e.target as HTMLElement).closest('[data-pill-id]');
      if (clickedPill) {
        const id = clickedPill.getAttribute('data-pill-id');
        if (id) {
          const containerRect = container.getBoundingClientRect();
          const targetRect = clickedPill.getBoundingClientRect();
          setStyle({
            left: targetRect.left - containerRect.left,
            top: targetRect.top - containerRect.top,
            width: targetRect.width,
            height: targetRect.height,
            ready: true,
          });
        }
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => measure());
    }

    const timer = setTimeout(() => {
      setHasMounted(true);
    }, 50);

    return () => {
      ro.disconnect();
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      clearTimeout(timer);
    };
  }, [measure, containerRef]);

  if (!style.ready || !activeId) return null;

  return (
    <div
      aria-hidden="true"
      data-sliding-pill="true"
      className={`pointer-events-none absolute left-0 top-0 rounded-[var(--r-md)] z-0 ${pillClassName} ${className} ${
        hasMounted
          ? 'transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]'
          : 'transition-none'
      }`}
      style={{
        transform: `translate3d(${style.left}px, ${style.top}px, 0)`,
        width: `${style.width}px`,
        height: `${style.height}px`,
      }}
    />
  );
}
