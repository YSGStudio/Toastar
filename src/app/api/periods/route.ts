import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchPeriods } from "@/lib/periods";
import type { PeriodStatus } from "@/types/database";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") as PeriodStatus | null;

  const periods = await fetchPeriods({ status: status ?? undefined });
  return NextResponse.json({ periods });
}

/** 새 기간을 시작한다. 기간은 전교 공통이라 모든 학급에 한 번에 적용된다. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || user.accountRole !== "admin") {
    return NextResponse.json({ error: "관리자만 기간을 설정할 수 있습니다." }, { status: 403 });
  }

  const { startDate, endDate } = await req.json();
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "시작일과 종료일을 입력해 주세요." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // 진행 중이던 기간(게시·투표 단계)은 새 기간이 시작되면 자동으로 종료된다.
  // 진행 중인 기간은 전교에 하나뿐이어야 하므로(DB 유니크 인덱스) 먼저 닫아야 새로 만들 수 있다.
  const { error: closeError } = await supabase
    .from("periods")
    .update({ phase: "closed" })
    .neq("phase", "closed");
  if (closeError) {
    return NextResponse.json({ error: closeError.message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("periods")
    .insert({ start_date: startDate, end_date: endDate, phase: "posting" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ period: data });
}
