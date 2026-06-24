import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";

const TIME_ZONE = process.env.SCHOOL_TIMEZONE || "Asia/Seoul";

function todayInTimeZone(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

/**
 * 학생의 오늘 남은 하트 수를 계산한다. daily_heart_usage는 날짜별로 분리된 행이라
 * 전날 사용량과 무관하게 매일 0부터 다시 시작한다(이월 없음).
 */
export async function getHeartStatus(
  user: CurrentUser,
): Promise<{ limit: number; remaining: number } | null> {
  if (user.role !== "student") return null;

  const client = await getScopedSupabaseClient(user);

  const { data: classRow } = await client
    .from("classes")
    .select("daily_heart_limit")
    .eq("id", user.classId)
    .maybeSingle();
  const limit = classRow?.daily_heart_limit ?? 3;

  const { data: usage } = await client
    .from("daily_heart_usage")
    .select("used_count")
    .eq("student_id", user.studentId)
    .eq("usage_date", todayInTimeZone())
    .maybeSingle();
  const used = usage?.used_count ?? 0;

  return { limit, remaining: Math.max(limit - used, 0) };
}
