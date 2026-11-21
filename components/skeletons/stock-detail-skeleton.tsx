export function StockDetailSkeleton() {
  return (
    <div data-skeleton="true" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 skeleton rounded-[var(--r-sm)]"></div>
        <div className="space-y-1.5">
          <div className="h-7 w-48 skeleton rounded-[var(--r-sm)]"></div>
          <div className="h-4 w-32 skeleton rounded-[var(--r-sm)]"></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="h-24 skeleton rounded-[var(--r-md)]"></div>
        <div className="h-24 skeleton rounded-[var(--r-md)]"></div>
        <div className="h-24 skeleton rounded-[var(--r-md)]"></div>
        <div className="h-24 skeleton rounded-[var(--r-md)]"></div>
      </div>

      <div className="rounded-[var(--r-md)] border border-[var(--border)] p-4 space-y-3 bg-[var(--surface)]">
        <div className="h-5 w-32 skeleton rounded-[var(--r-sm)]"></div>
        <div className="h-10 w-full skeleton rounded-[var(--r-sm)]"></div>
        <div className="h-10 w-full skeleton rounded-[var(--r-sm)]"></div>
        <div className="h-10 w-32 skeleton rounded-[var(--r-sm)]"></div>
      </div>

      <div className="rounded-[var(--r-md)] border border-[var(--border)] p-4 space-y-4 bg-[var(--surface)]">
        <div className="h-5 w-40 skeleton rounded-[var(--r-sm)]"></div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-[var(--border)]/50">
              <div className="space-y-1">
                <div className="h-4 w-28 skeleton rounded-[var(--r-sm)]"></div>
                <div className="h-3 w-16 skeleton rounded-[var(--r-sm)]"></div>
              </div>
              <div className="h-4 w-16 skeleton rounded-[var(--r-sm)]"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
