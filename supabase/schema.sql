create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  input_mode text not null default 'text' check (input_mode in ('text', 'voice', 'mixed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_archived boolean not null default false
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create unique index if not exists tags_user_id_name_idx on tags(user_id, name);

create table if not exists entry_tags (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references entries(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade
);

create unique index if not exists entry_tags_entry_id_tag_id_idx on entry_tags(entry_id, tag_id);

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null,
  type text not null,
  created_at timestamptz not null default now()
);

create table if not exists insight_sources (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references insights(id) on delete cascade,
  entry_id uuid not null references entries(id) on delete cascade
);

alter table profiles enable row level security;
alter table entries enable row level security;
alter table tags enable row level security;
alter table entry_tags enable row level security;
alter table insights enable row level security;
alter table insight_sources enable row level security;

create policy "profiles_owner" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "entries_owner" on entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tags_owner" on tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "entry_tags_owner" on entry_tags
for all using (
  exists (
    select 1 from entries where entries.id = entry_tags.entry_id and entries.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from entries where entries.id = entry_tags.entry_id and entries.user_id = auth.uid()
  )
);
create policy "insights_owner" on insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "insight_sources_owner" on insight_sources
for all using (
  exists (
    select 1 from insights where insights.id = insight_sources.insight_id and insights.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from insights where insights.id = insight_sources.insight_id and insights.user_id = auth.uid()
  )
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on entries;
create trigger entries_set_updated_at
before update on entries
for each row
execute function public.handle_updated_at();
