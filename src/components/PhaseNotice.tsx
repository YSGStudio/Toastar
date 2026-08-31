import type { PeriodPhase } from "@/types/database";

const MESSAGES: Record<PeriodPhase, { tone: string; text: (heartLimit: number) => string }> = {
  posting: {
    tone: "bg-violet-50 text-violet-700",
    text: () => "작품을 올리는 기간이에요. 투표는 선생님이 시작하면 열려요.",
  },
  voting: {
    tone: "bg-rose-50 text-rose-700",
    text: (heartLimit) =>
      `투표 기간이에요. 이번 기간에 쓸 수 있는 하트 ${heartLimit}개를 마음에 드는 작품에 나눠 주세요.`,
  },
  // 종료된 기간은 '최신 자료'에 뜨지 않으므로 실제로는 표시되지 않는다.
  closed: { tone: "bg-zinc-100 text-zinc-500", text: () => "기간이 끝났어요." },
};

/** 학생 화면 상단에 지금이 게시 기간인지 투표 기간인지 알려 준다. */
export function PhaseNotice({ phase, heartLimit }: { phase: PeriodPhase; heartLimit: number }) {
  const { tone, text } = MESSAGES[phase];
  return (
    <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${tone}`}>{text(heartLimit)}</p>
  );
}
