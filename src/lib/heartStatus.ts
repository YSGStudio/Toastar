import { cache } from "react";
import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";

export interface HeartStatus {
  limit: number;
  remaining: number;
  /** 내가 올린 작품이 받은 하트 누적. 작품을 올리지 않는 교사는 null이다. */
  totalReceived: number | null;
}

/**
 * 하트 현황을 계산한다. 학생·교사 모두 같은 규칙을 쓴다.
 * - limit: 전교 공통 설정값(vote_settings.heart_limit).
 * - remaining: 지금 열려 있는 기간에 쓴 하트를 모두 합쳐서 뺀 값. 학급 구분은 없다.
 *   종료된 기간의 사용량은 세지 않으므로 다음 투표가 열리면 다시 채워진다.
 */
export const getHeartStatus = cache(async function getHeartStatus(
  user: CurrentUser,
): Promise<HeartStatus | null> {
  const client = await getScopedSupabaseClient(user);

  const [budget, totalReceived] = await Promise.all([
    fetchHeartBudget(user),
    user.role === "student"
      ? client
          .from("artworks")
          .select("like_count")
          .eq("student_id", user.studentId)
          .then(({ data }) => (data ?? []).reduce((sum, a) => sum + a.like_count, 0))
      : Promise.resolve(null),
  ]);

  return { ...budget, totalReceived };
});

/**
 * 남은 하트만 조회한다(받은 하트 합계는 계산하지 않는다).
 * 하트를 준 직후처럼 잔량만 서버 값으로 다시 맞추면 되는 곳에서 쓴다.
 */
export async function getRemainingHearts(
  user: CurrentUser,
): Promise<{ limit: number; remaining: number }> {
  return fetchHeartBudget(user);
}

async function fetchHeartBudget(
  user: CurrentUser,
): Promise<{ limit: number; remaining: number }> {
  const client = await getScopedSupabaseClient(user);

  // 사용량 행은 RLS가 이미 "내 것"만 내려 주므로, 열려 있는 기간의 것만 골라 합치면 된다.
  const [{ data: settings }, { data: openPeriods }, { data: usage }] = await Promise.all([
    client.from("vote_settings").select("heart_limit").maybeSingle(),
    client.from("periods").select("id").neq("phase", "closed"),
    client.from("period_heart_usage").select("period_id, used_count"),
  ]);

  const limit = settings?.heart_limit ?? 10;
  const openPeriodIds = new Set((openPeriods ?? []).map((p) => p.id));
  const used = (usage ?? [])
    .filter((u) => openPeriodIds.has(u.period_id))
    .reduce((sum, u) => sum + u.used_count, 0);

  return { limit, remaining: Math.max(limit - used, 0) };
}
