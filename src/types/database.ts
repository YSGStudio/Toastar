export type ArtworkType = "image" | "link" | "video" | "audio" | "pdf";
export type PeriodStatus = "active" | "closed";
/** 게시 절차 단계: 게시(posting) → 투표(voting) → 종료(closed). */
export type PeriodPhase = "posting" | "voting" | "closed";
export type DayType = "weekday" | "weekend";
export type AccountRole = "admin" | "teacher";

export interface Teacher {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  created_at: string;
}

export interface ClassRow {
  id: string;
  teacher_id: string;
  name: string;
  class_code: string;
  created_at: string;
}

export interface Student {
  id: string;
  class_id: string;
  name: string;
  login_no: number | null;
  created_at: string;
}

/** 기간은 전교 공통이다(학급마다 따로 두지 않는다). */
export interface Period {
  id: string;
  start_date: string;
  end_date: string;
  phase: PeriodPhase;
  /** phase에서 파생되는 값(closed면 closed, 그 외 active). DB의 생성 열이라 직접 쓰지 않는다. */
  status: PeriodStatus;
  created_at: string;
}

export interface Artwork {
  id: string;
  class_id: string;
  period_id: string;
  student_id: string;
  type: ArtworkType;
  file_path: string;
  thumbnail_path: string | null;
  title: string;
  ai_help_description: string | null;
  self_description: string | null;
  like_count: number;
  created_at: string;
}

export interface TitlePreset {
  id: string;
  class_id: string;
  title: string;
  created_at: string;
}

export interface ArtworkWithJoins extends Artwork {
  students: { name: string } | null;
  liked_by_me?: boolean;
  is_winner?: boolean;
}

/** 투표자는 학생이거나 교사이거나, 둘 중 정확히 하나다(DB의 check 제약으로 강제). */
export interface ArtworkLike {
  id: string;
  artwork_id: string;
  student_id: string | null;
  teacher_id: string | null;
  created_at: string;
}

export interface PeriodHeartUsage {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  period_id: string;
  used_count: number;
}

/** 전교 공통 투표 설정. 행이 하나뿐이다. */
export interface VoteSettings {
  id: boolean;
  heart_limit: number;
}

export interface AwardRecord {
  id: string;
  class_id: string;
  period_id: string;
  student_id: string;
  artwork_id: string;
  heart_count: number;
  /** 학급(기간) 안에서의 하트 순위. 동점은 같은 순위다. */
  rank: number;
  awarded_at: string;
}

/** 로그인 차단 규칙은 전교 공통이다. 평일·주말마다 하나씩이다. */
export interface LoginBlockRule {
  id: string;
  day_type: DayType;
  enabled: boolean;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
}

export interface StudentSessionClaims {
  role: "student";
  student_id: string;
  class_id: string;
  name: string;
}
