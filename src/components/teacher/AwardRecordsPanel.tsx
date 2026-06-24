"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Period } from "@/types/database";

interface AwardRow {
  id: string;
  heart_count: number;
  awarded_at: string;
  artworks: { title: string } | null;
  students: { name: string } | null;
  periods: { start_date: string; end_date: string } | null;
}

export function AwardRecordsPanel({
  closedPeriods,
  awards,
}: {
  closedPeriods: Period[];
  awards: AwardRow[];
}) {
  const router = useRouter();
  const [periodId, setPeriodId] = useState(closedPeriods[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCompute() {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "시상 집계에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">시상 기록</h2>

      <div className="flex gap-2">
        <select
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          {closedPeriods.length === 0 && <option value="">종료된 기간이 없습니다</option>}
          {closedPeriods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.start_date} ~ {p.end_date}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleCompute}
          disabled={!periodId || loading}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "집계 중..." : "시상 집계"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2">
        {awards.map((a) => (
          <li key={a.id} className="rounded-md bg-amber-50 px-3 py-2 text-sm">
            <span className="font-semibold">👑 {a.students?.name}</span> — {a.artworks?.title} (♥
            {a.heart_count})
            <span className="ml-2 text-xs text-zinc-500">
              {a.periods?.start_date} ~ {a.periods?.end_date}
            </span>
          </li>
        ))}
        {awards.length === 0 && <li className="text-sm text-zinc-400">아직 시상 기록이 없습니다.</li>}
      </ul>
    </div>
  );
}
