-- 1) 작품 제목을 자유 입력이 아니라 교사가 미리 등록한 목록에서 고르도록 한다.
create table title_presets (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  unique (class_id, title)
);

alter table title_presets enable row level security;

create policy "select_class_title_presets" on title_presets for select using (
  class_id in (select id from classes where teacher_id = auth.uid())
  or class_id = (auth.jwt() ->> 'class_id')::uuid
  or is_admin()
);
create policy "teacher_insert_title_presets" on title_presets for insert with check (
  class_id in (select id from classes where teacher_id = auth.uid())
);
create policy "teacher_delete_title_presets" on title_presets for delete using (
  class_id in (select id from classes where teacher_id = auth.uid())
);

-- 2) 작품 설명을 "AI의 도움을 받은 점" / "내가 스스로 한 점" 두 항목으로 분리한다.
alter table artworks
  add column ai_help_description text,
  add column self_description text;

alter table artworks drop column description;
