import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveLoginNumbers } from "@/lib/studentLoginNumbers";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "교사만 접근할 수 있습니다." }, { status: 403 });
  }

  const { classId, names } = (await req.json()) as { classId: string; names: string[] };

  if (!classId || !Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: "등록할 학생 명단이 없습니다." }, { status: 400 });
  }

  const cleaned = names.map((n) => String(n ?? "").trim()).filter((n) => n.length > 0);
  if (cleaned.length === 0) {
    return NextResponse.json({ error: "유효한 학생 이름이 없습니다." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const resolved = await resolveLoginNumbers(supabase, classId, cleaned);

  const { data, error } = await supabase
    .from("students")
    .insert(resolved.map((s) => ({ class_id: classId, name: s.name, login_no: s.loginNo })))
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ inserted: data?.length ?? 0, requested: cleaned.length });
}
