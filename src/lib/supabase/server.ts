import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 교사(Supabase Auth) 세션 기준 서버 클라이언트. 쿠키를 읽고, 가능하면 갱신한다.
 * React cache()로 감싸 같은 요청(렌더 패스) 안에서는 레이아웃·페이지가 각자 호출해도
 * 클라이언트 인스턴스를 재사용한다.
 */
export const createSupabaseServerClient = cache(async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component에서 호출된 경우 — 미들웨어가 세션을 갱신하므로 무시한다.
        }
      },
    },
  });
});
