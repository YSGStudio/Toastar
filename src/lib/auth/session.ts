import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseBearerClient } from "@/lib/supabase/bearer";
import {
  getStudentSession,
  getStudentSessionToken,
} from "@/lib/auth/studentSession";
import type { AccountRole } from "@/types/database";

export type CurrentUser =
  | { role: "teacher"; accountRole: AccountRole; id: string; email: string; name: string }
  | { role: "student"; studentId: string; classId: string; name: string };

/**
 * 현재 요청의 로그인 주체를 판별한다. 교사(Supabase Auth)를 우선 확인하고, 없으면 학생 쿠키를 본다.
 * React cache()로 감싸 레이아웃과 페이지가 각자 호출해도 같은 요청 안에서는 한 번만 실행된다
 * (교사 계정은 매번 Supabase Auth로 실제 네트워크 호출이 나가므로 중복 호출 비용이 크다).
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id, email, name, role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (teacher) {
      return {
        role: "teacher",
        accountRole: teacher.role,
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
      };
    }
  }

  const student = await getStudentSession();
  if (student) {
    return {
      role: "student",
      studentId: student.student_id,
      classId: student.class_id,
      name: student.name,
    };
  }

  return null;
});

/**
 * 현재 사용자의 권한으로 RLS가 적용되는 Supabase 클라이언트를 반환한다.
 * 교사는 쿠키 기반 세션 클라이언트, 학생은 커스텀 JWT를 Authorization 헤더로 사용하는 클라이언트.
 */
export async function getScopedSupabaseClient(user: CurrentUser) {
  if (user.role === "teacher") {
    return createSupabaseServerClient();
  }
  const token = await getStudentSessionToken();
  if (!token) throw new Error("학생 세션 토큰을 찾을 수 없습니다.");
  return createSupabaseBearerClient(token);
}
