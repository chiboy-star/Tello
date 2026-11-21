import React from 'react';

export function SellSkeleton() {
  return (
    <div data-skeleton="true" className="space-y-6 pb-24 w-full animate-in fade-in duration-100">
      {/* Header */}
      <div className="space-y-1">
        <div className="h-8 w-40 skeleton rounded-[var(--r-sm)]" />
        <div className="h-4 w-64 skeleton rounded-[var(--r-sm)]" />
      </div>

      {/* Mode switcher */}
      <div className="h-10 w-full max-w-md skeleton rounded-[var(--r-md)]" />

      {/* Tap Items Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-28 skeleton rounded-[var(--r-md)] border border-border/40 p-3 flex flex-col justify-between"
          >
            <div className="h-4 w-24 skeleton rounded-[var(--r-sm)]" />
            <div className="space-y-1">
              <div className="h-5 w-16 skeleton rounded-[var(--r-sm)]" />
              <div className="h-3 w-12 skeleton rounded-[var(--r-sm)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
