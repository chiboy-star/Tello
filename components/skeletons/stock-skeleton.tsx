import React from 'react';

export function StockSkeleton() {
  return (
    <div data-skeleton="true" className="space-y-6 pb-12 w-full animate-in fade-in duration-100">
      {/* Header: Title + Add Item Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="h-8 w-48 skeleton rounded-[var(--r-sm)]" />
          <div className="h-4 w-64 skeleton rounded-[var(--r-sm)]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 skeleton rounded-[var(--r-md)]" />
          <div className="h-9 w-28 skeleton rounded-[var(--r-md)]" />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 skeleton rounded-[var(--r-md)]" />
        <div className="h-10 w-48 skeleton rounded-[var(--r-md)]" />
      </div>

      {/* Stock Items List */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-surface border border-border/60 rounded-[var(--r-md)] shadow-subtle"
          >
            <div className="space-y-1.5 flex-1">
              <div className="h-5 w-40 skeleton rounded-[var(--r-sm)]" />
              <div className="h-4 w-24 skeleton rounded-[var(--r-sm)]" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-6 w-16 skeleton rounded-full" />
              <div className="h-8 w-20 skeleton rounded-[var(--r-sm)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
