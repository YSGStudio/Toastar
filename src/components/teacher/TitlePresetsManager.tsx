"use client";

import { useState } from "react";
import type { TitlePreset } from "@/types/database";

export function TitlePresetsManager({
  classId,
  initialTitlePresets,
}: {
  classId: string;
  initialTitlePresets: TitlePreset[];
}) {
  const [presets, setPresets] = useState(initialTitlePresets);
  const [prevInitial, setPrevInitial] = useState(initialTitlePresets);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (initialTitlePresets !== prevInitial) {
    setPrevInitial(initialTitlePresets);
    setPresets(initialTitlePresets);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/title-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "제목 등록에 실패했습니다.");
        return;
      }
      setPresets((prev) => [...prev, data.titlePreset].sort((a, b) => a.title.localeCompare(b.title)));
      setTitle("");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 제목을 목록에서 삭제할까요?")) return;
    const res = await fetch(`/api/title-presets/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPresets((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">작품 제목 관리</h2>
      <p className="text-xs text-zinc-500">
        여기에 등록한 제목만 학생이 작품을 올릴 때 선택할 수 있어요.
      </p>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="예: 가을 풍경 그리기"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={60}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-md bg-[#0095F6] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          추가
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
        {presets.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-1.5">
            <span>{p.title}</span>
            <button
              type="button"
              onClick={() => handleDelete(p.id)}
              className="text-xs font-medium text-red-500 hover:underline"
            >
              삭제
            </button>
          </li>
        ))}
        {presets.length === 0 && <li className="text-zinc-400">등록된 제목이 없습니다.</li>}
      </ul>
    </div>
  );
}
