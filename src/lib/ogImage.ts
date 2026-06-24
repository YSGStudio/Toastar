/** 외부 링크의 og:image(또는 favicon)를 가져와 바이트와 content-type을 반환한다. 실패하면 null. */
export async function fetchLinkPreviewImage(
  pageUrl: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const pageRes = await fetch(pageUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!pageRes.ok) return null;

    const html = await pageRes.text();
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const imageUrl = ogMatch?.[1] ? new URL(ogMatch[1], pageUrl).toString() : null;
    if (!imageUrl) return null;

    const imgController = new AbortController();
    const imgTimeout = setTimeout(() => imgController.abort(), 4000);
    const imgRes = await fetch(imageUrl, { signal: imgController.signal });
    clearTimeout(imgTimeout);
    if (!imgRes.ok) return null;

    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    return { bytes, contentType };
  } catch {
    return null;
  }
}
