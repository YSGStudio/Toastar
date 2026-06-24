"use client";

import { useState } from "react";
import { PeriodManager } from "@/components/teacher/PeriodManager";
import { HeartLimitForm } from "@/components/teacher/HeartLimitForm";
import { LoginBlockRulesForm } from "@/components/teacher/LoginBlockRulesForm";
import { StudentManager } from "@/components/teacher/StudentManager";
import { AwardRecordsPanel } from "@/components/teacher/AwardRecordsPanel";
import type { AccountRole, ClassRow, LoginBlockRule, Period, Student } from "@/types/database";

const ADMIN_TABS = ["기간 관리", "하트 정책", "로그인 차단", "시상 기록"] as const;
const TEACHER_TABS = ["학생 관리", "시상 기록"] as const;

interface AwardRow {
  id: string;
  heart_count: number;
  awarded_at: string;
  artworks: { title: string } | null;
  students: { name: string } | null;
  periods: { start_date: string; end_date: string } | null;
}

export function SettingsTabs({
  accountRole,
  classRow,
  periods,
  loginBlockRules,
  awards,
  students,
}: {
  accountRole: AccountRole;
  classRow: ClassRow;
  periods: Period[];
  loginBlockRules: LoginBlockRule[];
  awards: AwardRow[];
  students: Student[];
}) {
  const tabs = accountRole === "admin" ? ADMIN_TABS : TEACHER_TABS;
  const [tab, setTab] = useState<string>(tabs[0]);
  const closedPeriods = periods.filter((p) => p.status === "closed");

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-zinc-100 p-1 text-sm">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-2 font-medium ${
              tab === t ? "bg-white shadow text-[#0095F6]" : "text-zinc-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {accountRole === "admin" && tab === "기간 관리" && (
        <PeriodManager classId={classRow.id} periods={periods} />
      )}
      {accountRole === "admin" && tab === "하트 정책" && (
        <HeartLimitForm
          classId={classRow.id}
          dailyHeartLimit={classRow.daily_heart_limit}
          awardTopN={classRow.award_top_n}
        />
      )}
      {accountRole === "admin" && tab === "로그인 차단" && (
        <LoginBlockRulesForm classId={classRow.id} rules={loginBlockRules} />
      )}
      {accountRole === "teacher" && tab === "학생 관리" && (
        <StudentManager classId={classRow.id} initialStudents={students} />
      )}
      {tab === "시상 기록" && (
        <AwardRecordsPanel
          closedPeriods={closedPeriods}
          awards={awards}
          canManage={accountRole === "admin"}
        />
      )}
    </div>
  );
}
