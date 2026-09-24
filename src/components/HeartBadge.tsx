"use client";

import { useHeart } from "@/components/HeartContext";
import { HeartIcon } from "@/components/icons";

/** 하트는 학급마다 따로 주어지므로, 지금 열려 있는 학급 탭 기준으로 남은 수를 보여 준다. */
export function HeartBadge() {
  const { heart, selectedClassId, remainingFor } = useHeart();
  const remaining = remainingFor(selectedClassId);
  if (!heart || remaining === null) return null;

  return (
    <span
      className="flex items-center gap-1 text-sm font-semibold text-[#ED4956]"
      title="지금 보고 있는 학급에 남은 하트"
    >
      <HeartIcon filled className="h-5 w-5" />
      {remaining}/{heart.limit}
    </span>
  );
}
