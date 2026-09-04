-- 하트 예산을 "학급(기간)마다 10개"에서 "사람마다 총 10개"로 바꾸고, 교사도 투표할 수 있게 한다.
--
-- 0007까지는 사용량을 (학생, 작품의 기간)으로 기록했다. 기간은 학급마다 따로 있으므로
-- 학생이 자기 학급에 10개를 다 쓰고도 다른 학급 기간의 작품에 10개를 또 쓸 수 있었다.
-- 이제는 "지금 열려 있는 투표 전체"를 합쳐서 한도를 검사한다. 학급 구분은 없다.
--
-- 한도가 전교 공통이 되었으므로 설정도 classes에서 떼어내 한 곳(vote_settings)에 둔다.

-- ---------------------------------------------------------------------------
-- 1. 전교 공통 하트 설정
-- ---------------------------------------------------------------------------

-- 행이 하나뿐인 설정 테이블(id는 true만 허용해 두 번째 행이 생기지 않게 한다).
create table vote_settings (
  id boolean primary key default true check (id),
  heart_limit int not null default 10
);

insert into vote_settings (id, heart_limit) values (true, 10);

-- 학급별로 다르게 설정해 두었을 수 있으므로 가장 큰 값을 공통값으로 옮긴다.
update vote_settings
set heart_limit = coalesce((select max(period_heart_limit) from classes), 10);

alter table vote_settings enable row level security;

create policy "authenticated_select_vote_settings" on vote_settings for select using (
  auth.role() = 'authenticated'
);
create policy "admin_update_vote_settings" on vote_settings for update using (is_admin());

alter table classes drop column period_heart_limit;

-- ---------------------------------------------------------------------------
-- 2. artwork_likes: 교사도 투표한다
-- ---------------------------------------------------------------------------

alter table artwork_likes alter column student_id drop not null;
alter table artwork_likes add column teacher_id uuid references teachers (id) on delete cascade;

-- 학생이거나 교사이거나, 둘 중 정확히 하나여야 한다.
alter table artwork_likes add constraint artwork_likes_one_voter
  check ((student_id is not null) <> (teacher_id is not null));

-- 작품당 1회는 교사에게도 똑같이 적용된다(학생 쪽은 기존 unique 제약이 담당).
create unique index artwork_likes_artwork_teacher_idx
  on artwork_likes (artwork_id, teacher_id) where teacher_id is not null;

-- ---------------------------------------------------------------------------
-- 3. period_heart_usage: 교사 사용량도 담는다
-- ---------------------------------------------------------------------------

alter table period_heart_usage drop constraint period_heart_usage_pkey;
alter table period_heart_usage alter column student_id drop not null;
alter table period_heart_usage add column teacher_id uuid references teachers (id) on delete cascade;
alter table period_heart_usage add column id uuid not null default gen_random_uuid();

alter table period_heart_usage add primary key (id);
alter table period_heart_usage add constraint period_heart_usage_one_voter
  check ((student_id is not null) <> (teacher_id is not null));

create unique index period_heart_usage_student_idx
  on period_heart_usage (student_id, period_id) where student_id is not null;
create unique index period_heart_usage_teacher_idx
  on period_heart_usage (teacher_id, period_id) where teacher_id is not null;

drop policy if exists "select_own_period_heart_usage" on period_heart_usage;
create policy "select_own_period_heart_usage" on period_heart_usage for select using (
  student_id = (auth.jwt() ->> 'student_id')::uuid
  or teacher_id = auth.uid()
);

-- ---------------------------------------------------------------------------
-- 4. 한도 검사: 열려 있는 기간을 모두 합쳐서 1인 N개
-- ---------------------------------------------------------------------------

create or replace function check_and_increment_heart_usage()
returns trigger as $$
declare
  v_period_id uuid;
  v_phase text;
  v_limit int;
  v_used int;
begin
  select a.period_id, p.phase into v_period_id, v_phase
  from artworks a
  join periods p on p.id = a.period_id
  where a.id = new.artwork_id;

  if v_phase is distinct from 'voting' then
    raise exception 'VOTING_NOT_OPEN';
  end if;

  select heart_limit into v_limit from vote_settings limit 1;

  insert into period_heart_usage (student_id, teacher_id, period_id, used_count)
  values (new.student_id, new.teacher_id, v_period_id, 0)
  on conflict do nothing;

  -- 같은 사람이 연타해도 한도를 넘지 않도록 이 사람의 사용량 행을 먼저 잠근다.
  perform 1
  from period_heart_usage u
  where u.student_id is not distinct from new.student_id
    and u.teacher_id is not distinct from new.teacher_id
  for update;

  -- 종료된 기간의 사용량은 세지 않는다. 그래서 기간이 끝나면 다음 투표에 다시 N개를 쓴다.
  select coalesce(sum(u.used_count), 0) into v_used
  from period_heart_usage u
  join periods p on p.id = u.period_id
  where p.phase <> 'closed'
    and u.student_id is not distinct from new.student_id
    and u.teacher_id is not distinct from new.teacher_id;

  if v_used >= v_limit then
    raise exception 'HEART_LIMIT_EXCEEDED';
  end if;

  update period_heart_usage
  set used_count = used_count + 1
  where period_id = v_period_id
    and student_id is not distinct from new.student_id
    and teacher_id is not distinct from new.teacher_id;

  return new;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- 5. RLS: 학생·교사 모두 투표 단계에서만
-- ---------------------------------------------------------------------------

drop policy if exists "student_insert_like" on artwork_likes;
create policy "student_insert_like" on artwork_likes for insert with check (
  (auth.jwt() ->> 'app_role') = 'student'
  and student_id = (auth.jwt() ->> 'student_id')::uuid
  and teacher_id is null
  and exists (
    select 1 from artworks a
    join periods p on p.id = a.period_id
    where a.id = artwork_likes.artwork_id
      and p.phase = 'voting'
      and a.student_id <> (auth.jwt() ->> 'student_id')::uuid
  )
);

-- 교사·관리자는 학급 구분 없이 전체 작품에 투표한다(작품 목록도 이미 전교 공개다).
create policy "teacher_insert_like" on artwork_likes for insert with check (
  teacher_id = auth.uid()
  and student_id is null
  and exists (select 1 from teachers t where t.id = auth.uid())
  and exists (
    select 1 from artworks a
    join periods p on p.id = a.period_id
    where a.id = artwork_likes.artwork_id and p.phase = 'voting'
  )
);

-- 내가 어떤 작품에 하트를 줬는지 화면에 표시하려면 교사도 자기 하트를 읽을 수 있어야 한다.
drop policy if exists "select_own_or_teacher_likes" on artwork_likes;
create policy "select_own_or_teacher_likes" on artwork_likes for select using (
  student_id = (auth.jwt() ->> 'student_id')::uuid
  or teacher_id = auth.uid()
  or exists (
    select 1 from artworks a
    join classes c on c.id = a.class_id
    where a.id = artwork_likes.artwork_id and c.teacher_id = auth.uid()
  )
);
