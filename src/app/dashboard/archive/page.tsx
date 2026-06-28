import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchArtworkList } from "@/lib/artworks";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { PeriodPicker } from "@/components/PeriodPicker";
import { StarDoodle } from "@/components/illustrations/Doodles";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { periodId } = await searchParams;
  const selectedId = periodId ?? null;

  const artworks = selectedId ? await fetchArtworkList(user, { scope: "archive", periodId: selectedId }) : [];

  return (
    <div className="space-y-6">
      <PeriodPicker selectedId={selectedId} />
      {!selectedId ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <StarDoodle className="h-20 w-20 text-amber-200" />
          <p className="text-center text-sm text-zinc-400">지난 기간을 선택하면 작품을 볼 수 있어요.</p>
        </div>
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
