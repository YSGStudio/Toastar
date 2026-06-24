export type ArtworkType = "image" | "link" | "video" | "audio";
export type PeriodStatus = "active" | "closed";
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
  daily_heart_limit: number;
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
  description: string | null;
  like_count: number;
  created_at: string;
}

export interface ArtworkWithJoins extends Artwork {
  students: { name: string } | null;
  liked_by_me?: boolean;
  is_winner?: boolean;
}

export interface ArtworkLike {
  id: string;
  artwork_id: string;
  student_id: string;
  created_at: string;
}

export interface DailyHeartUsage {
  student_id: string;
  usage_date: string;
  used_count: number;
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
