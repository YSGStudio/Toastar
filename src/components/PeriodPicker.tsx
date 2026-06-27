"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Period {
  id: string;
  start_date: string;
  end_date: string;
}

export function PeriodPicker({ selectedId }: { selectedId: string | null }) {
  const router = useRouter();
  const [periods, setPeriods] = useState<Period[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPeriods() {
    if (periods !== null || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/periods?status=closed");
      if (res.ok) {
        const data = await res.json();
        setPeriods(data.periods);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 이미 선택된 기간이 있는 상태로 진입(딥링크/새로고침)했다면 드롭다운 표시를 위해 미리 불러온다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedId) loadPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <select
      value={selectedId ?? ""}
      onFocus={loadPeriods}
      onChange={(e) => router.push(`/dashboard/archive?periodId=${e.target.value}`)}
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
    >
      <option value="" disabled>
        {loading ? "불러오는 중..." : "지난 기간을 선택하세요"}
      </option>
      {(periods ?? []).map((p) => (
        <option key={p.id} value={p.id}>
          {p.start_date} ~ {p.end_date}
        </option>
      ))}
    </select>
  );
}
