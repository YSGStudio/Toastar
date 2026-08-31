import { cache } from "react";
import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";
import { fetchCurrentPeriod } from "@/lib/periods";

/**
 * 학생의 하트 현황을 계산한다.
 * - remaining/limit: 진행 중인 기간에 아직 줄 수 있는 하트. 하트는 매일 채워지지 않고
 *   기간 전체에 걸쳐 한 번만 주어진다(period_heart_usage는 기간별로 한 행).
 *   진행 중인 기간이 없으면 줄 수 있는 하트도 없으므로 잔량은 0이다.
 * - totalReceived: 내가 올린 모든 작품이 지금까지 받은 하트 누적 합계.
 *
 * React cache()로 감싸 레이아웃(하트 배지)과 페이지(단계 안내)가 각자 호출해도 한 번만 실행된다.
 */
export const getHeartStatus = cache(async function getHeartStatus(
  user: CurrentUser,
): Promise<{ limit: number; remaining: number; totalReceived: number } | null> {
  if (user.role !== "student") return null;

  const client = await getScopedSupabaseClient(user);

  const [budget, { data: myArtworks }] = await Promise.all([
    fetchHeartBudget(client, user),
    client.from("artworks").select("like_count").eq("student_id", user.studentId),
  ]);

  const totalReceived = (myArtworks ?? []).reduce((sum, a) => sum + a.like_count, 0);

  return { ...budget, totalReceived };
});

/**
 * 이번 기간에 남은 하트만 조회한다(받은 하트 합계는 계산하지 않는다).
 * 하트를 준 직후처럼 잔량만 서버 값으로 다시 맞추면 되는 곳에서 쓴다.
 */
export async function getRemainingHearts(
  user: CurrentUser,
): Promise<{ limit: number; remaining: number } | null> {
  if (user.role !== "student") return null;
  const client = await getScopedSupabaseClient(user);
  return fetchHeartBudget(client, user);
}

async function fetchHeartBudget(
  client: Awaited<ReturnType<typeof getScopedSupabaseClient>>,
  student: Extract<CurrentUser, { role: "student" }>,
): Promise<{ limit: number; remaining: number }> {
  const [{ data: classRow }, period] = await Promise.all([
    client.from("classes").select("period_heart_limit").eq("id", student.classId).maybeSingle(),
    fetchCurrentPeriod(student, student.classId),
  ]);

  const limit = classRow?.period_heart_limit ?? 10;
  if (!period) return { limit, remaining: 0 };

  const { data: usage } = await client
    .from("period_heart_usage")
    .select("used_count")
    .eq("student_id", student.studentId)
    .eq("period_id", period.id)
    .maybeSingle();

  return { limit, remaining: Math.max(limit - (usage?.used_count ?? 0), 0) };
}
