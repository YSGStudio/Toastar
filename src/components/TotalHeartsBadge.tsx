"use client";

import { useHeart } from "@/components/HeartContext";
import { TrophyIcon } from "@/components/icons";

export function TotalHeartsBadge() {
  const { heart } = useHeart();
  // 교사는 받은 하트가 없으므로 배지 자체를 띄우지 않는다.
  if (!heart || heart.totalReceived === null) return null;

  return (
    <span
      className="flex items-center gap-1 text-sm font-semibold text-amber-500"
      title="내가 받은 누적 하트 수"
    >
      <TrophyIcon className="h-5 w-5" />
      {heart.totalReceived}
    </span>
  );
}
