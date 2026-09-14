-- 투표가 끝난 뒤 운영자가 한 번 집계하면, 학급마다 하트 순으로 상위 10명의 순위를 만든다.
--
-- 투표는 학급 구분 없이 이뤄지지만 순위는 학급별로 매긴다. 기간은 학급마다 따로 있으므로
-- "학급마다 가장 최근에 끝난 기간"을 골라 그 기간 작품의 순위를 매긴다.
-- 순위 인원이 전교 공통 10명이 되었으므로 학급별 설정(classes.award_top_n)은 걷어낸다.
--
-- 투표 종료 전 작성자·하트 수 가림은 DB가 아니라 서버가 응답에서 값을 지워 처리한다.
-- 학생은 Supabase에 직접 접근하지 못하고(세션 토큰이 httpOnly 쿠키다) 서버 라우트만 거치기 때문이다.

-- ---------------------------------------------------------------------------
-- 1. award_records: 순위
-- ---------------------------------------------------------------------------

alter table award_records add column rank int;

-- 기존 기록도 같은 규칙(하트 많은 순, 동점은 같은 순위)으로 순위를 매겨 둔다.
update award_records ar
set rank = ranked.rk
from (
  select id, rank() over (partition by period_id order by heart_count desc) as rk
  from award_records
) ranked
where ar.id = ranked.id;

alter table award_records alter column rank set not null;

-- 같은 기간에 같은 작품이 두 번 오르지 않게 한다.
create unique index award_records_period_artwork_idx on award_records (period_id, artwork_id);
create index award_records_class_period_rank_idx on award_records (class_id, period_id, rank);

-- ---------------------------------------------------------------------------
-- 2. 학급별 수상 인원 설정 제거
-- ---------------------------------------------------------------------------

alter table classes drop column award_top_n;

-- ---------------------------------------------------------------------------
-- 3. 집계
-- ---------------------------------------------------------------------------

-- 학급마다 가장 최근에 끝난 기간.
create or replace function latest_closed_period_ids()
returns setof uuid
language sql stable
as $$
  select distinct on (p.class_id) p.id
  from periods p
  where p.phase = 'closed'
  order by p.class_id, p.end_date desc, p.start_date desc
$$;

-- 호출한 사람의 권한(RLS)으로 실행된다. 기록 삭제·추가 정책이 이미 관리자 전용이고,
-- 함수 첫머리에서도 한 번 더 막는다. 함수 전체가 한 트랜잭션이라 지우고 채우는 도중에
-- 실패해도 기존 순위가 반쯤 지워진 채로 남지 않는다.
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
           rank() over (partition by a.period_id order by a.like_count desc) as rk
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
