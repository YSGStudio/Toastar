import { NextResponse } from "next/server";
import { getCurrentUser, getScopedSupabaseClient } from "@/lib/auth/session";
import { ARTWORK_BUCKET } from "@/lib/storagePaths";
import { checkForAbusiveContent, flaggedContentMessage } from "@/lib/contentModeration";

type Params = { params: Promise<{ id: string }> };
type Client = Awaited<ReturnType<typeof getScopedSupabaseClient>>;

const SESSION_EXPIRED = "로그인이 만료되었어요. 새로고침한 뒤 다시 로그인해 주세요.";
const LOCKED_MESSAGE = "투표가 시작되면 작품을 고치거나 지울 수 없어요.";

/**
 * 학생 본인 작품이고 아직 게시 단계인지 확인한다. DB 정책도 같은 조건으로 막지만,
 * 정책은 조건이 안 맞으면 조용히 0건 처리하므로 여기서 먼저 걸러 이유를 알려 준다.
 */
async function checkStudentOwnership(client: Client, studentId: string, id: string) {
  const { data } = await client
    .from("artworks")
    .select("student_id, title, file_path, thumbnail_path, periods(phase)")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return { error: NextResponse.json({ error: "작품을 찾을 수 없습니다." }, { status: 404 }) };
  }
  if (data.student_id !== studentId) {
    return { error: NextResponse.json({ error: "내 작품만 고치거나 지울 수 있어요." }, { status: 403 }) };
  }
  const phase = (data.periods as unknown as { phase: string } | null)?.phase;
  if (phase !== "posting") {
    return { error: NextResponse.json({ error: LOCKED_MESSAGE }, { status: 409 }) };
  }
  return { artwork: data };
}

/** 학생이 게시 기간 동안 자기 작품의 제목과 설명을 고친다. 파일을 바꾸려면 지우고 다시 올린다. */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: SESSION_EXPIRED }, { status: 401 });
  if (user.role !== "student") {
    return NextResponse.json({ error: "학생만 자기 작품을 고칠 수 있어요." }, { status: 403 });
  }

  const { id } = await params;
  const client = await getScopedSupabaseClient(user);
  const checked = await checkStudentOwnership(client, user.studentId, id);
  if (checked.error) return checked.error;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const aiHelpDescription = String(body.aiHelpDescription ?? "").trim() || null;
  const selfDescription = String(body.selfDescription ?? "").trim() || null;

  if (!title) {
    return NextResponse.json({ error: "제목을 선택해 주세요." }, { status: 400 });
  }

  // 업로드 때와 같은 검사를 한다. 수정으로 검사를 우회하지 못하게 하기 위함이다.
  const combinedText = [aiHelpDescription, selfDescription].filter(Boolean).join("\n");
  const [titleAllowed, moderation] = await Promise.all([
    // 제목을 바꿀 때만 선생님 목록에 있는지 본다. 목록에서 빠진 기존 제목은 그대로 둘 수 있게 한다.
    title === checked.artwork.title
      ? Promise.resolve(true)
      : client
          .from("title_presets")
          .select("id")
          .eq("class_id", user.classId)
          .eq("title", title)
          .maybeSingle()
          .then(({ data }) => !!data),
    combinedText ? checkForAbusiveContent(combinedText) : Promise.resolve({ flagged: false, reason: null }),
  ]);

  if (!titleAllowed) {
    return NextResponse.json({ error: "선생님이 등록한 제목 중에서 선택해 주세요." }, { status: 400 });
  }
  if (moderation.flagged) {
    return NextResponse.json(
      { error: flaggedContentMessage(moderation), code: "CONTENT_FLAGGED" },
      { status: 400 },
    );
  }

  const { data: updated, error } = await client
    .from("artworks")
    .update({ title, ai_help_description: aiHelpDescription, self_description: selfDescription })
    .eq("id", id)
    .select("title, ai_help_description, self_description");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // 확인한 직후 투표가 시작됐다면 DB 정책이 막아 0건이 된다.
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 409 });
  }

  return NextResponse.json({ artwork: updated[0] });
}

/**
 * 작품을 지운다. 학생은 게시 기간 동안 자기 작품만, 교사는 담당 학급 작품을 지울 수 있다.
 * 파일은 작품 행을 지운 뒤에 지운다(행 삭제가 막히면 파일도 남겨 둔다).
 */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: SESSION_EXPIRED }, { status: 401 });

  const { id } = await params;
  const client = await getScopedSupabaseClient(user);

  let artwork: { file_path: string; thumbnail_path: string | null };
  if (user.role === "student") {
    const checked = await checkStudentOwnership(client, user.studentId, id);
    if (checked.error) return checked.error;
    artwork = checked.artwork;
  } else {
    const { data } = await client
      .from("artworks")
      .select("file_path, thumbnail_path")
      .eq("id", id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "작품을 찾을 수 없습니다." }, { status: 404 });
    artwork = data;
  }

  const { data: deleted, error } = await client.from("artworks").delete().eq("id", id).select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!deleted || deleted.length === 0) {
    // 정책이 조건에 안 맞는 행은 조용히 0건 삭제로 처리하므로 명시적으로 구분해 알려준다.
    return user.role === "student"
      ? NextResponse.json({ error: LOCKED_MESSAGE }, { status: 409 })
      : NextResponse.json({ error: "본인 학급의 작품만 삭제할 수 있습니다." }, { status: 403 });
  }

  const storagePaths = [artwork.file_path, artwork.thumbnail_path].filter(
    (p): p is string => !!p && !p.startsWith("http"),
  );
  if (storagePaths.length > 0) {
    await client.storage.from(ARTWORK_BUCKET).remove(storagePaths);
  }

  return NextResponse.json({ ok: true });
}
