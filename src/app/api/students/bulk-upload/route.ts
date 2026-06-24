import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

interface IncomingStudent {
  name: string;
  loginNo: number | null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "교사만 접근할 수 있습니다." }, { status: 403 });
  }

  const { classId, students } = (await req.json()) as {
    classId: string;
    students: IncomingStudent[];
  };

  if (!classId || !Array.isArray(students) || students.length === 0) {
    return NextResponse.json({ error: "등록할 학생 명단이 없습니다." }, { status: 400 });
  }

  const cleaned = students
    .map((s) => ({ name: String(s.name ?? "").trim(), login_no: s.loginNo ?? null }))
    .filter((s) => s.name.length > 0);

  if (cleaned.length === 0) {
    return NextResponse.json({ error: "유효한 학생 이름이 없습니다." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("students")
    .upsert(
      cleaned.map((s) => ({ class_id: classId, name: s.name, login_no: s.login_no })),
      { onConflict: "class_id,name,login_no", ignoreDuplicates: true },
    )
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ inserted: data?.length ?? 0, requested: cleaned.length });
}
