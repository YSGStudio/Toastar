"use client";

import { useState } from "react";
import { PeriodManager } from "@/components/teacher/PeriodManager";
import { HeartLimitForm } from "@/components/teacher/HeartLimitForm";
import { LoginBlockRulesForm } from "@/components/teacher/LoginBlockRulesForm";
import { StudentBulkUpload } from "@/components/teacher/StudentBulkUpload";
import { AwardRecordsPanel } from "@/components/teacher/AwardRecordsPanel";
import type { ClassRow, LoginBlockRule, Period } from "@/types/database";

const TABS = ["기간 관리", "하트 정책", "로그인 차단", "학생 관리", "시상 기록"] as const;
type Tab = (typeof TABS)[number];

interface AwardRow {
  id: string;
  heart_count: number;
  awarded_at: string;
  artworks: { title: string } | null;
  students: { name: string } | null;
  periods: { start_date: string; end_date: string } | null;
}

export function SettingsTabs({
  classRow,
  periods,
  loginBlockRules,
  awards,
}: {
  classRow: ClassRow;
  periods: Period[];
  loginBlockRules: LoginBlockRule[];
  awards: AwardRow[];
}) {
  const [tab, setTab] = useState<Tab>("기간 관리");
  const closedPeriods = periods.filter((p) => p.status === "closed");

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-zinc-100 p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-2 font-medium ${
              tab === t ? "bg-white shadow text-indigo-700" : "text-zinc-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "기간 관리" && <PeriodManager classId={classRow.id} periods={periods} />}
      {tab === "하트 정책" && (
        <HeartLimitForm
          classId={classRow.id}
          dailyHeartLimit={classRow.daily_heart_limit}
          awardTopN={classRow.award_top_n}
        />
      )}
      {tab === "로그인 차단" && <LoginBlockRulesForm classId={classRow.id} rules={loginBlockRules} />}
      {tab === "학생 관리" && <StudentBulkUpload classId={classRow.id} />}
      {tab === "시상 기록" && <AwardRecordsPanel closedPeriods={closedPeriods} awards={awards} />}
    </div>
  );
}
