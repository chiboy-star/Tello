export default function DebtsLoading() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="h-8 w-56 skeleton rounded-[var(--r-sm)]" />
          <div className="h-4 w-72 skeleton rounded-[var(--r-sm)]" />
        </div>
        <div className="h-9 w-32 skeleton rounded-[var(--r-md)]" />
      </div>

      <div className="h-10 skeleton rounded-[var(--r-md)]" />
      <div className="h-80 skeleton rounded-[var(--r-md)]" />
    </div>
  );
}
