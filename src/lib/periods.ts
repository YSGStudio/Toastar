import { cache } from "react";
import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Period, PeriodStatus } from "@/types/database";

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
