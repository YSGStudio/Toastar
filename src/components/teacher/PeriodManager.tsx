"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RankingResult } from "@/lib/rankings";
import type { Period, PeriodPhase } from "@/types/database";

const PHASE_STEPS: { phase: PeriodPhase; label: string; hint: string }[] = [
  { phase: "posting", label: "게시", hint: "학생들이 작품을 올립니다. 투표는 아직 열리지 않습니다." },
  { phase: "voting", label: "투표", hint: "게시가 마감되고, 학생들이 하트를 나눠 줍니다." },
  { phase: "closed", label: "종료", hint: "기간이 끝났고 학급별 순위(10등까지)가 선정되었습니다. 순위 집계 탭에서 확인할 수 있습니다." },
];

export function PeriodManager({ periods }: { periods: Period[] }) {
  const router = useRouter();
  const current = periods.find((p) => p.phase !== "closed");
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send(
    method: "POST" | "PATCH",
    url: string,
    body: unknown,
    fallbackMessage: string,
  ): Promise<{ ranking?: RankingResult | null } | null> {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? fallbackMessage);
        return null;
      }
      router.refresh();
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function handleStartNewPeriod(e: React.FormEvent) {
    e.preventDefault();
    await send("POST", "/api/periods", { startDate, endDate }, "기간 생성에 실패했습니다.");
  }

  async function handleAdvance(next: PeriodPhase) {
    if (!current) return;
    const confirmMessage =
      next === "voting"
        ? "투표를 시작할까요? 지금부터 학생들은 작품을 올릴 수 없고 하트를 줄 수 있습니다."
        : "투표를 종료할까요? 되돌릴 수 없습니다.\n종료하면 학급별 순위(10등까지)가 바로 선정되고, 학생들에게도 작품을 올린 학생 이름과 하트 수가 공개됩니다.";
    if (!confirm(confirmMessage)) return;
    const data = await send("PATCH", `/api/periods/${current.id}`, { phase: next }, "단계를 넘기지 못했습니다.");
    const ranking = data?.ranking;
    if (ranking) {
      setNotice(
        ranking.ok
          ? `투표를 종료하고 ${ranking.classCount}개 학급, ${ranking.studentCount}명의 순위를 선정했어요.`
          : `투표는 종료됐지만 순위를 선정하지 못했어요. ${ranking.error}`,
      );
    }
  }

  const currentStepIndex = current ? PHASE_STEPS.findIndex((s) => s.phase === current.phase) : -1;

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-bold">기간 관리</h2>
        <p className="mt-0.5 text-xs text-zinc-500">여기서 정한 기간과 단계는 모든 학급에 함께 적용돼요.</p>
      </div>

      {current ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
          <p className="text-sm font-semibold text-zinc-900">
            {current.start_date} ~ {current.end_date}
          </p>

          <ol className="flex items-center gap-1 text-xs font-medium">
            {PHASE_STEPS.map((step, i) => (
              <li key={step.phase} className="flex items-center gap-1">
                <span
                  className={`rounded-full px-2.5 py-1 ${
                    i === currentStepIndex
                      ? "bg-[#6C5CE7] text-white"
                      : i < currentStepIndex
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {i + 1}. {step.label}
                </span>
                {i < PHASE_STEPS.length - 1 && <span className="text-zinc-300">→</span>}
              </li>
            ))}
          </ol>

          <p className="text-sm text-zinc-500">{PHASE_STEPS[currentStepIndex]?.hint}</p>

          {current.phase === "posting" && (
            <button
              type="button"
              onClick={() => handleAdvance("voting")}
              disabled={loading}
              className="w-full rounded-md bg-[#ED4956] py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "처리 중..." : "투표 시작"}
            </button>
          )}
          {current.phase === "voting" && (
            <button
              type="button"
              onClick={() => handleAdvance("closed")}
              disabled={loading}
              className="w-full rounded-md bg-zinc-800 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "처리 중..." : "투표 종료"}
            </button>
          )}
        </div>
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
        {notice && <p className="text-sm text-emerald-600">{notice}</p>}
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
            .filter((p) => p.phase === "closed")
            .map((p) => (
              <li key={p.id}>
                {p.start_date} ~ {p.end_date}
              </li>
            ))}
          {periods.filter((p) => p.phase === "closed").length === 0 && <li>아직 종료된 기간이 없습니다.</li>}
        </ul>
      </div>
    </div>
  );
}
