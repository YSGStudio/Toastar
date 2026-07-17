import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";
import { signArtworkPaths } from "@/lib/signArtworkUrls";
import type { ArtworkListItem } from "@/types/client";

export async function fetchArtworkList(
  user: CurrentUser,
  opts: { scope: "latest" | "archive" | "mine"; periodId?: string | null },
): Promise<ArtworkListItem[]> {
  const client = await getScopedSupabaseClient(user);

  if (opts.scope === "mine" && user.role !== "student") return [];
  if (opts.scope === "archive" && !opts.periodId) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[];

  if (opts.scope === "latest") {
    // periods 쿼리를 별도로 날리지 않고 inner join으로 active 기간 필터를 한 번에 처리한다.
    const { data } = await client
      .from("artworks")
      .select("*, students(name), periods!inner(id)")
      .eq("periods.status", "active")
      .order("created_at", { ascending: false });
    rows = data ?? [];
  } else if (opts.scope === "mine") {
    const { data } = await client
      .from("artworks")
      .select("*, students(name)")
      .eq("student_id", (user as Extract<CurrentUser, { role: "student" }>).studentId)
      .order("created_at", { ascending: false });
    rows = data ?? [];
  } else {
    const { data } = await client
      .from("artworks")
      .select("*, students(name)")
      .eq("period_id", opts.periodId!)
      .order("created_at", { ascending: false });
    rows = data ?? [];
  }

  if (rows.length === 0) return [];

  const artworkIds = rows.map((a) => a.id as string);

  const [likesResult, awardsResult, signedUrlMap, ownedClassesResult] = await Promise.all([
    user.role === "student"
      ? client
          .from("artwork_likes")
          .select("artwork_id")
          .eq("student_id", user.studentId)
          .in("artwork_id", artworkIds)
      : Promise.resolve({ data: null }),
    client.from("award_records").select("artwork_id").in("artwork_id", artworkIds),
    signArtworkPaths(
      client,
      rows.flatMap((a) => [a.file_path, a.thumbnail_path]),
    ),
    user.role === "teacher"
      ? client.from("classes").select("id").eq("teacher_id", user.id)
      : Promise.resolve({ data: null }),
  ]);

  const likedSet = new Set((likesResult.data ?? []).map((l) => l.artwork_id));
  const winnerSet = new Set((awardsResult.data ?? []).map((a) => a.artwork_id));
  const ownedClassIds = new Set((ownedClassesResult.data ?? []).map((c) => c.id));

  return rows.map((a) => ({
    ...a,
    file_url: signedUrlMap.get(a.file_path) ?? a.file_path,
    thumbnail_url: a.thumbnail_path ? signedUrlMap.get(a.thumbnail_path) ?? a.thumbnail_path : null,
    liked_by_me: likedSet.has(a.id),
    is_winner: winnerSet.has(a.id),
    can_manage: ownedClassIds.has(a.class_id),
  })) as ArtworkListItem[];
}
