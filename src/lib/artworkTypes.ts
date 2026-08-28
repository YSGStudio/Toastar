import type { ArtworkType } from "@/types/database";

export type UploadedArtworkType = Exclude<ArtworkType, "link">;

/** 브라우저가 MIME 타입을 비워서 보내는 경우(HEIC 등)를 위한 확장자 기준 판별표. */
const TYPE_BY_EXTENSION: Record<string, UploadedArtworkType> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  bmp: "image",
  heic: "image",
  heif: "image",
  mp4: "video",
  m4v: "video",
  mov: "video",
  webm: "video",
  avi: "video",
  mkv: "video",
  mp3: "audio",
  m4a: "audio",
  wav: "audio",
  aac: "audio",
  ogg: "audio",
  flac: "audio",
  pdf: "pdf",
};

/** 파일 선택창에 노출할 형식. 확장자도 함께 넣어 MIME이 비는 기기에서도 선택할 수 있게 한다. */
export const FILE_ACCEPT = [
  "image/*",
  "video/*",
  "audio/*",
  "application/pdf",
  ...Object.keys(TYPE_BY_EXTENSION).map((ext) => `.${ext}`),
].join(",");

export const TYPE_LABELS: Record<ArtworkType, string> = {
  image: "이미지",
  video: "동영상",
  audio: "오디오",
  pdf: "PDF",
  link: "링크",
};

export const TYPE_ICONS: Record<ArtworkType, string> = {
  image: "🖼️",
  video: "🎬",
  audio: "🎵",
  pdf: "📄",
  link: "🔗",
};

/**
 * 업로드된 파일의 작품 형식을 판별한다. MIME 타입을 먼저 보고, 비어 있거나 알 수 없으면 확장자로 판단한다.
 * 클라이언트와 서버가 같은 규칙을 쓰도록 한곳에 둔다(최종 판정은 서버가 한다).
 */
export function detectArtworkType(file: { type: string; name: string }): UploadedArtworkType | null {
  const mime = file.type.toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  return TYPE_BY_EXTENSION[ext] ?? null;
}
