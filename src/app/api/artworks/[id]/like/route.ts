import { NextResponse } from "next/server";
import { getCurrentUser, getScopedSupabaseClient } from "@/lib/auth/session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "학생만 좋아요를 누를 수 있습니다." }, { status: 403 });
  }
  const { id } = await params;
  const client = await getScopedSupabaseClient(user);

  const { data: artwork } = await client
    .from("artworks")
    .select("student_id")
    .eq("id", id)
    .maybeSingle();

  if (artwork?.student_id === user.studentId) {
    return NextResponse.json({ error: "자신의 작품에는 하트를 줄 수 없어요." }, { status: 400 });
  }

  const { error } = await client
    .from("artwork_likes")
    .insert({ artwork_id: id, student_id: user.studentId });

  if (error) {
    if (error.message.includes("DAILY_HEART_LIMIT_EXCEEDED")) {
      return NextResponse.json(
        { error: "오늘 하트를 모두 사용했어요.", code: "DAILY_LIMIT" },
        { status: 429 },
      );
    }
    if (error.message.includes("duplicate key")) {
      return NextResponse.json({ error: "이미 좋아요를 누른 작품입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "학생만 좋아요를 취소할 수 있습니다." }, { status: 403 });
  }
  const { id } = await params;
  const client = await getScopedSupabaseClient(user);

  const { error } = await client
    .from("artwork_likes")
    .delete()
    .eq("artwork_id", id)
    .eq("student_id", user.studentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
