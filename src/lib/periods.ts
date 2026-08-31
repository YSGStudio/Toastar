import { cache } from "react";
import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Period, PeriodStatus, PeriodWithClassName } from "@/types/database";

export async function fetchPeriods(opts: { classId?: string | null; status?: PeriodStatus }) {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("periods").select("*").order("start_date", { ascending: false });
  if (opts.classId) query = query.eq("class_id", opts.classId);
  if (opts.status) query = query.eq("status", opts.status);
  const { data } = await query;
  return (data ?? []) as Period[];
}

/**
 * 학급에서 진행 중인 기간(게시 또는 투표 단계)을 조회한다. 종료된 기간은 제외한다.
 * 학급당 진행 중인 기간은 하나뿐이다(새 기간을 시작하면 이전 기간이 자동으로 종료된다).
 * React cache()로 감싸 레이아웃(하트 잔량)과 페이지(단계 표시)가 각자 호출해도 한 번만 조회한다.
 */
export const fetchCurrentPeriod = cache(async function fetchCurrentPeriod(
  user: CurrentUser,
  classId: string,
): Promise<Period | null> {
  const client = await getScopedSupabaseClient(user);
  const { data } = await client
    .from("periods")
    .select("*")
    .eq("class_id", classId)
    .neq("phase", "closed")
    .maybeSingle();
  return (data as Period) ?? null;
});

/**
 * 지금 진행 중인 기간을 볼 수 있는 범위만큼 조회한다(관리자=전체 학급, 교사=담당 학급, 학생=자기 학급).
 * 학급 이름은 join 대신 별도 조회로 붙인다. periods는 모든 인증 사용자가 읽을 수 있지만
 * classes는 RLS가 범위를 좁히므로, classes를 먼저 읽어 그 학급의 기간만 가져오면
 * 볼 권한이 없는 학급이 이름 없이 섞여 들어오는 일이 없다.
 */
export const fetchOngoingPeriods = cache(async function fetchOngoingPeriods(
  user: CurrentUser,
): Promise<PeriodWithClassName[]> {
  const client = await getScopedSupabaseClient(user);

  const { data: classes } = await client.from("classes").select("id, name");
  if (!classes || classes.length === 0) return [];

  const classNames = new Map(classes.map((c) => [c.id as string, c.name as string]));

  const { data } = await client
    .from("periods")
    .select("*")
    .in("class_id", [...classNames.keys()])
    .neq("phase", "closed")
    .order("start_date", { ascending: false });

  return (data ?? []).map((period) => ({
    ...(period as Period),
    class_name: classNames.get(period.class_id) ?? null,
  }));
});
