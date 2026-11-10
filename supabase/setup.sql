-- ============================================================
-- 中華虛擬航空 後台設定（貼到 Supabase → SQL Editor 執行一次即可）
-- 這份可以重複執行，不會破壞已經存在的資料。
-- ============================================================

-- 1) 網站文字與圖片：每一列是一個可編輯的欄位
create table if not exists public.site_content (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

-- 2) 活動公告
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 120),
  body       text not null default '' check (char_length(body) <= 1000),
  event_date date,
  image_url  text check (image_url is null or image_url like 'https://%'),
  published  boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) 管理員名單：只有在這張表裡的帳號才能修改內容
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.site_content  enable row level security;
alter table public.announcements enable row level security;
alter table public.admins        enable row level security;

-- 4) 判斷目前登入者是不是管理員
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 5) 網站文字與圖片：所有人可讀，只有管理員可寫
drop policy if exists "content public read"  on public.site_content;
drop policy if exists "content admin insert" on public.site_content;
drop policy if exists "content admin update" on public.site_content;
drop policy if exists "content admin delete" on public.site_content;

create policy "content public read"  on public.site_content
  for select using (true);
create policy "content admin insert" on public.site_content
  for insert to authenticated with check (public.is_admin());
create policy "content admin update" on public.site_content
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "content admin delete" on public.site_content
  for delete to authenticated using (public.is_admin());

-- 6) 活動公告：訪客只能看到「已發佈」的；管理員可看全部（含草稿）並新增／修改／刪除
drop policy if exists "ann public read"  on public.announcements;
drop policy if exists "ann admin read"   on public.announcements;
drop policy if exists "ann admin insert" on public.announcements;
drop policy if exists "ann admin update" on public.announcements;
drop policy if exists "ann admin delete" on public.announcements;

create policy "ann public read"  on public.announcements
  for select using (published = true);
create policy "ann admin read"   on public.announcements
  for select to authenticated using (public.is_admin());
create policy "ann admin insert" on public.announcements
  for insert to authenticated with check (public.is_admin());
create policy "ann admin update" on public.announcements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ann admin delete" on public.announcements
  for delete to authenticated using (public.is_admin());

-- 7) 管理員名單權限：登入者只能看到自己是不是管理員
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- 8) 圖片儲存空間（公開可看，只有管理員能上傳／修改／刪除）
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "images admin insert" on storage.objects;
drop policy if exists "images admin update" on storage.objects;
drop policy if exists "images admin delete" on storage.objects;

create policy "images admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and public.is_admin());
create policy "images admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and public.is_admin())
  with check (bucket_id = 'images' and public.is_admin());
create policy "images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and public.is_admin());

-- ============================================================
-- 9) 把管理員加進名單（這段要「另外」執行，執行前先改成對方的 Email）
--    前提：該帳號已在 Authentication → Users 建立好
-- ============================================================
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'admin@example.com';
