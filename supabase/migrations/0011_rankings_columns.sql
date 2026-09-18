-- 0009(학급별 순위)의 테이블 변경만 다시 담는다.
--
-- 운영 DB에는 0009를 건너뛰고 0010이 먼저 적용됐다. 0009를 지금 그대로 실행하면
-- 그 안의 순위 함수 정의가 이미 없어진 periods.class_id를 참조해 실패하고, 성공하더라도
-- 0010의 "학급별 순위" 함수를 옛 버전으로 덮어쓴다. 그래서 함수는 건드리지 않고
-- 테이블 변경만 여기서 적용한다(순위 함수는 0010의 것을 그대로 쓴다).
--
-- 모든 문장을 반복 실행해도 안전하게 썼다. 0001부터 순서대로 적용하는 새 환경에서는
-- 0009가 이미 같은 일을 했으므로 아무것도 바뀌지 않는다.

alter table award_records add column if not exists rank int;

-- 기존 기록에 순위를 매긴다. 기간 안에서 학급마다 하트 많은 순, 동점은 같은 순위.
update award_records ar
set rank = ranked.rk
from (
  select id, rank() over (partition by period_id, class_id order by heart_count desc) as rk
  from award_records
) ranked
where ar.id = ranked.id
  and ar.rank is null;

alter table award_records alter column rank set not null;

create unique index if not exists award_records_period_artwork_idx on award_records (period_id, artwork_id);
create index if not exists award_records_class_period_rank_idx on award_records (class_id, period_id, rank);

alter table classes drop column if exists award_top_n;
