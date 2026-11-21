export default function StockLoading() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="h-8 w-48 skeleton rounded-[var(--r-sm)]" />
          <div className="h-4 w-64 skeleton rounded-[var(--r-sm)]" />
        </div>
        <div className="h-9 w-28 skeleton rounded-[var(--r-md)]" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 skeleton rounded-[var(--r-md)]" />
        <div className="h-10 w-44 skeleton rounded-[var(--r-md)]" />
      </div>

      <div className="h-80 skeleton rounded-[var(--r-md)]" />
    </div>
  );
}
