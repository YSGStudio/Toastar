import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Period, PeriodStatus } from "@/types/database";

export async function fetchPeriods(opts: { classId?: string | null; status?: PeriodStatus }) {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("periods").select("*").order("start_date", { ascending: false });
  if (opts.classId) query = query.eq("class_id", opts.classId);
  if (opts.status) query = query.eq("status", opts.status);
  const { data } = await query;
  return (data ?? []) as Period[];
}
