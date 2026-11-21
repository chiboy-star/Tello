import React from 'react';

export function DebtsSkeleton() {
  return (
    <div data-skeleton="true" className="space-y-6 pb-12 w-full animate-in fade-in duration-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="h-8 w-56 skeleton rounded-[var(--r-sm)]" />
          <div className="h-4 w-72 skeleton rounded-[var(--r-sm)]" />
        </div>
        <div className="h-9 w-32 skeleton rounded-[var(--r-md)]" />
      </div>

      {/* Search */}
      <div className="h-10 w-full skeleton rounded-[var(--r-md)]" />

      {/* Customer Ledger Table */}
      <div className="rounded-[var(--r-lg)] border border-border/60 bg-surface overflow-hidden shadow-subtle">
        <div className="border-b border-border p-4 bg-surface-2/40 flex justify-between">
          <div className="h-4 w-28 skeleton rounded-[var(--r-sm)]" />
          <div className="h-4 w-20 skeleton rounded-[var(--r-sm)]" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="space-y-1.5">
                <div className="h-5 w-36 skeleton rounded-[var(--r-sm)]" />
                <div className="h-4 w-24 skeleton rounded-[var(--r-sm)]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-20 skeleton rounded-full" />
                <div className="h-8 w-24 skeleton rounded-[var(--r-sm)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
