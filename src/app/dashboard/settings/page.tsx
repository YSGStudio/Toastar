import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchPeriods } from "@/lib/periods";
import { ClassSwitcher } from "@/components/teacher/ClassSwitcher";
import { SettingsTabs } from "@/components/teacher/SettingsTabs";
import type { RankingRow } from "@/components/teacher/ClassRankingPanel";
import type { ClassRow, LoginBlockRule } from "@/types/database";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") redirect("/login");

  const supabase = await createSupabaseServerClient();
  const isAdmin = user.accountRole === "admin";

  const classesQuery = supabase.from("classes").select("*").order("created_at", { ascending: true });
  const { data: classes } = isAdmin ? await classesQuery : await classesQuery.eq("teacher_id", user.id);

  if (!classes || classes.length === 0) {
    if (isAdmin) {
      return (
        <p className="py-20 text-center text-sm text-zinc-400">
          아직 생성된 학급이 없습니다. 교사가 먼저 학급을 생성해야 관리할 수 있어요.
        </p>
      );
    }
    redirect("/dashboard/classes/new");
  }

  const { classId } = await searchParams;
  const classRow = (classes.find((c) => c.id === classId) ?? classes[0]) as ClassRow;

  const [periods, { data: voteSettings }, { data: loginBlockRules }, { data: rankings }, { data: students }, { data: titlePresets }] =
    await Promise.all([
      // 기간과 로그인 차단은 전교 공통이라 고른 학급과 무관하게 같은 값을 보여 준다.
      fetchPeriods(),
      supabase.from("vote_settings").select("heart_limit").maybeSingle(),
      supabase.from("login_block_rules").select("*"),
      supabase
        .from("award_records")
        .select("id, period_id, rank, heart_count, awarded_at, artworks(title), students(name), periods(start_date, end_date)")
        .eq("class_id", classRow.id)
        .order("awarded_at", { ascending: false })
        .order("rank", { ascending: true }),
      supabase.from("students").select("*").eq("class_id", classRow.id).order("name", { ascending: true }),
      supabase.from("title_presets").select("*").eq("class_id", classRow.id).order("title", { ascending: true }),
    ]);

  return (
    <div className="space-y-4">
      <ClassSwitcher classes={classes as ClassRow[]} selectedId={classRow.id} />
      <SettingsTabs
        accountRole={user.accountRole}
        classRow={classRow}
        heartLimit={voteSettings?.heart_limit ?? 10}
        periods={periods}
        loginBlockRules={(loginBlockRules ?? []) as LoginBlockRule[]}
        // DB 타입을 생성해 두지 않아 Supabase가 조인을 배열로 추론한다. 순위 기록 → 작품·학생·기간은
        // 모두 다대일이라 실제 응답은 객체이므로 순위표 행 모양으로 맞춰 준다.
        rankings={(rankings ?? []) as unknown as RankingRow[]}
        students={students ?? []}
        titlePresets={titlePresets ?? []}
      />
    </div>
  );
}
