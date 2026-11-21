import React from 'react';

export function HomeSkeleton() {
  return (
    <div data-skeleton="true" className="space-y-6 pb-12 w-full animate-in fade-in duration-100">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-48 skeleton rounded-[var(--r-sm)]" />
            <div className="h-5 w-24 skeleton rounded-full" />
          </div>
          <div className="h-4 w-44 skeleton rounded-[var(--r-sm)]" />
        </div>
        <div className="h-10 w-32 skeleton rounded-[var(--r-md)]" />
      </div>

      {/* Today's Totals Strip (3 KPI cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="h-24 skeleton rounded-[var(--r-md)] border border-border/40" />
        <div className="h-24 skeleton rounded-[var(--r-md)] border border-border/40" />
        <div className="h-24 skeleton rounded-[var(--r-md)] border border-border/40" />
      </div>

      {/* Quick Sell Grid Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 skeleton rounded-[var(--r-sm)]" />
          <div className="h-4 w-20 skeleton rounded-[var(--r-sm)]" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-[var(--r-md)] border border-border/40" />
          ))}
        </div>
      </div>

      {/* Checklist / Recent Entries Skeleton */}
      <div className="h-44 skeleton rounded-[var(--r-lg)] border border-border/40" />
    </div>
  );
}
