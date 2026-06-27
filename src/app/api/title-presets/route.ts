import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getScopedSupabaseClient } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const classId = user.role === "student" ? user.classId : req.nextUrl.searchParams.get("classId");
  if (!classId) {
    return NextResponse.json({ error: "classId가 필요합니다." }, { status: 400 });
  }

  const client = await getScopedSupabaseClient(user);
  const { data, error } = await client
    .from("title_presets")
    .select("*")
    .eq("class_id", classId)
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ titlePresets: data });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "교사만 제목을 등록할 수 있습니다." }, { status: 403 });
  }

  const { classId, title } = await req.json();
  const trimmedTitle = String(title ?? "").trim();
  if (!classId || !trimmedTitle) {
    return NextResponse.json({ error: "학급과 제목을 입력해 주세요." }, { status: 400 });
  }

  const client = await getScopedSupabaseClient(user);
  const { data, error } = await client
    .from("title_presets")
    .insert({ class_id: classId, title: trimmedTitle })
    .select()
    .single();

  if (error) {
    if (error.message.includes("duplicate key")) {
      return NextResponse.json({ error: "이미 등록된 제목입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ titlePreset: data });
}
