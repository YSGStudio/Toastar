-- 순위 집계 대상을 '가장 최근에 연 기간'으로 바꾼다.
--
-- 지금까지는 끝난 기간 중 종료일이 가장 늦은 것을 골랐다. 종료일은 기간을 만들 때 적는 값이라
-- 실제로 운영한 순서와 다를 수 있다. 종료일이 같은 빈 기간이 하나 있으면 매번 그 기간이 뽑혀
-- "선정할 작품이 없어요"로 끝났다. 새 기간을 열면 이전 기간은 자동으로 닫히므로,
-- 끝난 기간 중 가장 나중에 연(만든) 기간이 곧 마지막으로 운영한 기간이다.

create or replace function latest_closed_period_ids()
returns setof uuid
language sql stable
as $$
  select p.id
  from periods p
  where p.phase = 'closed'
  order by p.created_at desc
  limit 1
$$;
