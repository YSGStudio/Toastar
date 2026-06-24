import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || user.accountRole !== "admin") {
    return NextResponse.json({ error: "관리자만 로그인 차단 시간을 설정할 수 있습니다." }, { status: 403 });
  }

  const { classId, rules } = await req.json() as {
    classId: string;
    rules: { dayType: "weekday" | "weekend"; enabled: boolean; startTime: string; endTime: string }[];
  };

  if (!classId || !Array.isArray(rules)) {
    return NextResponse.json({ error: "classId와 rules가 필요합니다." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("login_block_rules")
    .upsert(
      rules.map((r) => ({
        class_id: classId,
        day_type: r.dayType,
        enabled: r.enabled,
        start_time: r.startTime,
        end_time: r.endTime,
      })),
      { onConflict: "class_id,day_type" },
    )
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rules: data });
}
