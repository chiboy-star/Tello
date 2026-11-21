'use client';

import React, { useEffect, useState, useCallback } from 'react';

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
    const target = container.querySelector(`[data-pill-id="${activeId}"]`) as HTMLElement | null;

    if (!target) return;

    const left = target.offsetLeft;
    const top = target.offsetTop;
    const width = target.offsetWidth;
    const height = target.offsetHeight;

    setStyle({
      left,
      top,
      width,
      height,
      ready: true,
    });
  }, [activeId, containerRef]);

  useEffect(() => {
    measure();

    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(containerRef.current);

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => measure());
    }

    const timer = setTimeout(() => {
      setHasMounted(true);
    }, 50);

    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, [measure, containerRef]);

  if (!style.ready) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-[var(--r-md)] z-0 ${pillClassName} ${className} ${
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
