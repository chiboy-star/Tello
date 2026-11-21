export function PricesSkeleton() {
  return (
    <div data-skeleton="true" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-7 w-64 skeleton rounded-[var(--r-sm)]"></div>
          <div className="h-4 w-48 skeleton rounded-[var(--r-sm)]"></div>
        </div>
        <div className="h-10 w-32 skeleton rounded-[var(--r-sm)]"></div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-8 w-24 skeleton rounded-full"></div>
        <div className="h-8 w-24 skeleton rounded-full"></div>
        <div className="h-8 w-24 skeleton rounded-full"></div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3.5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="space-y-1">
              <div className="h-5 w-36 skeleton rounded-[var(--r-sm)]"></div>
              <div className="h-3.5 w-24 skeleton rounded-[var(--r-sm)]"></div>
            </div>
            <div className="h-9 w-28 skeleton rounded-[var(--r-sm)]"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
