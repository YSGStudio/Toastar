# 학생 작품 전시 SNS

`학생작품SNS_기획서.md` 기획서를 기반으로 구현한 교내 전용 학생 작품 전시 웹앱입니다.
React(Next.js App Router) + Supabase(Postgres·Auth·Storage, RLS) 로 작성되었습니다.

## 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **Settings > API**에서 Project URL, `anon` key, `service_role` key를 확인합니다.
3. **Settings > API > JWT Keys**에서 레거시 HS256 **JWT Secret**을 확인합니다(학생 커스텀 로그인 토큰 서명에 사용 — 프로젝트가 새 비대칭 키 체계만 쓰는 경우 "Legacy JWT secret"을 활성화해야 합니다).
4. SQL Editor에서 `supabase/migrations/0001_init.sql`의 내용을 그대로 실행합니다. 테이블, RLS 정책, `artworks` Storage 버킷이 한 번에 생성됩니다.

## 2. 환경변수

`.env.local.example`을 복사해 `.env.local`을 만들고 위에서 확인한 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

## 3. 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000/login` 에서 교사 회원가입 → 학급 생성(학급코드 발급) → 학생은 학급코드+이름으로 로그인합니다.

## 4. 구현 메모 / 알아두면 좋은 점

- **학생 인증**: 학생은 Supabase Auth 계정이 없습니다. `/api/student/login`이 학급코드+이름(+동명이인 구분번호)을 확인한 뒤 `SUPABASE_JWT_SECRET`으로 서명한 커스텀 JWT를 httpOnly 쿠키로 발급합니다. 이후 모든 요청은 이 JWT를 `Authorization: Bearer`로 사용하는 Supabase 클라이언트로 처리되어 RLS가 그대로 적용됩니다(서비스 롤을 사용하지 않음).
- **교사 인증**: Supabase Auth(이메일/비밀번호)를 그대로 사용합니다. 가입 시 이메일 확인 절차 없이 즉시 활성화합니다(교내 도구 특성을 고려한 단순화).
- **작품 업로드 권한**: 기획서의 권한 매트릭스에는 교사도 업로드 가능하다고 표기되어 있으나, 세부 명세(3.2)·DB 설계(6.5 `UNIQUE(student_id, period_id)`)·RLS(7.2)는 모두 "학생 본인 업로드"만 다루고 있어 실제 구현은 학생 전용 업로드로 처리했습니다. 교사가 부적절한 작품을 정리하는 것은 수정·삭제 권한으로 충분히 커버됩니다.
- **썸네일 생성**: 이미지는 브라우저 canvas로 480px 리사이즈, 동영상은 브라우저에서 1초(또는 10%) 지점 프레임을 캡처해 생성합니다. 링크는 서버에서 `og:image` 메타태그를 가볍게 스크래핑해 캐시하고, 실패 시 기본 아이콘을 보여줍니다. 오디오는 기본 아이콘을 사용합니다(서버 트랜스코딩 없이 가능한 범위의 구현).
- **다운로드 차단**: 우클릭/드래그 차단 + 비공개 Storage 버킷 + 만료형 서명 URL(15분)로 구현했습니다. 완전한 다운로드 차단은 불가능하므로 기획서대로 "어렵게 만드는" 수준입니다.
- **하트 일일 한도**: `artwork_likes` INSERT 전에 Postgres 트리거(`SECURITY DEFINER`)가 좋아요를 누르는 학생이 속한 학급의 `daily_heart_limit`과 그날 사용량을 비교해 초과 시 거부합니다. 취소(좋아요 취소)는 그날 사용량을 환불하지 않도록 했습니다(다회성 토글 어뷰징 방지).
- **시상 집계**: pg_cron/Edge Function 같은 예약 작업 배포는 이 환경에서 직접 만들 수 없어, 교사가 환경설정 > 시상 기록에서 종료된 기간을 선택해 "시상 집계" 버튼을 누르면 즉시 계산되도록 구현했습니다. 동점자는 모두 공동 수상으로 처리합니다. 실제 운영에서 자동화하려면 같은 로직을 Supabase Edge Function + `pg_cron`으로 옮기면 됩니다.
- **로그인 차단 시간**: 평일/주말 구분 규칙은 학교 기준 시간대(`SCHOOL_TIMEZONE`, 기본 `Asia/Seoul`)로 서버에서만 검사하며, 자정을 넘는 구간도 지원합니다. 교사 로그인에는 적용되지 않습니다.

## 5. 아직 구현하지 않은 부분 (향후 고려사항, 기획서 8.2)

- 부적절 콘텐츠 신고, 댓글/응원 메시지
- 학년·학기 단위 통계/아카이브
- 접근성 세부 튜닝, pg_cron을 통한 시상 완전 자동화
