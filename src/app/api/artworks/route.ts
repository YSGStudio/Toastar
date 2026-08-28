import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getScopedSupabaseClient } from "@/lib/auth/session";
import { fetchArtworkList } from "@/lib/artworks";
import { ARTWORK_BUCKET, artworkFilePath, artworkThumbnailPath } from "@/lib/storagePaths";
import { fetchLinkPreviewImage } from "@/lib/ogImage";
import { checkForAbusiveContent } from "@/lib/contentModeration";
import { detectArtworkType } from "@/lib/artworkTypes";
import type { ArtworkType } from "@/types/database";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const scope = (req.nextUrl.searchParams.get("scope") ?? "latest") as "latest" | "archive" | "mine";
  const periodId = req.nextUrl.searchParams.get("periodId");

  if (scope === "archive" && !periodId) {
    return NextResponse.json({ error: "periodId가 필요합니다." }, { status: 400 });
  }
  if (scope === "mine" && user.role !== "student") {
    return NextResponse.json({ error: "학생만 접근할 수 있습니다." }, { status: 403 });
  }

  const artworks = await fetchArtworkList(user, { scope, periodId });
  return NextResponse.json({ artworks });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "학생만 작품을 업로드할 수 있습니다." }, { status: 403 });
  }

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const aiHelpDescription = String(form.get("aiHelpDescription") ?? "").trim() || null;
  const selfDescription = String(form.get("selfDescription") ?? "").trim() || null;
  const isLink = String(form.get("type") ?? "") === "link";
  const linkUrl = String(form.get("linkUrl") ?? "").trim();
  const file = form.get("file");
  const thumbnailFile = form.get("thumbnail");

  if (!title) {
    return NextResponse.json({ error: "제목을 선택해 주세요." }, { status: 400 });
  }
  if (isLink && !linkUrl) {
    return NextResponse.json({ error: "링크 주소를 입력해 주세요." }, { status: 400 });
  }
  if (!isLink && !(file instanceof File)) {
    return NextResponse.json({ error: "파일을 첨부해 주세요." }, { status: 400 });
  }

  // 작품 형식은 클라이언트가 보낸 값이 아니라 실제 파일에서 판별한다.
  let type: ArtworkType = "link";
  if (!isLink && file instanceof File) {
    const detected = detectArtworkType(file);
    if (!detected) {
      return NextResponse.json(
        { error: "이미지·동영상·오디오·PDF 파일만 올릴 수 있어요." },
        { status: 400 },
      );
    }
    type = detected;
  }

  const client = await getScopedSupabaseClient(user);

  // 제목 검증·비속어 검사·기간 조회는 서로 독립이므로 병렬로 실행한다 (OpenAI 검사가 가장 느리다).
  const combinedText = [aiHelpDescription, selfDescription].filter(Boolean).join("\n");
  const [{ data: titlePreset }, moderation, { data: activePeriod }] = await Promise.all([
    client
      .from("title_presets")
      .select("id")
      .eq("class_id", user.classId)
      .eq("title", title)
      .maybeSingle(),
    combinedText
      ? checkForAbusiveContent(combinedText)
      : Promise.resolve({ flagged: false, reason: null }),
    client
      .from("periods")
      .select("id")
      .eq("class_id", user.classId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (!titlePreset) {
    return NextResponse.json(
      { error: "선생님이 등록한 제목 중에서 선택해 주세요." },
      { status: 400 },
    );
  }

  if (moderation.flagged) {
    return NextResponse.json(
      {
        error: moderation.reason
          ? `욕설이나 비속어, 다른 사람에 대한 비난이 있는지 다시 확인해 주세요. (${moderation.reason})`
          : "욕설이나 비속어, 다른 사람에 대한 비난이 있는지 다시 확인해 주세요.",
        code: "CONTENT_FLAGGED",
      },
      { status: 400 },
    );
  }

  if (!activePeriod) {
    return NextResponse.json({ error: "현재 진행 중인 게시 기간이 없습니다." }, { status: 400 });
  }

  const { data: existing } = await client
    .from("artworks")
    .select("id")
    .eq("student_id", user.studentId)
    .eq("period_id", activePeriod.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "이번 기간에는 이미 작품을 올렸습니다." }, { status: 409 });
  }

  const artworkId = randomUUID();
  let filePath = linkUrl;
  let thumbnailPath: string | null = null;

  if (isLink) {
    const preview = await fetchLinkPreviewImage(linkUrl);
    if (preview) {
      thumbnailPath = artworkThumbnailPath({ classId: user.classId, studentId: user.studentId, artworkId });
      const { error: thumbError } = await client.storage
        .from(ARTWORK_BUCKET)
        .upload(thumbnailPath, preview.bytes, { contentType: preview.contentType, upsert: true });
      if (thumbError) thumbnailPath = null;
    }
  } else if (file instanceof File) {
    filePath = artworkFilePath({
      classId: user.classId,
      studentId: user.studentId,
      artworkId,
      fileName: file.name,
    });
    const { error: uploadError } = await client.storage
      .from(ARTWORK_BUCKET)
      .upload(filePath, file, {
        // PDF는 브라우저에서 바로 열람할 수 있도록 Content-Type을 명시한다.
        contentType: type === "pdf" ? "application/pdf" : file.type || undefined,
        upsert: false,
      });
    if (uploadError) {
      return NextResponse.json({ error: `파일 업로드 실패: ${uploadError.message}` }, { status: 400 });
    }

    if (thumbnailFile instanceof File) {
      thumbnailPath = artworkThumbnailPath({ classId: user.classId, studentId: user.studentId, artworkId });
      const { error: thumbError } = await client.storage
        .from(ARTWORK_BUCKET)
        .upload(thumbnailPath, thumbnailFile, { contentType: thumbnailFile.type || "image/jpeg", upsert: false });
      if (thumbError) thumbnailPath = null;
    } else if (type === "image") {
      thumbnailPath = filePath;
    }
  }

  const { data: artwork, error: insertError } = await client
    .from("artworks")
    .insert({
      id: artworkId,
      class_id: user.classId,
      period_id: activePeriod.id,
      student_id: user.studentId,
      type,
      file_path: filePath,
      thumbnail_path: thumbnailPath,
      title,
      ai_help_description: aiHelpDescription,
      self_description: selfDescription,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ artwork });
}
