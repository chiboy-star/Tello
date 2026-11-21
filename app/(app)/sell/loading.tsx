export default function SellLoading() {
  return (
    <div className="space-y-4 pb-12">
      {/* Mode switcher skeleton */}
      <div className="h-10 skeleton rounded-[var(--r-md)]" />

      {/* Grid of item tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 skeleton rounded-[var(--r-md)]" />
        ))}
      </div>
    </div>
  );
}
