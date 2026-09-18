"use client";

import { useState } from "react";
import { PeriodManager } from "@/components/teacher/PeriodManager";
import { HeartLimitForm } from "@/components/teacher/HeartLimitForm";
import { LoginBlockRulesForm } from "@/components/teacher/LoginBlockRulesForm";
import { StudentManager } from "@/components/teacher/StudentManager";
import { TitlePresetsManager } from "@/components/teacher/TitlePresetsManager";
import { ClassRankingPanel, type RankingRow } from "@/components/teacher/ClassRankingPanel";
import type { AccountRole, ClassRow, LoginBlockRule, Period, Student, TitlePreset } from "@/types/database";

const ADMIN_TABS = ["기간 관리", "하트 정책", "로그인 차단", "순위 집계"] as const;
// 교사는 환경설정에 들어오면 자기 반 순위를 가장 먼저 본다.
const TEACHER_TABS = ["우리 반 순위", "학생 관리", "제목 관리"] as const;

export function SettingsTabs({
  accountRole,
  classRow,
  heartLimit,
  periods,
  loginBlockRules,
  rankings,
  students,
  titlePresets,
}: {
  accountRole: AccountRole;
  classRow: ClassRow;
  /** 전교 공통 하트 수. */
  heartLimit: number;
  periods: Period[];
  loginBlockRules: LoginBlockRule[];
  rankings: RankingRow[];
  students: Student[];
  titlePresets: TitlePreset[];
}) {
  const tabs = accountRole === "admin" ? ADMIN_TABS : TEACHER_TABS;
  const [tab, setTab] = useState<string>(tabs[0]);

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-zinc-100 p-1 text-sm">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-2 font-medium ${
              tab === t ? "bg-white shadow text-[#6C5CE7]" : "text-zinc-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {accountRole === "admin" && tab === "기간 관리" && (
        <PeriodManager periods={periods} />
      )}
      {accountRole === "admin" && tab === "하트 정책" && <HeartLimitForm heartLimit={heartLimit} />}
      {accountRole === "admin" && tab === "로그인 차단" && (
        <LoginBlockRulesForm rules={loginBlockRules} />
      )}
      {accountRole === "teacher" && tab === "학생 관리" && (
        <StudentManager classId={classRow.id} initialStudents={students} />
      )}
      {accountRole === "teacher" && tab === "제목 관리" && (
        <TitlePresetsManager classId={classRow.id} initialTitlePresets={titlePresets} />
      )}
      {(tab === "순위 집계" || tab === "우리 반 순위") && (
        <ClassRankingPanel
          classLabel={classRow.name}
          rankings={rankings}
          canAggregate={accountRole === "admin"}
        />
      )}
    </div>
  );
}
