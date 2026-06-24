import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchPeriods } from "@/lib/periods";
import type { PeriodStatus } from "@/types/database";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const classId = req.nextUrl.searchParams.get("classId");
  const status = req.nextUrl.searchParams.get("status") as PeriodStatus | null;

  const periods = await fetchPeriods({ classId, status: status ?? undefined });
  return NextResponse.json({ periods });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || user.accountRole !== "admin") {
    return NextResponse.json({ error: "관리자만 기간을 설정할 수 있습니다." }, { status: 403 });
  }

  const { classId, startDate, endDate } = await req.json();
  if (!classId || !startDate || !endDate) {
    return NextResponse.json({ error: "학급, 시작일, 종료일을 입력해 주세요." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { error: closeError } = await supabase
    .from("periods")
    .update({ status: "closed" })
    .eq("class_id", classId)
    .eq("status", "active");
  if (closeError) {
    return NextResponse.json({ error: closeError.message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("periods")
    .insert({ class_id: classId, start_date: startDate, end_date: endDate, status: "active" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ period: data });
}
