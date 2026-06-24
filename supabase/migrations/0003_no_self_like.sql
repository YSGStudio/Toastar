-- 자신의 작품에는 좋아요(하트)를 줄 수 없도록 RLS에서도 강제한다(애플리케이션 검증과 이중 방어).
drop policy if exists "student_insert_like" on artwork_likes;
create policy "student_insert_like" on artwork_likes for insert with check (
  (auth.jwt() ->> 'app_role') = 'student'
  and student_id = (auth.jwt() ->> 'student_id')::uuid
  and not exists (
    select 1 from artworks a
    where a.id = artwork_likes.artwork_id
      and a.student_id = (auth.jwt() ->> 'student_id')::uuid
  )
);
