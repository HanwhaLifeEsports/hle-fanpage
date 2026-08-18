-- =====================================================================
-- 팬 사진 — 스키마 · 권한 · 저장소
-- =====================================================================
--
-- Supabase SQL Editor 에 통째로 붙여 넣어 한 번 실행한다. 여러 번 실행해도
-- 같은 상태가 되도록 썼다.
--
-- 설계의 중심은 RLS 다. "누가 무엇을 할 수 있는가" 를 API 라우트 코드가 아니라
-- 데이터베이스에 적어 둔다. 라우트를 하나 빠뜨려도, 브라우저가 공개 키로 직접
-- 찔러도, 규칙은 여기서 막힌다. anon 키는 공개된 값이라 이 전제가 중요하다.
--
-- 사전 준비 (대시보드에서 한 번):
--   Authentication > Providers > Anonymous sign-ins 를 켠다.
--   로그인 없이 하트 중복을 막으려면 사람마다 고정된 id 가 필요하고,
--   익명 인증이 그 id(auth.uid())를 준다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 표
-- ---------------------------------------------------------------------

create table if not exists public.fan_photos (
  id          uuid primary key default gen_random_uuid(),
  player_id   text        not null,
  -- 저장소 경로. 공개 URL 은 이 값으로 만든다
  path        text        not null unique,
  width       int         not null,
  height      int         not null,
  -- 하트 수. fan_hearts 를 매번 세지 않으려고 트리거로 유지하는 집계값이다
  hearts      int         not null default 0,
  -- 올린 사람(익명 id). 본인 사진 삭제 판정에 쓴다
  owner       uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  -- 업로더가 "직접 촬영" 을 확인했는가. 저작권법 제103조 중단 요구가 왔을 때
  -- 무엇을 근거로 게시했는지 남는 기록이라 false 면 애초에 들어올 수 없다
  attested    boolean     not null,
  -- 신고를 받아 가려진 상태. 정보통신망법 제44조의2 의 임시조치에 해당한다
  hidden      boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- 선수별로 하트 순 정렬이 기본 조회다
create index if not exists fan_photos_player_rank
  on public.fan_photos (player_id, hearts desc, created_at desc)
  where not hidden;

-- 하트. (사진, 사람) 을 기본키로 두는 것이 곧 "한 사람당 한 번" 이다.
-- 코드로 세지 않고 데이터베이스가 구조로 막는다
create table if not exists public.fan_hearts (
  photo_id   uuid        not null references public.fan_photos(id) on delete cascade,
  voter      uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, voter)
);

-- 신고. 같은 사람이 같은 사진을 여러 번 신고해도 한 건이다
create table if not exists public.fan_reports (
  photo_id   uuid        not null references public.fan_photos(id) on delete cascade,
  reporter   uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now(),
  primary key (photo_id, reporter)
);

-- ---------------------------------------------------------------------
-- 트리거
-- ---------------------------------------------------------------------

-- 하트 수 유지. RLS 를 넘어 집계 칸을 고쳐야 하므로 security definer 다
create or replace function public.sync_heart_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update fan_photos set hearts = hearts + 1 where id = new.photo_id;
  elsif tg_op = 'DELETE' then
    update fan_photos set hearts = greatest(0, hearts - 1) where id = old.photo_id;
  end if;
  return null;
end $$;

drop trigger if exists fan_hearts_sync on public.fan_hearts;
create trigger fan_hearts_sync
  after insert or delete on public.fan_hearts
  for each row execute function public.sync_heart_count();

-- 신고 한 건이면 즉시 가린다.
--
-- 저작권법 제102조 제1항은 침해를 '알게 된 때' 즉시 중단시킨 경우에 책임을
-- 제한한다. 신고가 곧 그 통지다. 맞는지 따져본 뒤 내리면 그 사이가 비어 버린다.
-- 정보통신망법 제44조의2 의 임시조치도 같은 순서다 — 먼저 가리고 나중에 판단한다.
-- 근거 없는 신고였다면 운영자가 대시보드에서 되돌린다 (아래 fan_reports_unhide).
--
-- [아직 못 하는 것 — 계정이 붙어야 한다]
-- 정보통신망법 제44조의2 는 삭제·임시조치를 하면 신청인과 '정보게재자' 양쪽에
-- 알릴 것을 요구하고, 저작권법 제103조 제3항은 내려간 사람이 소명해 재개를
-- 요구하는 절차를 둔다. 지금은 업로더가 익명이라 연락할 방법이 없어 둘 다 못 한다.
-- 로그인이 붙으면 (1) 내려갔다는 고지 (2) 이의제기 창구를 함께 만들어야 한다.
create or replace function public.hide_on_report()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update fan_photos set hidden = true where id = new.photo_id;
  return null;
end $$;

drop trigger if exists fan_reports_hide on public.fan_reports;
create trigger fan_reports_hide
  after insert on public.fan_reports
  for each row execute function public.hide_on_report();

-- 신고를 지우면 자동으로 되살린다.
--
-- 복원을 운영자의 손작업으로 두면, 악성 사용자가 사진을 하나씩 눌러 내리는 수고보다
-- 되돌리는 수고가 더 커진다. 공격이 이기는 구조다.
-- 이 트리거가 있으면 복원은 "그 사람의 신고를 지운다" 한 줄로 끝난다:
--   delete from fan_reports where reporter = '문제된-id';
-- 남은 신고가 하나도 없을 때만 푼다 — 다른 사람의 정당한 신고까지 무시하면 안 된다.
create or replace function public.unhide_when_no_reports()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from fan_reports where photo_id = old.photo_id) then
    update fan_photos set hidden = false where id = old.photo_id;
  end if;
  return null;
end $$;

drop trigger if exists fan_reports_unhide on public.fan_reports;
create trigger fan_reports_unhide
  after delete on public.fan_reports
  for each row execute function public.unhide_when_no_reports();

-- 최근 10분 동안 이 사람이 넣은 신고 건수. 신고 도배 제한이 쓴다.
-- 업로드 쪽과 같은 이유로 security definer 다 (정책 안 서브쿼리는 RLS 를 탄다).
create or replace function public.recent_report_count()
returns int language sql security definer stable set search_path = public as $$
  select count(*)::int from public.fan_reports
  where reporter = auth.uid() and created_at > now() - interval '10 minutes'
$$;

-- 최근 10분 동안 이 사람이 올린 장수. 도배 제한이 쓴다.
--
-- security definer 인 것이 핵심이다. 정책 안에 서브쿼리로 직접 세면 그 서브쿼리도
-- RLS 를 타서, 가려진 사진(hidden)이 개수에서 빠진다. 그러면 5장 올리고 자기
-- 사진을 자기가 신고하는 것만으로 한도가 초기화된다 — 가려진 사진의 파일은
-- 저장소에 그대로 남으므로 저장소를 무제한으로 채울 수 있다.
--
-- uid 를 인자로 받지 않는 것도 일부러다. 받으면 남의 id 를 넘겨 한도를 우회한다.
create or replace function public.recent_upload_count()
returns int language sql security definer stable set search_path = public as $$
  select count(*)::int from public.fan_photos
  where owner = auth.uid() and created_at > now() - interval '10 minutes'
$$;

-- ---------------------------------------------------------------------
-- 권한 (RLS)
-- ---------------------------------------------------------------------

alter table public.fan_photos  enable row level security;
alter table public.fan_hearts  enable row level security;
alter table public.fan_reports enable row level security;

-- 읽기: 가려지지 않은 것만. 신고당한 사진은 올린 사람에게도 안 보인다.
-- 운영자는 service_role 로 대시보드에서 보므로 RLS 를 타지 않는다
drop policy if exists "사진 읽기" on public.fan_photos;
create policy "사진 읽기" on public.fan_photos
  for select to anon, authenticated
  using (not hidden);

-- 쓰기: 본인 명의로만, 확인란을 통과한 것만.
-- 마지막 조건은 도배 제한이다 — 10분에 5장. 계정이 없으니 사람 단위가 아니라
-- 익명 id 단위지만, 창을 새로 여는 수고를 매번 들이게 만드는 것만으로 충분히 걸린다.
-- 개수는 반드시 recent_upload_count() 로 센다. 여기에 서브쿼리를 직접 쓰면
-- 그 서브쿼리가 RLS 를 타서 가려진 사진이 빠진다 (함수 주석 참고)
drop policy if exists "사진 올리기" on public.fan_photos;
create policy "사진 올리기" on public.fan_photos
  for insert to authenticated
  with check (
    owner = auth.uid()
    and attested = true
    and hidden = false
    and hearts = 0
    and public.recent_upload_count() < 5
  );

-- 수정 정책은 두지 않는다. hearts 와 hidden 은 트리거만 건드린다.
--
-- 삭제는 본인 사진만. 다만 가려진 사진은 이 정책으로도 지워지지 않는다.
-- PostgreSQL 은 DELETE 의 WHERE 가 컬럼을 참조하면 SELECT 정책을 함께 적용하는데,
-- 가려진 행은 SELECT 정책에 안 걸려 애초에 대상이 되지 않는다. 에러 없이 0행이 지워진다.
-- 의도한 결과다 — 신고로 내려간 것을 올린 사람이 치워 증거를 없애는 일이 없어야 한다.
-- 대신 정리는 운영자 몫이고, 아래 운영 메모의 쿼리를 쓴다.
drop policy if exists "본인 사진 삭제" on public.fan_photos;
create policy "본인 사진 삭제" on public.fan_photos
  for delete to authenticated
  using (owner = auth.uid());

-- 하트: 내가 무엇을 눌렀는지만 읽는다. 남이 누구를 눌렀는지는 알 필요가 없다
drop policy if exists "내 하트 읽기" on public.fan_hearts;
create policy "내 하트 읽기" on public.fan_hearts
  for select to authenticated using (voter = auth.uid());

drop policy if exists "하트 누르기" on public.fan_hearts;
create policy "하트 누르기" on public.fan_hearts
  for insert to authenticated with check (voter = auth.uid());

drop policy if exists "하트 취소" on public.fan_hearts;
create policy "하트 취소" on public.fan_hearts
  for delete to authenticated using (voter = auth.uid());

-- 신고: 넣기만 한다. 남의 신고를 읽을 이유가 없다.
--
-- 10분에 3건까지. 신고 한 건이 곧 숨김이므로, 제한이 없으면 한 사람이 갤러리를
-- 통째로 내릴 수 있다. 익명 id 라 창을 새로 열면 우회되지만, 매번 그 수고를
-- 들이게 만드는 것과 아무 대가 없이 누르는 것은 다르다.
-- 로그인이 붙으면 이 제한은 계정 단위가 되어 실제로 막는 장치가 된다.
drop policy if exists "신고하기" on public.fan_reports;
create policy "신고하기" on public.fan_reports
  for insert to authenticated
  with check (reporter = auth.uid() and public.recent_report_count() < 3);

-- ---------------------------------------------------------------------
-- 저장소
-- ---------------------------------------------------------------------

-- 1MB 상한과 image/jpeg 제한을 버킷에 건다. 클라이언트가 900x1125 품질 82 로
-- 잘라 올리므로 보통 130KB 안팎이고, 상한은 그 열 배쯤 여유를 둔 값이다.
-- 클라이언트 검사는 우회할 수 있으니 여기서도 막는다
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fan-photos', 'fan-photos', true, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "팬 사진 읽기" on storage.objects;
create policy "팬 사진 읽기" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'fan-photos');

drop policy if exists "팬 사진 올리기" on storage.objects;
create policy "팬 사진 올리기" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fan-photos' and owner = auth.uid());

drop policy if exists "팬 사진 지우기" on storage.objects;
create policy "팬 사진 지우기" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fan-photos' and owner = auth.uid());

-- ---------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------
--
-- 위를 실행한 뒤 아래 두 개를 돌려 본다.
--
-- 1) 세 표 모두 rls 가 t 여야 한다. force 는 전부 f 여야 한다.
--    force 를 켜면 표 소유자까지 RLS 를 타게 되어, 소유자 권한으로 도는
--    security definer 트리거가 막힌다 — 하트 수가 안 올라간다.
--
--    select relname, relrowsecurity as rls, relforcerowsecurity as force
--    from pg_class
--    where relnamespace = 'public'::regnamespace
--      and relname in ('fan_photos', 'fan_hearts', 'fan_reports');
--
-- 2) 정책이 7개 붙어 있어야 한다 (3 + 3 + 1).
--    fan_photos  SELECT / INSERT / DELETE
--    fan_hearts  SELECT / INSERT / DELETE
--    fan_reports INSERT
--    storage.objects 의 3개는 tablename 이 달라 아래 쿼리에 안 잡힌다.
--    fan_photos 에 UPDATE 정책이 없는 것이 맞다. hearts 와 hidden 은
--    트리거만 건드려야 하므로 아무에게도 수정 권한을 주지 않는다.
--
--    select tablename, policyname, cmd, roles
--    from pg_policies where tablename like 'fan\_%' order by tablename, cmd;
--
-- 대시보드의 "새 표에 RLS 자동 활성화" 는 Table Editor 로 만든 표에만 걸린다.
-- SQL 로 만든 이 표들은 위 alter 문이 책임진다. 다만 앞으로 표를 늘릴 때를
-- 대비해 그 설정도 켜 두는 편이 낫다.
--
-- ---------------------------------------------------------------------
-- 운영 메모
-- ---------------------------------------------------------------------
--
-- 가려진 사진 보기 (클라이언트에서는 아무에게도 안 보인다):
--   select * from fan_photos where hidden order by created_at desc;
--
-- 가려진 지 오래된 것 치우기. 올린 사람도 지울 수 없으므로 여기서만 정리된다.
-- 저장소 파일은 Storage > fan-photos 에서 같은 path 를 함께 지운다:
--   select path from fan_photos where hidden and created_at < now() - interval '30 days';
--   delete from fan_photos where hidden and created_at < now() - interval '30 days';
--
-- 근거 없는 신고를 되돌리기 (트리거가 hidden 을 알아서 푼다):
--   delete from fan_reports where photo_id = '...';
--
-- 한 사람이 무더기로 눌렀을 때 — 그 사람의 신고를 통째로 지우면 전부 복원된다:
--   select reporter, count(*) from fan_reports group by reporter order by 2 desc;
--   delete from fan_reports where reporter = '문제된-id';
--
-- 권리자 요청으로 완전히 지우기 (저장소 파일은 대시보드 Storage 에서 함께 지운다):
--   delete from fan_photos where id = '...';
--
-- 특정 선수 사진을 전부 내리기:
--   update fan_photos set hidden = true where player_id = 'gumayusi';
