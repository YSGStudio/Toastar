-- 게시 절차를 단계(phase)로 나누고, 하트 예산을 "매일 N개"에서 "기간당 N개"로 바꾼다.
--
--   운영자 날짜 설정(posting) → 학생 게시(투표 불가) → 운영자 '투표 시작'(voting)
--   → 학생 투표 → 운영자 '투표 종료'(closed) → 시상 집계
--
-- periods.status는 phase에서 파생되는 생성 열로 바꾼다. 최신/지난 자료 조회와 시상 집계는
-- 기존처럼 status를 읽으면 되고, 쓰기는 phase 한 곳에서만 일어나 두 값이 어긋날 수 없다.

-- ---------------------------------------------------------------------------
-- 1. periods: 단계(phase) 도입
-- ---------------------------------------------------------------------------

alter table periods add column phase text not null default 'posting'
  check (phase in ('posting', 'voting', 'closed'));

-- 이미 종료된 기간은 그대로 closed, 진행 중이던 기간은 게시 단계에서 다시 시작한다.
-- (운영자가 '투표 시작'을 눌러 투표 단계로 넘긴다)
update periods set phase = case when status = 'closed' then 'closed' else 'posting' end;

-- status를 참조하는 정책·인덱스를 먼저 걷어내야 열을 바꿀 수 있다.
drop policy if exists "student_insert_own_artwork" on artworks;
drop index if exists periods_class_status_idx;

alter table periods drop column status;
alter table periods add column status text
  generated always as ((case when phase = 'closed' then 'closed' else 'active' end)::text) stored;

create index periods_class_status_idx on periods (class_id, status);
create index periods_class_phase_idx on periods (class_id, phase);

-- 단계는 게시 → 투표 → 종료 방향으로만 넘어간다. 종료된 기간을 되살려
-- 이미 집계가 끝난 결과가 바뀌는 일을 DB에서도 막는다.
create or replace function enforce_period_phase_order()
returns trigger as $$
declare
  v_order text[] := array['posting', 'voting', 'closed'];
begin
  if array_position(v_order, new.phase) < array_position(v_order, old.phase) then
    raise exception 'PERIOD_PHASE_CANNOT_REVERT';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_period_phase_order
before update of phase on periods
for each row when (new.phase is distinct from old.phase)
execute function enforce_period_phase_order();

-- ---------------------------------------------------------------------------
-- 2. classes: 일일 하트 한도 → 기간당 하트 수(기본 10개)
-- ---------------------------------------------------------------------------

alter table classes rename column daily_heart_limit to period_heart_limit;
alter table classes alter column period_heart_limit set default 10;

-- 기존 기본값(하루 3개)을 그대로 쓰던 학급은 새 기본값(기간당 10개)으로 옮긴다.
-- 운영자가 직접 다른 값으로 바꿔 둔 학급은 그 값을 유지한다.
update classes set period_heart_limit = 10 where period_heart_limit = 3;

-- ---------------------------------------------------------------------------
-- 3. 하트 사용량: 날짜별 → 기간별
-- ---------------------------------------------------------------------------

create table period_heart_usage (
  student_id uuid not null references students (id) on delete cascade,
  period_id uuid not null references periods (id) on delete cascade,
  used_count int not null default 0,
  primary key (student_id, period_id)
);

alter table period_heart_usage enable row level security;

-- 본인 사용량만 조회. 쓰기는 트리거(security definer)로만 일어난다.
create policy "select_own_period_heart_usage" on period_heart_usage for select using (
  student_id = (auth.jwt() ->> 'student_id')::uuid
);

-- 하트는 취소할 수 없으므로 지금까지 준 좋아요 수가 곧 기간별 사용량이다.
insert into period_heart_usage (student_id, period_id, used_count)
select l.student_id, a.period_id, count(*)
from artwork_likes l
join artworks a on a.id = l.artwork_id
group by l.student_id, a.period_id;

-- 투표 단계에서만, 기간당 한도 안에서만 하트를 줄 수 있다.
drop trigger if exists trg_check_heart_usage on artwork_likes;

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

  select c.period_heart_limit into v_limit
  from students s
  join classes c on c.id = s.class_id
  where s.id = new.student_id;

  insert into period_heart_usage (student_id, period_id, used_count)
  values (new.student_id, v_period_id, 0)
  on conflict (student_id, period_id) do nothing;

  select used_count into v_used
  from period_heart_usage
  where student_id = new.student_id and period_id = v_period_id
  for update;

  if v_used >= v_limit then
    raise exception 'HEART_LIMIT_EXCEEDED';
  end if;

  update period_heart_usage
  set used_count = used_count + 1
  where student_id = new.student_id and period_id = v_period_id;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_check_heart_usage
before insert on artwork_likes
for each row execute function check_and_increment_heart_usage();

drop table daily_heart_usage;

-- ---------------------------------------------------------------------------
-- 4. RLS: 단계별 허용 동작
-- ---------------------------------------------------------------------------

-- 작품 업로드는 '게시' 단계에서만 가능하다.
create policy "student_insert_own_artwork" on artworks for insert with check (
  (auth.jwt() ->> 'app_role') = 'student'
  and student_id = (auth.jwt() ->> 'student_id')::uuid
  and class_id = (auth.jwt() ->> 'class_id')::uuid
  and period_id in (select id from periods where phase = 'posting' and class_id = artworks.class_id)
);

-- 하트는 '투표' 단계에서만, 남의 작품에만 줄 수 있다.
drop policy if exists "student_insert_like" on artwork_likes;
create policy "student_insert_like" on artwork_likes for insert with check (
  (auth.jwt() ->> 'app_role') = 'student'
  and student_id = (auth.jwt() ->> 'student_id')::uuid
  and exists (
    select 1 from artworks a
    join periods p on p.id = a.period_id
    where a.id = artwork_likes.artwork_id
      and p.phase = 'voting'
      and a.student_id <> (auth.jwt() ->> 'student_id')::uuid
  )
);
