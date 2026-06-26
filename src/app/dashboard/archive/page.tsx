import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchPeriods } from "@/lib/periods";
import { fetchArtworkList } from "@/lib/artworks";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { PeriodPicker } from "@/components/PeriodPicker";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { periodId } = await searchParams;
  const selectedId = periodId ?? null;

  const [closedPeriods, artworks] = await Promise.all([
    fetchPeriods({ status: "closed" }),
    selectedId ? fetchArtworkList(user, { scope: "archive", periodId: selectedId }) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PeriodPicker periods={closedPeriods} selectedId={selectedId} />
      {!selectedId ? (
        <p className="py-20 text-center text-sm text-zinc-400">지난 기간을 선택하면 작품을 볼 수 있어요.</p>
      ) : (
        <ArtworkGrid
          initialArtworks={artworks}
          fetchUrl={`/api/artworks?scope=archive&periodId=${selectedId}`}
          canLike={false}
          emptyMessage="이 기간에는 게시된 작품이 없어요."
        />
      )}
    </div>
  );
}
