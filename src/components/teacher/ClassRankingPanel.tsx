"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface RankingRow {
  id: string;
  period_id: string;
  rank: number;
  heart_count: number;
  awarded_at: string;
  artworks: { title: string } | null;
  students: { name: string } | null;
  periods: { start_date: string; end_date: string } | null;
}

interface PeriodGroup {
  periodId: string;
  startDate: string | null;
  endDate: string | null;
  aggregatedAt: string;
  rows: RankingRow[];
}

/** 같은 기간의 순위를 묶고, 최근 기간이 위로 오게 정렬한다. */
function groupByPeriod(rankings: RankingRow[]): PeriodGroup[] {
  const groups = new Map<string, PeriodGroup>();
  for (const row of rankings) {
    const group = groups.get(row.period_id) ?? {
      periodId: row.period_id,
      startDate: row.periods?.start_date ?? null,
      endDate: row.periods?.end_date ?? null,
      aggregatedAt: row.awarded_at,
      rows: [],
    };
    group.rows.push(row);
    groups.set(row.period_id, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, rows: [...group.rows].sort((a, b) => a.rank - b.rank) }))
    .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
}

function rankBadgeClass(rank: number) {
  if (rank === 1) return "bg-amber-400 text-white";
  if (rank <= 3) return "bg-amber-100 text-amber-700";
  return "bg-zinc-100 text-zinc-500";
}

function RankingList({ rows }: { rows: RankingRow[] }) {
  return (
    <ol className="divide-y divide-zinc-100">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-3 py-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankBadgeClass(row.rank)}`}
          >
            {row.rank === 1 ? "👑" : row.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-900">{row.students?.name ?? "알 수 없음"}</p>
            <p className="truncate text-xs text-zinc-500">{row.artworks?.title ?? ""}</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-[#ED4956]">♥ {row.heart_count}</span>
        </li>
      ))}
    </ol>
  );
}

export function ClassRankingPanel({
  classLabel,
  rankings,
  canAggregate,
}: {
  classLabel: string;
  rankings: RankingRow[];
  /** 운영자만 집계할 수 있다. 교사는 자기 반 순위를 보기만 한다. */
  canAggregate: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [latest, ...older] = groupByPeriod(rankings);

  async function handleAggregate() {
    const ok = confirm(
      "투표가 끝난 모든 학급을 집계할까요?\n학급마다 가장 최근에 끝난 기간을 하트 순으로 다시 계산해 덮어써요.",
    );
    if (!ok) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/awards", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "집계에 실패했습니다.");
        return;
      }
      setMessage(`${data.classCount}개 학급, ${data.studentCount}명의 순위를 집계했어요.`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">{classLabel} 순위</h2>
        {canAggregate && (
          <button
            type="button"
            onClick={handleAggregate}
            disabled={loading}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "집계 중..." : "전체 학급 집계"}
          </button>
        )}
      </div>

      {canAggregate && (
        <p className="text-xs text-zinc-500">
          투표가 끝난 학급마다 가장 최근 기간을 하트 순으로 정렬해 상위 10명을 뽑아요. 동점은 같은 순위로 함께
          올라가서 10명을 넘을 수 있어요. 각 학급 선생님은 환경설정 첫 화면에서 자기 반 순위를 봅니다.
        </p>
      )}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!latest ? (
        <p className="rounded-md bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-400">
          {canAggregate
            ? "이 학급은 아직 집계된 순위가 없어요."
            : "아직 집계된 순위가 없어요. 투표가 끝나고 운영자가 집계하면 여기에 표시돼요."}
        </p>
      ) : (
        <section className="space-y-1">
          <p className="text-sm font-semibold text-zinc-700">
            {latest.startDate} ~ {latest.endDate}
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {latest.aggregatedAt.slice(0, 10)} 집계
            </span>
          </p>
          <RankingList rows={latest.rows} />
        </section>
      )}

      {older.map((group) => (
        <details key={group.periodId} className="rounded-md border border-zinc-200 px-3 py-2">
          <summary className="cursor-pointer text-sm text-zinc-600">
            {group.startDate} ~ {group.endDate} 순위
          </summary>
          <RankingList rows={group.rows} />
        </details>
      ))}
    </div>
  );
}
