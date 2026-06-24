"use client";

import { useRouter } from "next/navigation";

export function PeriodPicker({
  periods,
  selectedId,
}: {
  periods: { id: string; start_date: string; end_date: string }[];
  selectedId: string | null;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => router.push(`/dashboard/archive?periodId=${e.target.value}`)}
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
    >
      <option value="" disabled>
        지난 기간을 선택하세요
      </option>
      {periods.map((p) => (
        <option key={p.id} value={p.id}>
          {p.start_date} ~ {p.end_date}
        </option>
      ))}
    </select>
  );
}
