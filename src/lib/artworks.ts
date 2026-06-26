import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";
import { signArtworkPaths } from "@/lib/signArtworkUrls";
import type { ArtworkListItem } from "@/types/client";

export async function fetchArtworkList(
  user: CurrentUser,
  opts: { scope: "latest" | "archive" | "mine"; periodId?: string | null },
): Promise<ArtworkListItem[]> {
  const client = await getScopedSupabaseClient(user);

  let query = client
    .from("artworks")
    .select("*, students(name)")
    .order("created_at", { ascending: false });

  if (opts.scope === "latest") {
    const { data: activePeriods } = await client.from("periods").select("id").eq("status", "active");
    const ids = (activePeriods ?? []).map((p) => p.id);
    if (ids.length === 0) return [];
    query = query.in("period_id", ids);
  } else if (opts.scope === "mine") {
    if (user.role !== "student") return [];
    query = query.eq("student_id", user.studentId);
  } else {
    if (!opts.periodId) return [];
    query = query.eq("period_id", opts.periodId);
  }

  const { data: artworks } = await query;
  const rows = artworks ?? [];
  const artworkIds = rows.map((a) => a.id);

  let likedSet = new Set<string>();
  if (user.role === "student" && artworkIds.length > 0) {
    const { data: likes } = await client
      .from("artwork_likes")
      .select("artwork_id")
      .eq("student_id", user.studentId)
      .in("artwork_id", artworkIds);
    likedSet = new Set((likes ?? []).map((l) => l.artwork_id));
  }

  let winnerSet = new Set<string>();
  if (artworkIds.length > 0) {
    const { data: awards } = await client
      .from("award_records")
      .select("artwork_id")
      .in("artwork_id", artworkIds);
    winnerSet = new Set((awards ?? []).map((a) => a.artwork_id));
  }

  const signedUrlMap = await signArtworkPaths(
    client,
    rows.flatMap((a) => [a.file_path, a.thumbnail_path]),
  );

  return rows.map((a) => ({
    ...a,
    file_url: signedUrlMap.get(a.file_path) ?? a.file_path,
    thumbnail_url: a.thumbnail_path ? signedUrlMap.get(a.thumbnail_path) ?? a.thumbnail_path : null,
    liked_by_me: likedSet.has(a.id),
    is_winner: winnerSet.has(a.id),
  })) as ArtworkListItem[];
}
