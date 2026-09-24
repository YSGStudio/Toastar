-- 학급별 투표: 작품을 학급 탭으로 나눠 보고, 하트를 학급마다 N개씩 준다.
--
-- 지금까지는 열려 있는 투표 전체에 사람당 N개였다. 이제 같은 N개를 학급마다 따로 쓴다.
-- 설정값이 10개이고 작품이 올라온 학급이 5개면 한 사람이 최대 50개를 쓴다.

-- ---------------------------------------------------------------------------
-- 1. 사용량을 학급까지 나눠 센다
-- ---------------------------------------------------------------------------

alter table period_heart_usage add column class_id uuid references classes (id) on delete cascade;

-- 기존 행은 학급 구분 없이 합산돼 있어 나눌 수 없다. 좋아요 기록이 원본이므로 거기서 다시 만든다.
delete from period_heart_usage;

insert into period_heart_usage (student_id, teacher_id, period_id, class_id, used_count)
select l.student_id, l.teacher_id, a.period_id, a.class_id, count(*)
from artwork_likes l
join artworks a on a.id = l.artwork_id
group by l.student_id, l.teacher_id, a.period_id, a.class_id;

alter table period_heart_usage alter column class_id set not null;

drop index if exists period_heart_usage_student_idx;
drop index if exists period_heart_usage_teacher_idx;
create unique index period_heart_usage_student_idx
  on period_heart_usage (student_id, period_id, class_id) where student_id is not null;
create unique index period_heart_usage_teacher_idx
  on period_heart_usage (teacher_id, period_id, class_id) where teacher_id is not null;

-- ---------------------------------------------------------------------------
-- 2. 한도 검사: 학급마다 N개
-- ---------------------------------------------------------------------------

create or replace function check_and_increment_heart_usage()
returns trigger as $$
declare
  v_period_id uuid;
  v_class_id uuid;
  v_phase text;
  v_limit int;
  v_used int;
begin
  select a.period_id, a.class_id, p.phase into v_period_id, v_class_id, v_phase
  from artworks a
  join periods p on p.id = a.period_id
  where a.id = new.artwork_id;

  if v_phase is distinct from 'voting' then
    raise exception 'VOTING_NOT_OPEN';
  end if;

  select heart_limit into v_limit from vote_settings limit 1;

  insert into period_heart_usage (student_id, teacher_id, period_id, class_id, used_count)
  values (new.student_id, new.teacher_id, v_period_id, v_class_id, 0)
  on conflict do nothing;

  -- 같은 사람이 같은 학급에 연타해도 한도를 넘지 않도록 그 학급의 사용량 행을 먼저 잠근다.
  perform 1
  from period_heart_usage u
  where u.student_id is not distinct from new.student_id
    and u.teacher_id is not distinct from new.teacher_id
    and u.class_id = v_class_id
  for update;

  -- 종료된 기간의 사용량은 세지 않는다. 그래서 기간이 끝나면 다음 투표에 다시 N개를 쓴다.
  select coalesce(sum(u.used_count), 0) into v_used
  from period_heart_usage u
  join periods p on p.id = u.period_id
  where p.phase <> 'closed'
    and u.student_id is not distinct from new.student_id
    and u.teacher_id is not distinct from new.teacher_id
    and u.class_id = v_class_id;

  if v_used >= v_limit then
    raise exception 'HEART_LIMIT_EXCEEDED';
  end if;

  update period_heart_usage
  set used_count = used_count + 1
  where period_id = v_period_id
    and class_id = v_class_id
    and student_id is not distinct from new.student_id
    and teacher_id is not distinct from new.teacher_id;

  return new;
end;
$$ language plpgsql security definer;
