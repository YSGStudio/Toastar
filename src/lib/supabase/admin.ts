import { createClient } from "@supabase/supabase-js";

/**
 * 서비스 롤 클라이언트. RLS를 모두 통과(bypass)하므로 서버 전용 코드에서만 사용한다.
 * 용도: 학생 로그인 시 (학급코드+이름) 사전 인증 조회, 로그인 차단 규칙 조회 등
 * 토큰 발급 전 — 아직 인증되지 않은 요청에서만 사용한다.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
