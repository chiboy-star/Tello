export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 skeleton rounded-[var(--r-sm)]" />
        <div className="h-4 w-64 skeleton rounded-[var(--r-sm)]" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="h-24 skeleton rounded-[var(--r-md)]" />
        <div className="h-24 skeleton rounded-[var(--r-md)]" />
        <div className="h-24 skeleton rounded-[var(--r-md)]" />
      </div>
      <div className="h-64 skeleton rounded-[var(--r-md)]" />
    </div>
  );
}
