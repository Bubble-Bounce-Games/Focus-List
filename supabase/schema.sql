create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict,
  tag_id uuid not null references public.tags(id) on delete restrict,
  title text not null,
  progress integer not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  progress_note text not null default '',
  blocker text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.tags enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "Users manage their own projects" on public.projects;
drop policy if exists "Users manage their own tags" on public.tags;
drop policy if exists "Users manage their own tasks" on public.tasks;

create policy "Users manage their own projects" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own tags" on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own tasks" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists tasks_user_updated_idx on public.tasks(user_id, updated_at desc);
create index if not exists projects_user_idx on public.projects(user_id);
create index if not exists tags_user_idx on public.tags(user_id);

do $$
begin
  alter publication supabase_realtime add table public.projects;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tags;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end $$;
