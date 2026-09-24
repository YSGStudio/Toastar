import { cache } from "react";
import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";

export interface HeartBudget {
  limit: number;
  /** 학급마다 남은 하트. 아직 한 개도 쓰지 않은 학급은 키가 없다(= limit 그대로). */
  remainingByClass: Record<string, number>;
}

export interface HeartStatus extends HeartBudget {
  /** 투표가 끝난 기간에 내 작품이 받은 하트 누적. 작품을 올리지 않는 교사는 null이다. */
  totalReceived: number | null;
}

/**
 * 하트 현황을 계산한다. 학생·교사 모두 같은 규칙을 쓴다.
 * - limit: 전교 공통 설정값(vote_settings.heart_limit). 학급마다 이만큼씩 쓸 수 있다.
 * - remainingByClass: 학급별로 지금 열려 있는 기간에 쓴 하트를 빼고 남은 수.
 *   종료된 기간의 사용량은 세지 않으므로 다음 투표가 열리면 다시 채워진다.
 */
export const getHeartStatus = cache(async function getHeartStatus(
  user: CurrentUser,
): Promise<HeartStatus | null> {
  const client = await getScopedSupabaseClient(user);

  const [budget, totalReceived] = await Promise.all([
    fetchHeartBudget(user),
    // 투표가 끝나기 전에는 받은 하트를 공개하지 않으므로, 끝난 기간의 하트만 누적한다.
    user.role === "student"
      ? client
          .from("artworks")
          .select("like_count, periods!inner(phase)")
          .eq("student_id", user.studentId)
          .eq("periods.phase", "closed")
          .then(({ data }) => (data ?? []).reduce((sum, a) => sum + a.like_count, 0))
      : Promise.resolve(null),
  ]);

  return { ...budget, totalReceived };
});

/**
 * 남은 하트만 조회한다(받은 하트 합계는 계산하지 않는다).
 * 하트를 준 직후처럼 잔량만 서버 값으로 다시 맞추면 되는 곳에서 쓴다.
 */
export async function getRemainingHearts(user: CurrentUser): Promise<HeartBudget> {
  return fetchHeartBudget(user);
}

async function fetchHeartBudget(user: CurrentUser): Promise<HeartBudget> {
  const client = await getScopedSupabaseClient(user);

  // 사용량 행은 RLS가 이미 "내 것"만 내려 주므로, 열려 있는 기간의 것만 골라 학급별로 합치면 된다.
  const [{ data: settings }, { data: openPeriods }, { data: usage }] = await Promise.all([
    client.from("vote_settings").select("heart_limit").maybeSingle(),
    client.from("periods").select("id").neq("phase", "closed"),
    client.from("period_heart_usage").select("period_id, class_id, used_count"),
  ]);

  const limit = settings?.heart_limit ?? 10;
  const openPeriodIds = new Set((openPeriods ?? []).map((p) => p.id));

  const usedByClass = new Map<string, number>();
  for (const row of usage ?? []) {
    if (!openPeriodIds.has(row.period_id)) continue;
    usedByClass.set(row.class_id, (usedByClass.get(row.class_id) ?? 0) + row.used_count);
  }

  return {
    limit,
    remainingByClass: Object.fromEntries(
      [...usedByClass].map(([classId, used]) => [classId, Math.max(limit - used, 0)]),
    ),
  };
}
