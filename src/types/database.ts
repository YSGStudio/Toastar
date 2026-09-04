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
  award_top_n: number;
  created_at: string;
}

export interface Student {
  id: string;
  class_id: string;
  name: string;
  login_no: number | null;
  created_at: string;
}

export interface Period {
  id: string;
  class_id: string;
  start_date: string;
  end_date: string;
  phase: PeriodPhase;
  /** phase에서 파생되는 값(closed면 closed, 그 외 active). DB의 생성 열이라 직접 쓰지 않는다. */
  status: PeriodStatus;
  created_at: string;
}

/** 진행 중인 기간 목록에 학급 이름을 붙인 형태(최신 자료 화면의 기간 안내에 쓴다). */
export interface PeriodWithClassName extends Period {
  class_name: string | null;
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
  awarded_at: string;
}

export interface LoginBlockRule {
  id: string;
  class_id: string;
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
