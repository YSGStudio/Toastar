import { createClient } from "@supabase/supabase-js";

/**
 * 서비스 롤 클라이언트. RLS를 모두 통과(bypass)하므로 서버 전용 코드에서만 사용한다.
 * 용도:
 * - 학생 로그인 시 (학급코드+이름) 사전 인증 조회, 로그인 차단 규칙 조회 등 토큰 발급 전 조회
 * - 학급 탭에 쓸 학급 이름 조회(lib/classNames). classes에는 학생 로그인에 쓰는 학급코드가
 *   함께 있어 RLS로 열 수 없으므로, 서버가 이름만 골라 내보낸다.
 *
 * 어느 경우든 내보낼 값을 서버가 직접 골라야 한다. 조회 결과를 그대로 응답에 싣지 않는다.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
