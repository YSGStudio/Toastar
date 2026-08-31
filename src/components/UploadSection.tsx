"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadArtworkForm } from "@/components/UploadArtworkForm";
import type { PeriodPhase } from "@/types/database";

export function UploadSection({
  phase,
  alreadyPosted,
}: {
  /** 진행 중인 기간의 단계. 기간이 없으면 null. */
  phase: PeriodPhase | null;
  alreadyPosted: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!phase) {
    return (
      <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-500">
        지금은 진행 중인 기간이 없어요. 선생님이 새 기간을 시작하면 작품을 올릴 수 있어요.
      </div>
    );
  }

  if (alreadyPosted) {
    return (
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
        {phase === "posting"
          ? "이번 기간에 작품을 올렸어요. 투표가 시작될 때까지 기다려 주세요!"
          : "이번 기간에 작품을 올렸어요. 지금은 투표 기간이에요!"}
      </div>
    );
  }

  // 투표가 시작되면 게시는 마감된다.
  if (phase !== "posting") {
    return (
      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
        작품을 올리는 기간이 끝났어요. 지금은 투표 기간이에요.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed border-[#6C5CE7]/30 bg-[#6C5CE7]/5 py-4 text-sm font-semibold text-[#6C5CE7]"
      >
        + 작품 올리기
      </button>
    );
  }

  return (
    <UploadArtworkForm
      onUploaded={() => {
        setOpen(false);
        router.refresh();
      }}
    />
  );
}
