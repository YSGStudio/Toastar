"use client";

import { useEffect, useState } from "react";
import type { ArtworkListItem } from "@/types/client";
import type { TitlePreset } from "@/types/database";

export interface ArtworkEdits {
  title: string;
  aiHelpDescription: string;
  selfDescription: string;
}

/** 학생이 게시 기간 동안 자기 작품의 제목과 설명을 고치는 폼. 파일을 바꾸려면 지우고 다시 올린다. */
export function ArtworkEditForm({
  artwork,
  onSave,
  onCancel,
}: {
  artwork: ArtworkListItem;
  /** 실패하면 보여 줄 오류 문구를, 성공하면 null을 돌려준다. */
  onSave: (edits: ArtworkEdits) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [titlePresets, setTitlePresets] = useState<TitlePreset[] | null>(null);
  const [title, setTitle] = useState(artwork.title);
  const [aiHelpDescription, setAiHelpDescription] = useState(artwork.ai_help_description ?? "");
  const [selfDescription, setSelfDescription] = useState(artwork.self_description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/title-presets")
      .then((res) => (res.ok ? res.json() : { titlePresets: [] }))
      .then((data) => setTitlePresets(data.titlePresets ?? []))
      .catch(() => setTitlePresets([]));
  }, []);

  // 선생님이 목록에서 지금 제목을 뺐더라도 그대로 둘 수 있게 선택지에 남긴다.
  const presetTitles = (titlePresets ?? []).map((p) => p.title);
  const titleOptions = presetTitles.includes(artwork.title) ? presetTitles : [artwork.title, ...presetTitles];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const message = await onSave({ title, aiHelpDescription, selfDescription });
      if (message) setError(message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <select value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass}>
        {titleOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <label className="block text-xs font-medium text-zinc-500">
        AI의 도움을 받은 점
        <textarea
          value={aiHelpDescription}
          onChange={(e) => setAiHelpDescription(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-500">
        내가 스스로 한 점
        <textarea
          value={selfDescription}
          onChange={(e) => setSelfDescription(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </label>
      <p className="text-[11px] text-zinc-400">파일을 바꾸려면 작품을 지우고 다시 올려 주세요.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-md border border-zinc-300 py-2 text-sm font-medium text-zinc-600 disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving || !title}
          className="flex-1 rounded-md bg-[#6C5CE7] py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
