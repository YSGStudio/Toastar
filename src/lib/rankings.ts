import type { SupabaseClient } from "@supabase/supabase-js";

/** 학급마다 순위표에 올리는 인원. 동점은 같은 순위라 이보다 많아질 수 있다. */
export const RANKING_SIZE = 10;

export type RankingResult =
  | { ok: true; classCount: number; studentCount: number }
  | { ok: false; error: string; adminOnly?: boolean };

/**
 * 가장 최근에 끝난 기간을 학급별로 집계한다. 기간은 전교 공통이고, 그 안에서 학급마다
 * 하트 순으로 상위 10명을 뽑는다. 지우고 다시 채우는 과정은 DB 함수가 한 트랜잭션으로 처리한다.
 * 투표 종료와 '다시 집계' 버튼이 같은 규칙을 쓰도록 한곳에 둔다.
 */
export async function aggregateClassRankings(supabase: SupabaseClient): Promise<RankingResult> {
  const { data, error } = await supabase.rpc("aggregate_class_rankings", { p_size: RANKING_SIZE });

  if (error) {
    return error.message.includes("ADMIN_ONLY")
      ? { ok: false, error: "관리자만 순위를 집계할 수 있습니다.", adminOnly: true }
      : { ok: false, error: error.message };
  }

  const results = (data ?? []) as { ranked_count: number }[];
  if (results.length === 0) {
    return {
      ok: false,
      error: "선정할 작품이 없어요. 투표가 끝난 기간에 하트를 받은 작품이 있어야 해요.",
    };
  }

  return {
    ok: true,
    classCount: results.length,
    studentCount: results.reduce((sum, r) => sum + r.ranked_count, 0),
  };
}
