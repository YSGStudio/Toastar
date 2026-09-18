import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

/** 학생 로그인 차단 시간. 전교 공통이라 모든 학급 학생에게 똑같이 적용된다. */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || user.accountRole !== "admin") {
    return NextResponse.json({ error: "관리자만 로그인 차단 시간을 설정할 수 있습니다." }, { status: 403 });
  }

  const { rules } = (await req.json()) as {
    rules: { dayType: "weekday" | "weekend"; enabled: boolean; startTime: string; endTime: string }[];
  };

  if (!Array.isArray(rules)) {
    return NextResponse.json({ error: "rules가 필요합니다." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("login_block_rules")
    .upsert(
      rules.map((r) => ({
        day_type: r.dayType,
        enabled: r.enabled,
        start_time: r.startTime,
        end_time: r.endTime,
      })),
      { onConflict: "day_type" },
    )
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rules: data });
}
