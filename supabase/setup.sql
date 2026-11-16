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

-- 2b) 公告進階欄位（英文版、置頂、預約發布、活動時間）。可重複執行。
alter table public.announcements
  add column if not exists title_en   text check (title_en is null or char_length(title_en) <= 120),
  add column if not exists body_en    text check (body_en  is null or char_length(body_en)  <= 1000),
  add column if not exists pinned     boolean not null default false,
  add column if not exists publish_at timestamptz,   -- 預約發布：到這個時間才會對外顯示（空白＝立刻）
  add column if not exists event_at   timestamptz;   -- 活動開始時間，用於首頁倒數

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
  for select using (published = true and (publish_at is null or publish_at <= now()));
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
-- 10) 多個管理員與權限：owner（站長，全部都能改）／editor（編輯，只能管公告與圖片）
--     原本的管理員會自動成為 owner，不會被鎖在外面。
-- ============================================================
alter table public.admins add column if not exists email      text;
alter table public.admins add column if not exists role       text not null default 'owner';
alter table public.admins add column if not exists created_at timestamptz not null default now();
alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins add constraint admins_role_check check (role in ('owner', 'editor'));
update public.admins a set email = u.email from auth.users u where u.id = a.user_id and a.email is null;

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role = 'owner');
$$;

-- 首頁文字與圖片只有 owner 能改；公告和圖片上傳 editor 也可以
drop policy if exists "content admin insert" on public.site_content;
drop policy if exists "content admin update" on public.site_content;
drop policy if exists "content admin delete" on public.site_content;
create policy "content admin insert" on public.site_content
  for insert to authenticated with check (public.is_owner());
create policy "content admin update" on public.site_content
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "content admin delete" on public.site_content
  for delete to authenticated using (public.is_owner());

-- owner 可以看到完整的管理員名單
drop policy if exists "admins owner read" on public.admins;
create policy "admins owner read" on public.admins
  for select to authenticated using (public.is_owner());

-- 新增／調整管理員：輸入對方 Email（對方要先在 Authentication → Users 有帳號）
create or replace function public.add_admin(p_email text, p_role text default 'editor')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
begin
  if not public.is_owner() then raise exception '只有站長（owner）可以管理管理員名單'; end if;
  if p_role not in ('owner', 'editor') then raise exception '角色只能是 owner 或 editor'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception '找不到這個 Email 的帳號，請先到 Supabase Authentication → Users 建立帳號'; end if;
  if uid = auth.uid() and p_role <> 'owner' then raise exception '不能把自己降級'; end if;
  insert into public.admins (user_id, email, role) values (uid, lower(trim(p_email)), p_role)
  on conflict (user_id) do update set role = excluded.role, email = excluded.email;
end;
$$;

create or replace function public.remove_admin(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then raise exception '只有站長（owner）可以管理管理員名單'; end if;
  if p_user = auth.uid() then raise exception '不能移除自己'; end if;
  delete from public.admins where user_id = p_user;
end;
$$;

revoke all on function public.add_admin(text, text) from public, anon;
revoke all on function public.remove_admin(uuid) from public, anon;
grant execute on function public.add_admin(text, text) to authenticated;
grant execute on function public.remove_admin(uuid) to authenticated;

-- ============================================================
-- 11) 操作紀錄：公告、首頁文字、管理員名單的每次新增／修改／刪除都會自動記錄（只有 owner 看得到）
-- ============================================================
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  user_id    uuid,
  email      text,
  table_name text not null,
  action     text not null,
  row_key    text,
  summary    text
);
alter table public.audit_log enable row level security;
drop policy if exists "audit owner read" on public.audit_log;
create policy "audit owner read" on public.audit_log
  for select to authenticated using (public.is_owner());
-- 不開放任何人直接新增／修改／刪除，只有下面的觸發器能寫入

create or replace function public.log_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare k text; s text;
begin
  if tg_table_name = 'announcements' then
    if tg_op = 'DELETE' then k := old.id::text; s := old.title; else k := new.id::text; s := new.title; end if;
  elsif tg_table_name = 'site_content' then
    if tg_op = 'DELETE' then k := old.key; s := left(old.value, 60); else k := new.key; s := left(new.value, 60); end if;
  else
    if tg_op = 'DELETE' then k := old.user_id::text; s := coalesce(old.email, '') || ' (' || old.role || ')';
    else k := new.user_id::text; s := coalesce(new.email, '') || ' (' || new.role || ')'; end if;
  end if;
  insert into public.audit_log (user_id, email, table_name, action, row_key, summary)
  values (auth.uid(), coalesce(auth.jwt() ->> 'email', ''), tg_table_name, tg_op, k, s);
  return null;
end;
$$;

drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements after insert or update or delete on public.announcements
  for each row execute function public.log_change();
drop trigger if exists audit_site_content on public.site_content;
create trigger audit_site_content after insert or update or delete on public.site_content
  for each row execute function public.log_change();
drop trigger if exists audit_admins on public.admins;
create trigger audit_admins after insert or update or delete on public.admins
  for each row execute function public.log_change();

-- ============================================================
-- 9) 把管理員加進名單（這段要「另外」執行，執行前先改成對方的 Email）
--    前提：該帳號已在 Authentication → Users 建立好
-- ============================================================
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'admin@example.com';
