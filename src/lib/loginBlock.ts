import type { DayType } from "@/types/database";

export function resolveDayType(date: Date, timeZone: string): DayType {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return weekday === "Sat" || weekday === "Sun" ? "weekend" : "weekday";
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function currentMinutesOfDay(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

interface BlockRuleLike {
  enabled: boolean;
  start_time: string; // "HH:MM" or "HH:MM:SS"
  end_time: string;
}

/** 평일/주말 구분 규칙과 현재 시각을 비교해 로그인 차단 여부를 판단한다. 자정을 넘는 구간도 지원. */
export function isWithinBlockWindow(
  rule: BlockRuleLike | null | undefined,
  now: Date,
  timeZone: string,
): boolean {
  if (!rule || !rule.enabled) return false;
  const start = toMinutes(rule.start_time);
  const end = toMinutes(rule.end_time);
  if (start === end) return false;
  const current = currentMinutesOfDay(now, timeZone);
  if (start < end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}
