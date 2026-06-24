import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchPeriods } from "@/lib/periods";
import { ClassSwitcher } from "@/components/teacher/ClassSwitcher";
import { SettingsTabs } from "@/components/teacher/SettingsTabs";
import type { ClassRow, LoginBlockRule } from "@/types/database";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: true });

  if (!classes || classes.length === 0) redirect("/dashboard/classes/new");

  const { classId } = await searchParams;
  const classRow = (classes.find((c) => c.id === classId) ?? classes[0]) as ClassRow;

  const [periods, { data: loginBlockRules }, { data: awards }] = await Promise.all([
    fetchPeriods({ classId: classRow.id }),
    supabase.from("login_block_rules").select("*").eq("class_id", classRow.id),
    supabase
      .from("award_records")
      .select("*, artworks(title), students(name), periods(start_date, end_date)")
      .eq("class_id", classRow.id)
      .order("awarded_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-4">
      <ClassSwitcher classes={classes as ClassRow[]} selectedId={classRow.id} />
      <SettingsTabs
        classRow={classRow}
        periods={periods}
        loginBlockRules={(loginBlockRules ?? []) as LoginBlockRule[]}
        awards={awards ?? []}
      />
    </div>
  );
}
