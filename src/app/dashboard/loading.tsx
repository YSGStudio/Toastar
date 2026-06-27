function SkeletonTile() {
  return <div className="aspect-square rounded-md bg-zinc-100" />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="페이지를 불러오는 중">
      <div className="space-y-3">
        <div className="h-10 w-full max-w-sm rounded-md bg-zinc-100" />
        <div className="h-9 w-40 rounded-md bg-zinc-100" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, index) => (
          <SkeletonTile key={index} />
        ))}
      </div>
    </div>
  );
}
