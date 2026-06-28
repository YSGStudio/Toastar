export interface PastelTone {
  card: string;
  fallback: string;
}

/** Jambo 참고 디자인의 파스텔 캐릭터 타일 톤을 본떠 만든 순환 팔레트. */
export const PASTEL_PALETTE: PastelTone[] = [
  { card: "bg-violet-100", fallback: "bg-violet-200" },
  { card: "bg-emerald-100", fallback: "bg-emerald-200" },
  { card: "bg-orange-100", fallback: "bg-orange-200" },
  { card: "bg-sky-100", fallback: "bg-sky-200" },
  { card: "bg-pink-100", fallback: "bg-pink-200" },
  { card: "bg-yellow-100", fallback: "bg-yellow-200" },
];

/** 같은 id는 항상 같은 색이 나오도록 안정적인 해시로 팔레트를 고른다. */
export function pastelToneFor(id: string): PastelTone {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PASTEL_PALETTE[hash % PASTEL_PALETTE.length];
}
