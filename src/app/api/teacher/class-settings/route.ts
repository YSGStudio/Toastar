import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || user.accountRole !== "admin") {
    return NextResponse.json({ error: "관리자만 하트 정책을 변경할 수 있습니다." }, { status: 403 });
  }

  const { classId, dailyHeartLimit, awardTopN } = await req.json();
  if (!classId) return NextResponse.json({ error: "classId가 필요합니다." }, { status: 400 });

  const updates: Record<string, number> = {};
  if (dailyHeartLimit !== undefined) updates.daily_heart_limit = Number(dailyHeartLimit);
  if (awardTopN !== undefined) updates.award_top_n = Number(awardTopN);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("classes")
    .update(updates)
    .eq("id", classId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ class: data });
}
