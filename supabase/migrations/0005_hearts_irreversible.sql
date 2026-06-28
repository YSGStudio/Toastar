-- 한 번 준 하트는 취소할 수 없도록 한다(좋아요 취소 정책 폐지).
-- artwork_likes의 unique(artwork_id, student_id) 제약으로 "작품당 1회"는 이미 보장되어 있다.
drop policy if exists "student_delete_own_like" on artwork_likes;
