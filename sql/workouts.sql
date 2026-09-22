-- Workouts: sessions and the sets in them. Run once in the SQL Editor of the
-- same Supabase project the page signs into. Safe beside the events table.
begin;

-- A session is one visit to the gym. It groups the sets that follow.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  started_at timestamptz not null default now(),
  source text not null,
  source_id text
);

-- A set is one exercise, one weight, one count of reps, in one session.
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  session_id uuid not null references public.sessions (id),
  exercise text not null,
  weight numeric not null,
  unit text not null,
  reps integer not null check (reps > 0),
  performed_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  source text not null,
  source_id text
);

-- The same set sent twice lands once.
create unique index sets_once on public.sets (user_id, source, source_id) where source_id is not null;
create unique index sessions_once on public.sessions (user_id, source, source_id) where source_id is not null;

-- On. By default nobody can read anything, including you.
alter table public.sessions enable row level security;
alter table public.sets enable row level security;

-- Read your own rows. Write your own rows. That is the whole permission system.
create policy sessions_read_own on public.sessions for select using (user_id = auth.uid());
create policy sessions_write_own on public.sessions for insert with check (user_id = auth.uid());
create policy sets_read_own on public.sets for select using (user_id = auth.uid());
create policy sets_write_own on public.sets for insert with check (user_id = auth.uid());

-- No update policy. No delete policy. A set, once logged, stays.

grant usage on schema public to authenticated;
grant select, insert on public.sessions, public.sets to authenticated;

commit;
