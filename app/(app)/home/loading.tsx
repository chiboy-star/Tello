export default function HomeLoading() {
  return (
    <div className="space-y-6 pb-12">
      {/* Header skeleton */}
      <div className="flex flex-col gap-1">
        <div className="h-8 w-56 skeleton rounded-[var(--r-sm)]" />
        <div className="h-4 w-40 skeleton rounded-[var(--r-sm)]" />
      </div>

      {/* Today Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="h-28 skeleton rounded-[var(--r-md)]" />
        <div className="h-28 skeleton rounded-[var(--r-md)]" />
        <div className="h-28 skeleton rounded-[var(--r-md)]" />
      </div>

      {/* Quick Sell Strip */}
      <div className="space-y-2">
        <div className="h-4 w-28 skeleton rounded-[var(--r-sm)]" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="h-20 skeleton rounded-[var(--r-md)]" />
          <div className="h-20 skeleton rounded-[var(--r-md)]" />
          <div className="h-20 skeleton rounded-[var(--r-md)]" />
          <div className="h-20 skeleton rounded-[var(--r-md)]" />
        </div>
      </div>

      {/* Grid: Running Low & Who Owes You */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-56 skeleton rounded-[var(--r-md)]" />
        <div className="h-56 skeleton rounded-[var(--r-md)]" />
      </div>
    </div>
  );
}
