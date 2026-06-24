import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveLoginNumbers } from "@/lib/studentLoginNumbers";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "교사만 접근할 수 있습니다." }, { status: 403 });
  }

  const classId = req.nextUrl.searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId가 필요합니다." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("class_id", classId)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ students: data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "교사만 접근할 수 있습니다." }, { status: 403 });
  }

  const { classId, name } = await req.json();
  const trimmedName = String(name ?? "").trim();
  if (!classId || !trimmedName) {
    return NextResponse.json({ error: "학급과 이름을 입력해 주세요." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const [{ loginNo }] = await resolveLoginNumbers(supabase, classId, [trimmedName]);

  const { data, error } = await supabase
    .from("students")
    .insert({ class_id: classId, name: trimmedName, login_no: loginNo })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ student: data });
}
