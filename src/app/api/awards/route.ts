import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { aggregateClassRankings } from "@/lib/rankings";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const classId = req.nextUrl.searchParams.get("classId");
  const periodId = req.nextUrl.searchParams.get("periodId");

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("award_records")
    .select("*, artworks(title, type), students(name), periods(start_date, end_date)")
    .order("awarded_at", { ascending: false })
    .order("rank", { ascending: true });

  if (classId) query = query.eq("class_id", classId);
  if (periodId) query = query.eq("period_id", periodId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ awards: data });
}

/** 가장 최근에 끝난 기간을 다시 집계한다. 투표 종료 때 자동으로 한 번 집계되고, 이건 다시 계산할 때 쓴다. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || user.accountRole !== "admin") {
    return NextResponse.json({ error: "관리자만 순위를 집계할 수 있습니다." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const result = await aggregateClassRankings(supabase);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.adminOnly ? 403 : 400 });
  }
  return NextResponse.json({ classCount: result.classCount, studentCount: result.studentCount });
}
