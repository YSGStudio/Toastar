"use client";

import { useHeart } from "@/components/HeartContext";
import { HeartIcon } from "@/components/icons";

export function HeartBadge() {
  const { heart } = useHeart();
  if (!heart) return null;

  return (
    <span className="flex items-center gap-1 text-sm font-semibold text-[#ED4956]">
      <HeartIcon filled className="h-5 w-5" />
      {heart.remaining}/{heart.limit}
    </span>
  );
}
