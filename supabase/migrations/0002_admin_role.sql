-- 계정 등급(관리자/교사) 도입
-- 관리자는 시스템에 단 1명만 존재할 수 있다(부분 유니크 인덱스로 강제).
-- 관리자: 기간 설정, 하트 정책(하트 수 + 수상 인원수), 로그인 차단 시간, 시상 집계
-- 교사: 학생 등록(개별/엑셀), 시상 기록 조회(읽기 전용)

alter table teachers
  add column role text not null default 'teacher' check (role in ('admin', 'teacher'));

create unique index teachers_single_admin_idx on teachers (role) where role = 'admin';

create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from teachers where id = auth.uid() and role = 'admin');
$$ language sql stable;

-- classes: 관리자는 모든 학급을 조회할 수 있고, 하트 한도·수상 인원수 등 정책 수정은 관리자만 가능하다.
drop policy if exists "teacher_select_own_classes" on classes;
create policy "select_own_or_admin_classes" on classes for select using (
  teacher_id = auth.uid()
  or id = (auth.jwt() ->> 'class_id')::uuid
  or is_admin()
);

drop policy if exists "teacher_update_own_classes" on classes;
create policy "admin_update_classes" on classes for update using (is_admin());

-- periods: 기간 설정은 관리자 전용.
drop policy if exists "teacher_insert_periods" on periods;
create policy "admin_insert_periods" on periods for insert with check (is_admin());

drop policy if exists "teacher_update_periods" on periods;
create policy "admin_update_periods" on periods for update using (is_admin());

-- login_block_rules: 로그인 차단 설정은 관리자 전용.
drop policy if exists "teacher_select_block_rules" on login_block_rules;
create policy "admin_select_block_rules" on login_block_rules for select using (is_admin());

drop policy if exists "teacher_upsert_block_rules" on login_block_rules;
create policy "admin_insert_block_rules" on login_block_rules for insert with check (is_admin());

drop policy if exists "teacher_update_block_rules" on login_block_rules;
create policy "admin_update_block_rules" on login_block_rules for update using (is_admin());

-- award_records: 시상 집계(생성/재집계)는 관리자 전용. 조회는 기존처럼 모든 인증 사용자에게 열려 있다(조회만 가능한 교사 포함).
-- 기존에는 delete 정책이 전혀 없어 재집계 시 이전 기록 삭제가 RLS에 의해 조용히 무시되는 문제가 있었다.
drop policy if exists "teacher_insert_awards" on award_records;
create policy "admin_insert_awards" on award_records for insert with check (is_admin());
create policy "admin_delete_awards" on award_records for delete using (is_admin());

-- students: 학생 등록/관리는 학급 담임 교사 또는 관리자.
drop policy if exists "teacher_insert_students" on students;
create policy "teacher_or_admin_insert_students" on students for insert with check (
  class_id in (select id from classes where teacher_id = auth.uid()) or is_admin()
);

drop policy if exists "teacher_update_students" on students;
create policy "teacher_or_admin_update_students" on students for update using (
  class_id in (select id from classes where teacher_id = auth.uid()) or is_admin()
);

drop policy if exists "teacher_delete_students" on students;
create policy "teacher_or_admin_delete_students" on students for delete using (
  class_id in (select id from classes where teacher_id = auth.uid()) or is_admin()
);
