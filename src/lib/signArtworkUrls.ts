import type { SupabaseClient } from "@supabase/supabase-js";
import { ARTWORK_BUCKET } from "@/lib/storagePaths";

/** 서명 URL 수명. 화면을 열어 둔 채 한참 뒤에 작품을 눌러도 만료되지 않을 만큼 잡는다. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** 작품의 file_path/thumbnail_path 중 Storage 경로(외부 링크가 아닌 것)에 서명 URL을 발급한다. */
export async function signArtworkPaths(
  client: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const targets = Array.from(
    new Set(paths.filter((p): p is string => !!p && !p.startsWith("http"))),
  );
  if (targets.length === 0) return new Map();

  const { data } = await client.storage
    .from(ARTWORK_BUCKET)
    .createSignedUrls(targets, SIGNED_URL_TTL_SECONDS);

  const map = new Map<string, string>();
  (data ?? []).forEach((item, i) => {
    if (item.signedUrl) map.set(targets[i], item.signedUrl);
  });
  return map;
}
