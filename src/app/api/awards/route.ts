import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const classId = req.nextUrl.searchParams.get("classId");
  const periodId = req.nextUrl.searchParams.get("periodId");

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("award_records")
    .select("*, artworks(title, type), students(name), periods(start_date, end_date)")
    .order("awarded_at", { ascending: false });

  if (classId) query = query.eq("class_id", classId);
  if (periodId) query = query.eq("period_id", periodId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ awards: data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || user.accountRole !== "admin") {
    return NextResponse.json({ error: "관리자만 시상을 집계할 수 있습니다." }, { status: 403 });
  }

  const { periodId } = await req.json();
  if (!periodId) return NextResponse.json({ error: "periodId가 필요합니다." }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  const { data: period } = await supabase
    .from("periods")
    .select("*, classes(id, teacher_id, award_top_n)")
    .eq("id", periodId)
    .single();

  if (!period) return NextResponse.json({ error: "기간을 찾을 수 없습니다." }, { status: 404 });
  if (period.status !== "closed") {
    return NextResponse.json({ error: "아직 진행 중인 기간은 집계할 수 없습니다." }, { status: 400 });
  }

  const classInfo = period.classes as unknown as { award_top_n: number };
  const topN = classInfo?.award_top_n ?? 1;

  const { data: artworks, error: artworksError } = await supabase
    .from("artworks")
    .select("id, student_id, like_count")
    .eq("period_id", periodId)
    .order("like_count", { ascending: false });

  if (artworksError) return NextResponse.json({ error: artworksError.message }, { status: 400 });
  if (!artworks || artworks.length === 0) {
    return NextResponse.json({ error: "이 기간에 게시된 작품이 없습니다." }, { status: 400 });
  }

  const cutoffValue = artworks[Math.min(topN, artworks.length) - 1]?.like_count ?? 0;
  const winners = artworks.filter((a) => a.like_count >= cutoffValue && a.like_count > 0);

  if (winners.length === 0) {
    return NextResponse.json({ error: "좋아요를 받은 작품이 없어 시상할 수 없습니다." }, { status: 400 });
  }

  await supabase.from("award_records").delete().eq("period_id", periodId);

  const { data: inserted, error: insertError } = await supabase
    .from("award_records")
    .insert(
      winners.map((w) => ({
        class_id: period.class_id,
        period_id: periodId,
        student_id: w.student_id,
        artwork_id: w.id,
        heart_count: w.like_count,
      })),
    )
    .select();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  return NextResponse.json({ awards: inserted });
}
