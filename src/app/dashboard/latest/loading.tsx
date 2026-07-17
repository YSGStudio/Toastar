export default function LatestLoading() {
  return (
    <div className="space-y-6">
      <div className="h-12 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-xl bg-zinc-100" />
        ))}
      </div>
    </div>
  );
}
