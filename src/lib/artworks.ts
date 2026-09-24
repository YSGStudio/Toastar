import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";
import { signArtworkPaths } from "@/lib/signArtworkUrls";
import { fetchClassNames } from "@/lib/classNames";
import type { ArtworkListItem } from "@/types/client";
import type { PeriodPhase } from "@/types/database";

export async function fetchArtworkList(
  user: CurrentUser,
  opts: { scope: "latest" | "archive" | "mine"; periodId?: string | null },
): Promise<ArtworkListItem[]> {
  const client = await getScopedSupabaseClient(user);

  if (opts.scope === "mine" && user.role !== "student") return [];
  if (opts.scope === "archive" && !opts.periodId) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[];

  // 작품마다 기간 단계를 함께 읽는다. 투표가 끝나기 전인지에 따라 학생에게 결과를 가린다.
  if (opts.scope === "latest") {
    // periods 쿼리를 별도로 날리지 않고 inner join으로 active 기간 필터를 한 번에 처리한다.
    const { data } = await client
      .from("artworks")
      .select("*, students(name), periods!inner(status, phase)")
      .eq("periods.status", "active")
      .order("created_at", { ascending: false });
    rows = data ?? [];
  } else if (opts.scope === "mine") {
    const { data } = await client
      .from("artworks")
      .select("*, students(name), periods(phase)")
      .eq("student_id", (user as Extract<CurrentUser, { role: "student" }>).studentId)
      .order("created_at", { ascending: false });
    rows = data ?? [];
  } else {
    const { data } = await client
      .from("artworks")
      .select("*, students(name), periods(phase)")
      .eq("period_id", opts.periodId!)
      .order("created_at", { ascending: false });
    rows = data ?? [];
  }

  if (rows.length === 0) return [];

  const artworkIds = rows.map((a) => a.id as string);
  const classIds = [...new Set(rows.map((a) => a.class_id as string))];

  const [likesResult, winnersResult, signedUrlMap, ownedClassesResult, classNames] = await Promise.all([
    // 학생·교사 모두 자기가 준 하트를 표시한다. 담임 교사는 RLS상 자기 학급 작품에 달린
    // 남의 하트도 읽을 수 있으므로, 내 하트만 보도록 투표자 컬럼으로 직접 좁힌다.
    client
      .from("artwork_likes")
      .select("artwork_id")
      .in("artwork_id", artworkIds)
      .eq(user.role === "student" ? "student_id" : "teacher_id", user.role === "student" ? user.studentId : user.id),
    // 👑는 학급 순위 1등에게만 붙인다(순위표에는 10위까지 오른다).
    client.from("award_records").select("artwork_id").in("artwork_id", artworkIds).eq("rank", 1),
    signArtworkPaths(
      client,
      rows.flatMap((a) => [a.file_path, a.thumbnail_path]),
    ),
    user.role === "teacher"
      ? client.from("classes").select("id").eq("teacher_id", user.id)
      : Promise.resolve({ data: null }),
    fetchClassNames(classIds),
  ]);

  const likedSet = new Set((likesResult.data ?? []).map((l) => l.artwork_id));
  const winnerSet = new Set((winnersResult.data ?? []).map((a) => a.artwork_id));
  const ownedClassIds = new Set((ownedClassesResult.data ?? []).map((c) => c.id));

  return rows.map(({ periods, ...a }) => {
    const phase = (periods as { phase: PeriodPhase } | null)?.phase;
    // 학생에게는 투표가 끝나기 전까지 누가 올렸는지와 받은 하트 수를 보여 주지 않는다.
    // 화면에서 흐리게 하는 것만으로는 응답에 값이 남으므로 서버에서 값 자체를 지운다.
    // 교사·운영자는 그대로 본다. 본인 작품의 이름은 가릴 이유가 없어 남기지만 하트 수는 똑같이 가린다.
    const resultsHidden = user.role === "student" && phase !== "closed";
    const isMine = user.role === "student" && a.student_id === user.studentId;

    return {
      ...a,
      students: resultsHidden && !isMine ? null : a.students,
      like_count: resultsHidden ? null : a.like_count,
      results_hidden: resultsHidden,
      file_url: signedUrlMap.get(a.file_path) ?? a.file_path,
      thumbnail_url: a.thumbnail_path ? signedUrlMap.get(a.thumbnail_path) ?? a.thumbnail_path : null,
      liked_by_me: likedSet.has(a.id),
      is_winner: winnerSet.has(a.id),
      can_manage: ownedClassIds.has(a.class_id),
      class_name: classNames.get(a.class_id) ?? null,
      // 학생은 게시 단계 동안만 자기 작품을 고치거나 지울 수 있다(투표가 시작되면 잠긴다).
      can_edit: isMine && phase === "posting",
    };
  }) as ArtworkListItem[];
}
