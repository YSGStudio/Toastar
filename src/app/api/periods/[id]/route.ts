import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { PeriodPhase } from "@/types/database";

/** 단계는 게시 → 투표 → 종료 순서로 한 칸씩만 넘어간다(되돌리거나 건너뛸 수 없다). */
const NEXT_PHASE: Record<PeriodPhase, PeriodPhase | null> = {
  posting: "voting",
  voting: "closed",
  closed: null,
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || user.accountRole !== "admin") {
    return NextResponse.json({ error: "관리자만 기간 단계를 넘길 수 있습니다." }, { status: 403 });
  }

  const { id } = await params;
  const { phase } = await req.json();
  if (phase !== "voting" && phase !== "closed") {
    return NextResponse.json({ error: "넘어갈 단계가 올바르지 않습니다." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: period } = await supabase
    .from("periods")
    .select("phase")
    .eq("id", id)
    .maybeSingle();

  if (!period) return NextResponse.json({ error: "기간을 찾을 수 없습니다." }, { status: 404 });
  if (NEXT_PHASE[period.phase as PeriodPhase] !== phase) {
    return NextResponse.json(
      { error: "지금 단계에서는 넘어갈 수 없습니다. 화면을 새로고침해 주세요." },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("periods")
    .update({ phase })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ period: data });
}
