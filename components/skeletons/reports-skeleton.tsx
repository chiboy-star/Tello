import React from 'react';

export function ReportsSkeleton() {
  return (
    <div data-skeleton="true" className="space-y-6 pb-12 w-full animate-in fade-in duration-100">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="h-8 w-44 skeleton rounded-[var(--r-sm)]" />
          <div className="h-4 w-72 skeleton rounded-[var(--r-sm)]" />
        </div>
        <div className="h-9 w-48 skeleton rounded-[var(--r-md)]" />
      </div>

      {/* Period Narrative Banner */}
      <div className="h-28 skeleton rounded-[var(--r-md)] border border-border/40" />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="h-24 skeleton rounded-[var(--r-md)] border border-border/40" />
        <div className="h-24 skeleton rounded-[var(--r-md)] border border-border/40" />
        <div className="h-24 skeleton rounded-[var(--r-md)] border border-border/40" />
        <div className="h-24 skeleton rounded-[var(--r-md)] border border-border/40" />
      </div>

      {/* Top Sellers & Debts Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-56 skeleton rounded-[var(--r-md)] border border-border/40" />
        <div className="h-56 skeleton rounded-[var(--r-md)] border border-border/40" />
      </div>
    </div>
  );
}
