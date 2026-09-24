import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 학급 탭에 쓸 학급 이름(교사가 학급을 만들 때 등록한 이름)을 가져온다.
 *
 * classes에는 학급코드가 함께 들어 있다. 그 코드는 학생 로그인에 쓰는 값이라, 다른 학급 이름을
 * 보여 주겠다고 RLS로 classes를 통째로 열면 다른 학급 학생으로 로그인할 수 있게 된다.
 * 그래서 서버가 서비스 롤로 읽되 이름만 골라 내보낸다. 학급코드나 담임 정보는 나가지 않는다.
 */
export async function fetchClassNames(classIds: string[]): Promise<Map<string, string>> {
  if (classIds.length === 0) return new Map();

  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("classes").select("id, name").in("id", classIds);

  return new Map((data ?? []).map((c) => [c.id as string, c.name as string]));
}
