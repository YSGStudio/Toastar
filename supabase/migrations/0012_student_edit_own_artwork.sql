-- 학생이 게시 단계 동안 자기 작품을 고치거나 지울 수 있게 한다.
--
-- 투표가 시작되면 잠근다. 하트는 취소할 수 없어서, 투표 중에 작품이 지워지면 거기 준 하트가
-- 사람들 잔량에서 빠진 채로 사라진다. 내용을 바꾸면 이미 하트를 준 사람은 다른 작품에
-- 투표한 셈이 된다. 게시 단계에는 아직 하트가 없으므로 이런 문제가 없다.

-- ---------------------------------------------------------------------------
-- 1. 고칠 수 있는 열은 제목과 설명뿐
-- ---------------------------------------------------------------------------

-- RLS는 행 단위라 어떤 열을 바꾸는지는 막지 못한다. 정책만 열면 학생이 파일 경로나
-- 하트 수까지 바꿀 수 있으므로 열 권한으로 막는다. 하트 수를 올리는 트리거는
-- security definer(소유자 권한)로 돌아서 이 제한에 걸리지 않는다.
revoke update on artworks from anon, authenticated;
grant update (title, ai_help_description, self_description) on artworks to authenticated;

-- ---------------------------------------------------------------------------
-- 2. 본인 작품, 게시 단계일 때만
-- ---------------------------------------------------------------------------

create policy "student_update_own_artwork" on artworks for update
using (
  (auth.jwt() ->> 'app_role') = 'student'
  and student_id = (auth.jwt() ->> 'student_id')::uuid
  and period_id in (select id from periods where phase = 'posting')
)
with check (
  (auth.jwt() ->> 'app_role') = 'student'
  and student_id = (auth.jwt() ->> 'student_id')::uuid
  and period_id in (select id from periods where phase = 'posting')
);

create policy "student_delete_own_artwork" on artworks for delete using (
  (auth.jwt() ->> 'app_role') = 'student'
  and student_id = (auth.jwt() ->> 'student_id')::uuid
  and period_id in (select id from periods where phase = 'posting')
);

-- ---------------------------------------------------------------------------
-- 3. 작품을 지울 때 자기 파일도 지운다
-- ---------------------------------------------------------------------------

-- 파일 경로 규칙: {class_id}/{student_id}/{artwork_id}/(original|thumbnail).ext
-- 학생은 Supabase에 직접 접근하지 못하고(세션 토큰이 httpOnly 쿠키다), 서버는 작품 행을
-- 지운 뒤에만 파일을 지우므로 단계 확인은 행 삭제 정책이 맡는다.
create policy "student_delete_own_artwork_files" on storage.objects for delete using (
  bucket_id = 'artworks'
  and (auth.jwt() ->> 'app_role') = 'student'
  and (storage.foldername(name))[1] = (auth.jwt() ->> 'class_id')
  and (storage.foldername(name))[2] = (auth.jwt() ->> 'student_id')
);
