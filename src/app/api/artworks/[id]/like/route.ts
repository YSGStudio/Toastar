import { NextResponse } from "next/server";
import { getCurrentUser, getScopedSupabaseClient } from "@/lib/auth/session";
import { getRemainingHearts } from "@/lib/heartStatus";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  // 학생 세션(12시간)이 만료되면 여기로 떨어진다. 원인을 알 수 있는 문구를 내려준다.
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 만료되었어요. 새로고침한 뒤 다시 로그인해 주세요." },
      { status: 401 },
    );
  }
  if (user.role !== "student") {
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

  // 응답에 서버가 계산한 오늘 잔량을 함께 실어 보낸다. 클라이언트가 낙관적으로 더하고 빼는 값이
  // 서버와 어긋나는 것(연타·중복 요청·만료된 세션 등)을 매 요청마다 바로잡기 위함이다.
  const heart = await getRemainingHearts(user);

  if (error) {
    if (error.message.includes("DAILY_HEART_LIMIT_EXCEEDED")) {
      return NextResponse.json(
        { error: "오늘 하트를 모두 사용했어요.", code: "DAILY_LIMIT", heart },
        { status: 429 },
      );
    }
    if (error.code === "23505" || error.message.includes("duplicate key")) {
      return NextResponse.json(
        { error: "이미 하트를 준 작품이에요.", code: "ALREADY_LIKED", heart },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message, heart }, { status: 400 });
  }

  return NextResponse.json({ ok: true, heart });
}
