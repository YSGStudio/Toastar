-- 교내 전용 학생 작품 전시 SNS — 초기 스키마 + RLS 정책
-- Supabase SQL Editor 또는 `supabase db push`로 실행한다.
--
-- 학생은 Supabase Auth 계정이 없다. 서버(Route Handler)가 학급코드+이름을 검증한 뒤
-- HS256으로 서명한 커스텀 JWT를 발급하며, 그 JWT의 클레임은 다음과 같다:
--   role: 'authenticated'      -- PostgREST가 Postgres 역할로 매핑(필수)
--   sub:  students.id
--   student_id, class_id, name -- 앱에서 사용하는 커스텀 클레임
--   app_role: 'student'        -- 앱 차원의 역할 구분(교사는 이 클레임이 없음)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. 테이블
-- ---------------------------------------------------------------------------

create table teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers (id) on delete cascade,
  name text not null,
  class_code text not null unique,
  daily_heart_limit int not null default 3,
  award_top_n int not null default 1,
  created_at timestamptz not null default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  name text not null,
  login_no int,
  created_at timestamptz not null default now(),
  unique (class_id, name, login_no)
);

create table periods (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now()
);
create index periods_class_status_idx on periods (class_id, status);

create table artworks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  period_id uuid not null references periods (id) on delete cascade,
  student_id uuid not null references students (id) on delete cascade,
  type text not null check (type in ('image', 'link', 'video', 'audio')),
  file_path text not null,
  thumbnail_path text,
  title text not null,
  description text,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (student_id, period_id)
);
create index artworks_period_idx on artworks (period_id, created_at desc);

create table artwork_likes (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references artworks (id) on delete cascade,
  student_id uuid not null references students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (artwork_id, student_id)
);

create table daily_heart_usage (
  student_id uuid not null references students (id) on delete cascade,
  usage_date date not null,
  used_count int not null default 0,
  primary key (student_id, usage_date)
);

create table award_records (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  period_id uuid not null references periods (id) on delete cascade,
  student_id uuid not null references students (id) on delete cascade,
  artwork_id uuid not null references artworks (id) on delete cascade,
  heart_count int not null,
  awarded_at timestamptz not null default now()
);

create table login_block_rules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  day_type text not null check (day_type in ('weekday', 'weekend')),
  enabled boolean not null default false,
  start_time time not null default '09:00',
  end_time time not null default '15:00',
  unique (class_id, day_type)
);

-- ---------------------------------------------------------------------------
-- 2. 트리거: 좋아요 집계 캐시 + 일일 하트 한도
-- ---------------------------------------------------------------------------

create or replace function update_artwork_like_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update artworks set like_count = like_count + 1 where id = new.artwork_id;
  elsif (tg_op = 'DELETE') then
    update artworks set like_count = like_count - 1 where id = old.artwork_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_update_like_count
after insert or delete on artwork_likes
for each row execute function update_artwork_like_count();

-- 좋아요 누른 "학생이 속한 학급"의 일일 한도를 기준으로 검사한다.
create or replace function check_and_increment_heart_usage()
returns trigger as $$
declare
  v_limit int;
  v_used int;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select c.daily_heart_limit into v_limit
  from students s
  join classes c on c.id = s.class_id
  where s.id = new.student_id;

  insert into daily_heart_usage (student_id, usage_date, used_count)
  values (new.student_id, v_today, 0)
  on conflict (student_id, usage_date) do nothing;

  select used_count into v_used
  from daily_heart_usage
  where student_id = new.student_id and usage_date = v_today
  for update;

  if v_used >= v_limit then
    raise exception 'DAILY_HEART_LIMIT_EXCEEDED';
  end if;

  update daily_heart_usage
  set used_count = used_count + 1
  where student_id = new.student_id and usage_date = v_today;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_check_heart_usage
before insert on artwork_likes
for each row execute function check_and_increment_heart_usage();

-- ---------------------------------------------------------------------------
-- 3. RLS 활성화
-- ---------------------------------------------------------------------------

alter table teachers enable row level security;
alter table classes enable row level security;
alter table students enable row level security;
alter table periods enable row level security;
alter table artworks enable row level security;
alter table artwork_likes enable row level security;
alter table daily_heart_usage enable row level security;
alter table award_records enable row level security;
alter table login_block_rules enable row level security;

-- ---------------------------------------------------------------------------
-- 4. RLS 정책
-- ---------------------------------------------------------------------------

-- teachers: 본인 행만 조회/수정. 최초 INSERT는 서버가 service role로 수행한다.
create policy "teacher_select_self" on teachers for select using (auth.uid() = id);
create policy "teacher_update_self" on teachers for update using (auth.uid() = id);

-- classes: 소유 교사는 전체, 학생은 자기 학급만 조회.
create policy "teacher_select_own_classes" on classes for select using (
  teacher_id = auth.uid()
  or id = (auth.jwt() ->> 'class_id')::uuid
);
create policy "teacher_insert_classes" on classes for insert with check (
  teacher_id = auth.uid() and exists (select 1 from teachers t where t.id = auth.uid())
);
create policy "teacher_update_own_classes" on classes for update using (teacher_id = auth.uid());
create policy "teacher_delete_own_classes" on classes for delete using (teacher_id = auth.uid());

-- students: 이름은 전교 작품 카드에 노출되므로 인증된 모든 사용자가 조회 가능.
-- 등록/수정/삭제는 해당 학급 담임 교사만.
create policy "authenticated_select_students" on students for select using (
  auth.role() = 'authenticated'
);
create policy "teacher_insert_students" on students for insert with check (
  class_id in (select id from classes where teacher_id = auth.uid())
);
create policy "teacher_update_students" on students for update using (
  class_id in (select id from classes where teacher_id = auth.uid())
);
create policy "teacher_delete_students" on students for delete using (
  class_id in (select id from classes where teacher_id = auth.uid())
);

-- periods: 최신/지난 탭 분류를 위해 모든 인증 사용자가 조회.
create policy "authenticated_select_periods" on periods for select using (
  auth.role() = 'authenticated'
);
create policy "teacher_insert_periods" on periods for insert with check (
  class_id in (select id from classes where teacher_id = auth.uid())
);
create policy "teacher_update_periods" on periods for update using (
  class_id in (select id from classes where teacher_id = auth.uid())
);

-- artworks: 전교 공개 열람(요구사항). 업로드는 본인+활성 기간만, 수정/삭제는 교사만(요구사항 5).
create policy "view_all_artworks_for_members" on artworks for select using (
  auth.role() = 'authenticated'
);
create policy "student_insert_own_artwork" on artworks for insert with check (
  (auth.jwt() ->> 'app_role') = 'student'
  and student_id = (auth.jwt() ->> 'student_id')::uuid
  and class_id = (auth.jwt() ->> 'class_id')::uuid
  and period_id in (select id from periods where status = 'active' and class_id = artworks.class_id)
);
create policy "teacher_update_artwork" on artworks for update using (
  class_id in (select id from classes where teacher_id = auth.uid())
);
create policy "teacher_delete_artwork" on artworks for delete using (
  class_id in (select id from classes where teacher_id = auth.uid())
);
-- 학생에게는 update/delete 정책을 부여하지 않아 원천 차단된다.

-- artwork_likes: 본인 좋아요 또는 해당 작품 학급 담임 교사만 조회. 본인만 추가/취소.
create policy "select_own_or_teacher_likes" on artwork_likes for select using (
  student_id = (auth.jwt() ->> 'student_id')::uuid
  or exists (
    select 1 from artworks a
    join classes c on c.id = a.class_id
    where a.id = artwork_likes.artwork_id and c.teacher_id = auth.uid()
  )
);
create policy "student_insert_like" on artwork_likes for insert with check (
  (auth.jwt() ->> 'app_role') = 'student'
  and student_id = (auth.jwt() ->> 'student_id')::uuid
);
create policy "student_delete_own_like" on artwork_likes for delete using (
  student_id = (auth.jwt() ->> 'student_id')::uuid
);

-- daily_heart_usage: 본인 사용량만 조회. 쓰기는 트리거(security definer)로만 일어난다.
create policy "select_own_heart_usage" on daily_heart_usage for select using (
  student_id = (auth.jwt() ->> 'student_id')::uuid
);

-- award_records: 전교 공개 발표 결과이므로 모든 인증 사용자가 조회. 기록은 교사만 생성.
create policy "authenticated_select_awards" on award_records for select using (
  auth.role() = 'authenticated'
);
create policy "teacher_insert_awards" on award_records for insert with check (
  class_id in (select id from classes where teacher_id = auth.uid())
);

-- login_block_rules: 담임 교사만 조회/관리. 학생 로그인 검사는 서버가 service role로 수행.
create policy "teacher_select_block_rules" on login_block_rules for select using (
  class_id in (select id from classes where teacher_id = auth.uid())
);
create policy "teacher_upsert_block_rules" on login_block_rules for insert with check (
  class_id in (select id from classes where teacher_id = auth.uid())
);
create policy "teacher_update_block_rules" on login_block_rules for update using (
  class_id in (select id from classes where teacher_id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- 5. Storage 버킷 + 정책
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', false)
on conflict (id) do nothing;

-- 파일 경로 규칙: {class_id}/{student_id}/{artwork_id}/(original|thumbnail).ext
create policy "members_read_artwork_files" on storage.objects for select using (
  bucket_id = 'artworks' and auth.role() = 'authenticated'
);
create policy "student_upload_own_artwork_files" on storage.objects for insert with check (
  bucket_id = 'artworks'
  and (auth.jwt() ->> 'app_role') = 'student'
  and (storage.foldername(name))[1] = (auth.jwt() ->> 'class_id')
  and (storage.foldername(name))[2] = (auth.jwt() ->> 'student_id')
);
create policy "teacher_delete_class_artwork_files" on storage.objects for delete using (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1]::uuid in (select id from classes where teacher_id = auth.uid())
);
