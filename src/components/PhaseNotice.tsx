import type { PeriodPhase } from "@/types/database";

const PHASE_STYLES: Record<PeriodPhase, { label: string; tone: string }> = {
  posting: { label: "작품 올리는 기간", tone: "bg-violet-50 text-violet-700" },
  voting: { label: "투표 기간", tone: "bg-rose-50 text-rose-700" },
  // 종료된 기간은 '최신 자료'에 뜨지 않으므로 실제로는 표시되지 않는다.
  closed: { label: "종료된 기간", tone: "bg-zinc-100 text-zinc-500" },
};

/** "2026-08-28" → "8월 28일" */
function formatDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

/** 게시 단계는 학생만 올릴 수 있어 안내가 갈리고, 투표 단계는 학생·교사가 똑같이 투표한다. */
function hintFor(phase: PeriodPhase, viewerRole: "student" | "teacher", heartLimit: number) {
  if (phase === "posting") {
    return viewerRole === "student"
      ? "지금 작품을 올릴 수 있어요. 투표는 선생님이 시작하면 열려요."
      : "학생들이 작품을 올리는 중이에요. 투표는 아직 열리지 않았어요.";
  }
  if (phase === "voting") {
    return `하트 ${heartLimit}개를 마음에 드는 작품에 나눠 주세요. 학급 구분 없이 쓸 수 있어요.`;
  }
  return null;
}

/** 최신 자료 화면 상단에 지금이 어느 단계이고 기간이 언제까지인지 알려 준다. */
export function PhaseNotice({
  phase,
  startDate,
  endDate,
  viewerRole,
  classLabel,
  heartLimit,
}: {
  phase: PeriodPhase;
  startDate: string;
  endDate: string;
  viewerRole: "student" | "teacher";
  /** 여러 학급을 함께 보는 교사 화면에서만 붙인다. */
  classLabel?: string | null;
  /** 지금 열려 있는 투표 전체에 쓸 수 있는 하트 수(사람당 총량). */
  heartLimit: number;
}) {
  const { label, tone } = PHASE_STYLES[phase];
  const hint = hintFor(phase, viewerRole, heartLimit);

  return (
    <div className={`rounded-2xl px-4 py-3 ${tone}`}>
      <p className="text-sm font-semibold">
        {classLabel && <span>{classLabel} · </span>}
        {label} · {formatDate(startDate)} ~ {formatDate(endDate)}
      </p>
      {hint && <p className="mt-0.5 text-xs opacity-80">{hint}</p>}
    </div>
  );
}
