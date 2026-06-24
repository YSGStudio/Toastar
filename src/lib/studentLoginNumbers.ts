import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 이름이 학급 내에서 겹치는 경우(이번 배치 내 중복 또는 기존 등록된 동명이인)에만
 * 구분번호를 순서대로 배정한다. 기존에 구분번호 없이 등록된 동명이인이 있으면
 * 먼저 그 레코드에 번호를 채워 넣어 로그인 시 항상 구분 가능하도록 보장한다.
 */
export async function resolveLoginNumbers(
  supabase: SupabaseClient,
  classId: string,
  names: string[],
): Promise<{ name: string; loginNo: number | null }[]> {
  const uniqueNames = Array.from(new Set(names));
  if (uniqueNames.length === 0) return [];

  const { data: existing } = await supabase
    .from("students")
    .select("id, name, login_no")
    .eq("class_id", classId)
    .in("name", uniqueNames);

  const byName = new Map<string, { id: string; login_no: number | null }[]>();
  (existing ?? []).forEach((row) => {
    const list = byName.get(row.name) ?? [];
    list.push({ id: row.id, login_no: row.login_no });
    byName.set(row.name, list);
  });

  for (const rows of byName.values()) {
    if (rows.length <= 1) continue;
    const numbered = rows.filter((r) => r.login_no !== null).map((r) => r.login_no as number);
    let next = numbered.length > 0 ? Math.max(...numbered) + 1 : 1;
    for (const row of rows.filter((r) => r.login_no === null)) {
      await supabase.from("students").update({ login_no: next }).eq("id", row.id);
      row.login_no = next;
      next += 1;
    }
  }

  const counters = new Map<string, number>();
  byName.forEach((rows, name) => {
    const numbered = rows.filter((r) => r.login_no !== null).map((r) => r.login_no as number);
    counters.set(name, numbered.length > 0 ? Math.max(...numbered) : 0);
  });

  const nameOccurrences = new Map<string, number>();
  names.forEach((n) => nameOccurrences.set(n, (nameOccurrences.get(n) ?? 0) + 1));

  return names.map((name) => {
    const alreadyExists = (byName.get(name)?.length ?? 0) > 0;
    const duplicateInBatch = (nameOccurrences.get(name) ?? 0) > 1;
    if (!alreadyExists && !duplicateInBatch) {
      return { name, loginNo: null };
    }
    const next = (counters.get(name) ?? 0) + 1;
    counters.set(name, next);
    return { name, loginNo: next };
  });
}
