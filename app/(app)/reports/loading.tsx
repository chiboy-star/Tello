export default function ReportsLoading() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="h-8 w-44 skeleton rounded-[var(--r-sm)]" />
          <div className="h-4 w-72 skeleton rounded-[var(--r-sm)]" />
        </div>
        <div className="h-9 w-48 skeleton rounded-[var(--r-md)]" />
      </div>

      <div className="h-28 skeleton rounded-[var(--r-md)]" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="h-24 skeleton rounded-[var(--r-md)]" />
        <div className="h-24 skeleton rounded-[var(--r-md)]" />
        <div className="h-24 skeleton rounded-[var(--r-md)]" />
        <div className="h-24 skeleton rounded-[var(--r-md)]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 skeleton rounded-[var(--r-md)]" />
        <div className="h-48 skeleton rounded-[var(--r-md)]" />
      </div>
    </div>
  );
}
