-- Name My Thing schema. Run once in the Supabase SQL editor.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  description text not null check (char_length(description) between 3 and 140),
  created_at timestamptz not null default now()
);

create table if not exists names (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  model text not null,           -- which LLM suggested it: claude | openai | gemini
  votes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists names_project_id_idx on names (project_id);
create index if not exists names_votes_idx on names (votes desc, created_at desc);

-- Anyone may read; all writes go through the server with the service role key.
alter table projects enable row level security;
alter table names enable row level security;

drop policy if exists "public read projects" on projects;
create policy "public read projects" on projects for select using (true);

drop policy if exists "public read names" on names;
create policy "public read names" on names for select using (true);

-- Atomic increment of the single vote column.
create or replace function upvote(name_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update names set votes = votes + 1 where id = name_id returning votes;
$$;

revoke execute on function upvote(uuid) from public, anon, authenticated;
grant execute on function upvote(uuid) to service_role;
