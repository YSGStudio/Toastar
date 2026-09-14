import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

/** 학급마다 순위표에 올리는 인원. 동점은 같은 순위라 이보다 많아질 수 있다. */
const RANKING_SIZE = 10;

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

/**
 * 투표가 끝난 모든 학급을 한 번에 집계한다.
 * 학급마다 가장 최근에 끝난 기간을 골라 하트 순으로 상위 10명을 뽑는다(DB 함수가 한 트랜잭션으로 처리).
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || user.accountRole !== "admin") {
    return NextResponse.json({ error: "관리자만 순위를 집계할 수 있습니다." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("aggregate_class_rankings", { p_size: RANKING_SIZE });

  if (error) {
    if (error.message.includes("ADMIN_ONLY")) {
      return NextResponse.json({ error: "관리자만 순위를 집계할 수 있습니다." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const results = (data ?? []) as { result_class_id: string; ranked_count: number }[];
  if (results.length === 0) {
    return NextResponse.json(
      { error: "집계할 수 있는 기간이 없어요. 투표가 끝난 기간에 하트를 받은 작품이 있어야 해요." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    classCount: results.length,
    studentCount: results.reduce((sum, r) => sum + r.ranked_count, 0),
  });
}
