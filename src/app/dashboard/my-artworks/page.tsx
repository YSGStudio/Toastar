import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchArtworkList } from "@/lib/artworks";
import { ArtworkGrid } from "@/components/ArtworkGrid";

export default async function MyArtworksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/dashboard/latest");

  const artworks = await fetchArtworkList(user, { scope: "mine" });
  // 투표가 끝나기 전인 작품은 하트 수가 가려져 내려오므로 합계에서 빠진다.
  const totalHearts = artworks.reduce((sum, a) => sum + (a.like_count ?? 0), 0);
  const hasHiddenResults = artworks.some((a) => a.results_hidden);

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-zinc-50 px-4 py-3 text-sm">
        <span className="font-semibold text-zinc-900">{artworks.length}개</span>
        <span className="text-zinc-500">의 작품 · 받은 하트 </span>
        <span className="font-semibold text-amber-500">{totalHearts}개</span>
        {hasHiddenResults && (
          <p className="mt-1 text-xs text-zinc-400">진행 중인 기간의 하트는 투표가 끝나면 더해져요.</p>
        )}
      </div>
      <ArtworkGrid
        initialArtworks={artworks}
        fetchUrl="/api/artworks?scope=mine"
        canLike={false}
        emptyMessage="아직 올린 작품이 없어요."
      />
    </div>
  );
}
