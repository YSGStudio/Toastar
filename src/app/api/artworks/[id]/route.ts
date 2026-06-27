import { NextResponse } from "next/server";
import { getCurrentUser, getScopedSupabaseClient } from "@/lib/auth/session";
import { ARTWORK_BUCKET } from "@/lib/storagePaths";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "교사만 작품을 삭제할 수 있습니다." }, { status: 403 });
  }

  const { id } = await params;
  const client = await getScopedSupabaseClient(user);

  const { data: artwork } = await client
    .from("artworks")
    .select("file_path, thumbnail_path")
    .eq("id", id)
    .maybeSingle();

  if (!artwork) {
    return NextResponse.json({ error: "작품을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: deleted, error } = await client.from("artworks").delete().eq("id", id).select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!deleted || deleted.length === 0) {
    // RLS가 본인 학급 소유가 아닌 행은 조용히 0건 삭제로 처리하므로 명시적으로 구분해 알려준다.
    return NextResponse.json(
      { error: "본인 학급의 작품만 삭제할 수 있습니다." },
      { status: 403 },
    );
  }

  const storagePaths = [artwork.file_path, artwork.thumbnail_path].filter(
    (p): p is string => !!p && !p.startsWith("http"),
  );
  if (storagePaths.length > 0) {
    await client.storage.from(ARTWORK_BUCKET).remove(storagePaths);
  }

  return NextResponse.json({ ok: true });
}
