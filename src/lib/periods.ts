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
 * 지금 진행 중인 기간을 조회한다.
 * 투표는 학급 구분 없이 이뤄지므로 교사에게는 진행 중인 기간을 모두 보여 준다.
 * (periods는 모든 인증 사용자가 읽을 수 있고, 작품 목록도 이미 전교 공개다)
 * 학급 이름은 classes의 RLS가 허용하는 것만 붙는다. 읽을 수 없는 학급은 이름 없이 기간만 보인다.
 */
export const fetchOngoingPeriods = cache(async function fetchOngoingPeriods(
  user: CurrentUser,
): Promise<PeriodWithClassName[]> {
  const client = await getScopedSupabaseClient(user);

  let periodQuery = client
    .from("periods")
    .select("*")
    .neq("phase", "closed")
    .order("start_date", { ascending: false });

  // 학생은 자기 학급 기간만 본다(투표 화면이 아니라 안내용이다).
  if (user.role === "student") periodQuery = periodQuery.eq("class_id", user.classId);

  const [{ data: periods }, { data: classes }] = await Promise.all([
    periodQuery,
    client.from("classes").select("id, name"),
  ]);

  const classNames = new Map((classes ?? []).map((c) => [c.id as string, c.name as string]));

  return (periods ?? []).map((period) => ({
    ...(period as Period),
    class_name: classNames.get(period.class_id) ?? null,
  }));
});
