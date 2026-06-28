"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Period } from "@/types/database";

export function PeriodManager({ classId, periods }: { classId: string; periods: Period[] }) {
  const router = useRouter();
  const active = periods.find((p) => p.status === "active");
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStartNewPeriod(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "기간 생성에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">기간 관리</h2>

      {active ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          현재 진행 중: {active.start_date} ~ {active.end_date}
        </p>
      ) : (
        <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-500">진행 중인 기간이 없습니다.</p>
      )}

      <form onSubmit={handleStartNewPeriod} className="space-y-2">
        <p className="text-sm font-medium text-zinc-600">새 기간 시작 (현재 기간은 자동으로 종료됩니다)</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[#6C5CE7] py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "처리 중..." : "새 기간 시작"}
        </button>
      </form>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-600">지난 기간</p>
        <ul className="space-y-1 text-sm text-zinc-500">
          {periods
            .filter((p) => p.status === "closed")
            .map((p) => (
              <li key={p.id}>
                {p.start_date} ~ {p.end_date}
              </li>
            ))}
          {periods.filter((p) => p.status === "closed").length === 0 && <li>아직 종료된 기간이 없습니다.</li>}
        </ul>
      </div>
    </div>
  );
}
