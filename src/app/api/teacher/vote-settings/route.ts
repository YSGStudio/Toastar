import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * 전교 공통 투표 설정. 하트는 학급이 아니라 사람 단위로 주어지므로 설정도 한 곳에만 둔다.
 * (학급마다 다른 수상 인원수는 그대로 class-settings에서 관리한다)
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || user.accountRole !== "admin") {
    return NextResponse.json({ error: "관리자만 하트 정책을 변경할 수 있습니다." }, { status: 403 });
  }

  const { heartLimit } = await req.json();
  const limit = Number(heartLimit);
  if (!Number.isInteger(limit) || limit < 0) {
    return NextResponse.json({ error: "하트 수는 0 이상의 정수여야 합니다." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vote_settings")
    .update({ heart_limit: limit })
    .eq("id", true)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ voteSettings: data });
}
