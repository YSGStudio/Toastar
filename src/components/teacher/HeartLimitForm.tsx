"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeartLimitForm({
  heartLimit,
}: {
  /** 전교 공통값. 학급을 바꿔도 같은 값이 보인다. */
  heartLimit: number;
}) {
  const router = useRouter();
  const [limit, setLimit] = useState(heartLimit);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/teacher/vote-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heartLimit: limit }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">하트 정책</h2>
      <label className="block text-sm text-zinc-600">
        1인이 한 번의 투표에 쓸 수 있는 하트 수
        <span className="mt-0.5 block text-xs text-zinc-400">
          학생과 선생님 모두에게 같이 적용돼요. 학급 구분 없이 이 개수만 쓸 수 있고,
          투표가 끝나면 다음 투표에 다시 채워져요. (전교 공통 설정)
        </span>
        <input
          type="number"
          min={0}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">저장되었습니다.</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-[#6C5CE7] py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
