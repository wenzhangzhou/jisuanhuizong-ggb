-- 在 CloudBase 控制台 → 数据库 → SQL 编辑器 中执行
-- 表：schemes（方案云同步）

create table if not exists public.schemes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.uid()),
  tool text not null,
  name text not null default '未命名方案',
  inputs jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schemes_tool_updated_idx on public.schemes (tool, updated_at desc);
create index if not exists schemes_user_idx on public.schemes (user_id);

alter table public.schemes enable row level security;

-- 已登录用户都可读取（导入/载入）
drop policy if exists schemes_select_authenticated on public.schemes;
create policy schemes_select_authenticated on public.schemes
  for select to authenticated
  using (true);

-- 已登录用户可插入（管理员前端还会再拦一层；未配置 ADMIN_EMAILS 时可用）
drop policy if exists schemes_insert_own on public.schemes;
create policy schemes_insert_own on public.schemes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists schemes_update_own on public.schemes;
create policy schemes_update_own on public.schemes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists schemes_delete_own on public.schemes;
create policy schemes_delete_own on public.schemes
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.schemes to authenticated;
grant select on public.schemes to anon;
