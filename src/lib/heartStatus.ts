import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";

const TIME_ZONE = process.env.SCHOOL_TIMEZONE || "Asia/Seoul";

function todayInTimeZone(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

/**
 * 학생의 하트 현황을 계산한다.
 * - remaining/limit: 오늘 남은 하트(줄 수 있는 하트). daily_heart_usage는 날짜별로 분리된 행이라
 *   전날 사용량과 무관하게 매일 0부터 다시 시작한다(이월 없음).
 * - totalReceived: 내가 올린 모든 작품이 지금까지 받은 하트 누적 합계.
 */
export async function getHeartStatus(
  user: CurrentUser,
): Promise<{ limit: number; remaining: number; totalReceived: number } | null> {
  if (user.role !== "student") return null;

  const client = await getScopedSupabaseClient(user);

  const [{ data: classRow }, { data: usage }, { data: myArtworks }] = await Promise.all([
    client.from("classes").select("daily_heart_limit").eq("id", user.classId).maybeSingle(),
    client
      .from("daily_heart_usage")
      .select("used_count")
      .eq("student_id", user.studentId)
      .eq("usage_date", todayInTimeZone())
      .maybeSingle(),
    client.from("artworks").select("like_count").eq("student_id", user.studentId),
  ]);

  const limit = classRow?.daily_heart_limit ?? 3;
  const used = usage?.used_count ?? 0;
  const totalReceived = (myArtworks ?? []).reduce((sum, a) => sum + a.like_count, 0);

  return { limit, remaining: Math.max(limit - used, 0), totalReceived };
}
