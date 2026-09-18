-- 운영자가 정하는 설정(기간·로그인 차단)을 학급마다가 아니라 전교에 한 번에 적용한다.
--
-- 지금까지 기간과 로그인 차단 규칙은 class_id로 학급마다 따로 저장돼서, 운영자가 설정 화면에서
-- 고른 학급 하나에만 적용됐다. 투표와 하트는 이미 학급 구분 없이 이뤄지므로 일정도 하나로 맞춘다.
-- 학급마다 행을 복제하는 대신 class_id를 없앤다. 복제하면 학급끼리 단계가 어긋날 수 있고,
-- 나중에 가입한 교사의 학급은 빠진다. 전교 공통 한 행이면 새 학급도 자동으로 같은 일정을 따른다.
--
-- 0009(학급별 순위)가 먼저 적용되어 있어야 한다.

-- ---------------------------------------------------------------------------
-- 1. periods: 전교 공통
-- ---------------------------------------------------------------------------

-- 작품 업로드 정책이 periods.class_id를 참조하므로 먼저 걷어낸다.
drop policy if exists "student_insert_own_artwork" on artworks;

-- 학급마다 진행 중인 기간이 따로 있었다면 가장 최근 것 하나만 남기고 종료한다.
update periods set phase = 'closed'
where phase <> 'closed'
  and id <> (
    select id from periods where phase <> 'closed'
    order by start_date desc, created_at desc
    limit 1
  );

-- 학급 FK와 (class_id, …) 인덱스도 함께 사라진다.
alter table periods drop column class_id;

create index periods_phase_idx on periods (phase);

-- 진행 중인(게시·투표 단계) 기간은 전교에 하나뿐이다.
create unique index periods_single_open_idx on periods ((true)) where phase <> 'closed';

-- 게시 단계인 기간에만 올릴 수 있다. 학급 구분은 없다.
create policy "student_insert_own_artwork" on artworks for insert with check (
  (auth.jwt() ->> 'app_role') = 'student'
  and student_id = (auth.jwt() ->> 'student_id')::uuid
  and class_id = (auth.jwt() ->> 'class_id')::uuid
  and period_id in (select id from periods where phase = 'posting')
);

-- ---------------------------------------------------------------------------
-- 2. 순위 집계: 가장 최근에 끝난 기간 안에서 학급마다 순위를 매긴다
-- ---------------------------------------------------------------------------

create or replace function latest_closed_period_ids()
returns setof uuid
language sql stable
as $$
  select p.id
  from periods p
  where p.phase = 'closed'
  order by p.end_date desc, p.start_date desc, p.created_at desc
  limit 1
$$;

create or replace function aggregate_class_rankings(p_size int default 10)
returns table (result_class_id uuid, result_period_id uuid, ranked_count int)
language plpgsql
as $$
begin
  if not is_admin() then
    raise exception 'ADMIN_ONLY';
  end if;

  -- 끝난 기간은 하트가 더 늘지 않으므로, 다시 눌러도 같은 결과로 덮어써질 뿐이다.
  delete from award_records
  where period_id in (select latest_closed_period_ids());

  insert into award_records (class_id, period_id, student_id, artwork_id, heart_count, rank)
  select ranked.class_id, ranked.period_id, ranked.student_id, ranked.id, ranked.like_count, ranked.rk
  from (
    select a.id, a.class_id, a.period_id, a.student_id, a.like_count,
           -- 기간은 전교 공통이지만 순위는 학급 안에서 매긴다.
           rank() over (partition by a.period_id, a.class_id order by a.like_count desc) as rk
    from artworks a
    where a.period_id in (select latest_closed_period_ids())
      and a.like_count > 0
  ) ranked
  -- 동점은 같은 순위라, 10위에 동점자가 있으면 10명을 넘을 수 있다.
  where ranked.rk <= p_size;

  return query
  select ar.class_id, ar.period_id, count(*)::int
  from award_records ar
  where ar.period_id in (select latest_closed_period_ids())
  group by ar.class_id, ar.period_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. login_block_rules: 전교 공통
-- ---------------------------------------------------------------------------

-- 학급마다 따로 저장돼 있었다면 평일·주말마다 하나만 남긴다. 켜져 있는 규칙을 우선한다.
delete from login_block_rules
where id not in (
  select distinct on (day_type) id
  from login_block_rules
  order by day_type, enabled desc
);

-- (class_id, day_type) 유니크 제약도 함께 사라진다.
alter table login_block_rules drop column class_id;
alter table login_block_rules add constraint login_block_rules_day_type_key unique (day_type);
