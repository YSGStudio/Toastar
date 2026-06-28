"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DayType, LoginBlockRule } from "@/types/database";

interface RuleState {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

function toRuleState(rule: LoginBlockRule | undefined): RuleState {
  return {
    enabled: rule?.enabled ?? false,
    startTime: rule?.start_time?.slice(0, 5) ?? "09:00",
    endTime: rule?.end_time?.slice(0, 5) ?? "15:00",
  };
}

const LABELS: Record<DayType, string> = { weekday: "평일 (월~금)", weekend: "주말 (토~일)" };

export function LoginBlockRulesForm({
  classId,
  rules,
}: {
  classId: string;
  rules: LoginBlockRule[];
}) {
  const router = useRouter();
  const [weekday, setWeekday] = useState(toRuleState(rules.find((r) => r.day_type === "weekday")));
  const [weekend, setWeekend] = useState(toRuleState(rules.find((r) => r.day_type === "weekend")));
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/teacher/login-block-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          rules: [
            { dayType: "weekday", ...weekday },
            { dayType: "weekend", ...weekend },
          ],
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  function renderRule(dayType: DayType, state: RuleState, setState: (s: RuleState) => void) {
    return (
      <div key={dayType} className="rounded-lg border border-zinc-200 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{LABELS[dayType]}</span>
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(e) => setState({ ...state, enabled: e.target.checked })}
            />
            차단 사용
          </label>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="time"
            value={state.startTime}
            disabled={!state.enabled}
            onChange={(e) => setState({ ...state, startTime: e.target.value })}
            className="rounded-md border border-zinc-300 px-2 py-1 disabled:opacity-50"
          />
          <span className="text-zinc-400">~</span>
          <input
            type="time"
            value={state.endTime}
            disabled={!state.enabled}
            onChange={(e) => setState({ ...state, endTime: e.target.value })}
            className="rounded-md border border-zinc-300 px-2 py-1 disabled:opacity-50"
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">학생 로그인 차단 시간</h2>
      <p className="text-xs text-zinc-500">차단 시간에 학생이 로그인하면 &quot;로그인이 불가능합니다.&quot; 안내가 표시됩니다. 교사 로그인에는 적용되지 않습니다.</p>
      {renderRule("weekday", weekday, setWeekday)}
      {renderRule("weekend", weekend, setWeekend)}
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
