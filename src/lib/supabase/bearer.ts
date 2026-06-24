import { createClient } from "@supabase/supabase-js";

/**
 * 학생 커스텀 JWT(Authorization 헤더)를 사용하는 Supabase 클라이언트.
 * anon key + Bearer 토큰 조합으로 요청하면 PostgREST가 토큰의 클레임을 기준으로
 * RLS 정책(auth.uid(), auth.jwt())을 적용한다. 서비스 롤을 쓰지 않으므로 RLS가 그대로 강제된다.
 */
export function createSupabaseBearerClient(jwt: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
