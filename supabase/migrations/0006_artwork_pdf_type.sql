-- 학생이 PDF 자료도 올릴 수 있도록 artworks.type 에 'pdf' 를 추가한다.

alter table artworks drop constraint if exists artworks_type_check;
alter table artworks
  add constraint artworks_type_check
  check (type in ('image', 'link', 'video', 'audio', 'pdf'));
