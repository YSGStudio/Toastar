"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeartLimitForm({
  classId,
  dailyHeartLimit,
  awardTopN,
}: {
  classId: string;
  dailyHeartLimit: number;
  awardTopN: number;
}) {
  const router = useRouter();
  const [limit, setLimit] = useState(dailyHeartLimit);
  const [topN, setTopN] = useState(awardTopN);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/teacher/class-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, dailyHeartLimit: limit, awardTopN: topN }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">하트 정책</h2>
      <label className="block text-sm text-zinc-600">
        학생 1인 1일 하트 한도
        <input
          type="number"
          min={0}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm text-zinc-600">
        주기당 수상 인원 수
        <input
          type="number"
          min={1}
          value={topN}
          onChange={(e) => setTopN(Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      {saved && <p className="text-sm text-emerald-600">저장되었습니다.</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
