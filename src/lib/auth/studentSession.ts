import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { StudentSessionClaims } from "@/types/database";

export const STUDENT_COOKIE_NAME = "student_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12시간

function getSecretKey() {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET 환경변수가 설정되어 있지 않습니다.");
  }
  return new TextEncoder().encode(secret);
}

/**
 * 학생용 Supabase 호환 JWT를 발급한다. PostgREST/RLS가 인식하는 표준 클레임(sub, role, aud)에
 * 더해 student_id/class_id/name 커스텀 클레임을 최상위에 둔다(auth.jwt() ->> 'student_id').
 */
export async function mintStudentJwt(claims: {
  studentId: string;
  classId: string;
  name: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    role: "authenticated",
    student_id: claims.studentId,
    class_id: claims.classId,
    name: claims.name,
    app_role: "student",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.studentId)
    .setAudience("authenticated")
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_DURATION_SECONDS)
    .sign(getSecretKey());
}

export async function setStudentSessionCookie(jwt: string) {
  const cookieStore = await cookies();
  cookieStore.set(STUDENT_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearStudentSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_COOKIE_NAME);
}

export async function getStudentSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(STUDENT_COOKIE_NAME)?.value ?? null;
}

export async function verifyStudentJwt(
  token: string,
): Promise<StudentSessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      audience: "authenticated",
    });
    if (payload.app_role !== "student") return null;
    return {
      role: "student",
      student_id: String(payload.student_id),
      class_id: String(payload.class_id),
      name: String(payload.name),
    };
  } catch {
    return null;
  }
}

export async function getStudentSession(): Promise<StudentSessionClaims | null> {
  const token = await getStudentSessionToken();
  if (!token) return null;
  return verifyStudentJwt(token);
}
