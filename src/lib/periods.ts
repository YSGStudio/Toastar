import { cache } from "react";
import { getScopedSupabaseClient, type CurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Period, PeriodStatus } from "@/types/database";

/** 기간 목록. 기간은 전교 공통이라 학급으로 거르지 않는다. */
export async function fetchPeriods(opts: { status?: PeriodStatus } = {}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("periods").select("*").order("start_date", { ascending: false });
  if (opts.status) query = query.eq("status", opts.status);
  const { data } = await query;
  return (data ?? []) as Period[];
}

/**
 * 지금 진행 중인 기간(게시 또는 투표 단계). 전교에 하나뿐이다(DB 유니크 인덱스로 강제).
 * 학생·교사 모두 같은 기간을 본다.
 * React cache()로 감싸 레이아웃(하트 잔량)과 페이지(단계 표시)가 각자 호출해도 한 번만 조회한다.
 */
export const fetchCurrentPeriod = cache(async function fetchCurrentPeriod(
  user: CurrentUser,
): Promise<Period | null> {
  const client = await getScopedSupabaseClient(user);
  const { data } = await client.from("periods").select("*").neq("phase", "closed").maybeSingle();
  return (data as Period) ?? null;
});
