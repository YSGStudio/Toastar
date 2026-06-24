import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { generateClassCode } from "@/lib/classCode";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "교사만 접근할 수 있습니다." }, { status: 403 });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ classes: data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "교사만 접근할 수 있습니다." }, { status: 403 });
  }

  const { name, startDate, endDate } = await req.json();
  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: "학급 이름과 첫 운영 기간을 입력해 주세요." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  let classRow = null;
  let lastError: { message: string } | null = null;
  for (let attempt = 0; attempt < 5 && !classRow; attempt++) {
    const classCode = generateClassCode();
    const { data, error } = await supabase
      .from("classes")
      .insert({ teacher_id: user.id, name, class_code: classCode })
      .select()
      .single();
    if (!error) {
      classRow = data;
    } else if (!error.message.includes("duplicate key")) {
      lastError = error;
      break;
    } else {
      lastError = error;
    }
  }

  if (!classRow) {
    return NextResponse.json(
      { error: lastError?.message ?? "학급 코드 생성에 실패했습니다. 다시 시도해 주세요." },
      { status: 400 },
    );
  }

  const { error: periodError } = await supabase.from("periods").insert({
    class_id: classRow.id,
    start_date: startDate,
    end_date: endDate,
    status: "active",
  });
  if (periodError) {
    return NextResponse.json({ error: periodError.message }, { status: 400 });
  }

  return NextResponse.json({ class: classRow });
}
