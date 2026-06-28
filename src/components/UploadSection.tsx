"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadArtworkForm } from "@/components/UploadArtworkForm";

export function UploadSection({ alreadyPosted }: { alreadyPosted: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (alreadyPosted) {
    return (
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
        이번 기간에 작품을 올렸어요. 다음 기간을 기다려 주세요!
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
