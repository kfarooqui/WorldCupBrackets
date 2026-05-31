-- ════════════════════════════════════════════════════════════════════════
--  World Cup 2026 Prediction Pool — schema, RLS, triggers
--  Run this in the Supabase SQL editor (or `supabase db push`) BEFORE seeding.
-- ════════════════════════════════════════════════════════════════════════

-- ── App settings (single row, id = 1) ──────────────────────────────────────
create table if not exists public.app_settings (
  id              int primary key default 1 check (id = 1),
  tournament_name text not null default 'FIFA World Cup 2026',
  -- Predictions lock at/after this instant (defaults to first kickoff).
  lock_at         timestamptz not null default '2026-06-11T18:00:00Z',
  -- Email that should automatically become the admin on signup.
  admin_email     text not null default 'kfarooqui@gmail.com'
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ── Profiles (1:1 with auth.users) ─────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text not null default '',
  last_name   text not null default '',
  phone       text not null default '',
  email       text not null default '',
  status      text not null default 'pending'  check (status in ('pending','approved','rejected')),
  role        text not null default 'user'     check (role in ('user','admin')),
  created_at  timestamptz not null default now()
);

-- ── Teams (48) ──────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id           int primary key,
  name         text not null,
  code         text not null,
  flag_emoji   text not null default '',
  group_letter text not null check (group_letter in ('A','B','C','D','E','F','G','H','I','J','K','L'))
);

-- ── Matches (72 group + knockout slots) ─────────────────────────────────────
create table if not exists public.matches (
  id            int primary key,
  stage         text not null check (stage in ('group','r32','r16','qf','sf','final')),
  group_letter  text check (group_letter in ('A','B','C','D','E','F','G','H','I','J','K','L')),
  match_no      int not null,
  slot_label    text,
  home_team_id  int references public.teams(id),
  away_team_id  int references public.teams(id),
  kickoff_at    timestamptz,
  home_score    int,
  away_score    int,
  status        text not null default 'scheduled' check (status in ('scheduled','finished'))
);

-- ── Group-stage match predictions ───────────────────────────────────────────
create table if not exists public.match_predictions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  match_id        int  not null references public.matches(id) on delete cascade,
  pick            text not null check (pick in ('HOME','DRAW','AWAY')),
  pred_home_score int,
  pred_away_score int,
  points          int not null default 0,
  unique (user_id, match_id)
);

-- ── Advancement: each group's predicted top 3 (4th place is eliminated) ─────
create table if not exists public.advancement_predictions (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  group_letter   text not null,
  first_team_id  int  not null references public.teams(id),
  second_team_id int  not null references public.teams(id),
  third_team_id  int  references public.teams(id),
  unique (user_id, group_letter)
);

-- ── Advancement: which 8 of the 12 third-place teams the user backs ─────────
create table if not exists public.third_place_predictions (
  id      bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id int  not null references public.teams(id),
  unique (user_id, team_id)
);

-- ── Knockout bracket: who the user advances OUT of each round ────────────────
--  round 'r32' slot 0..15 → winner of R32 match (reaches R16)
--  round 'r16' slot 0..7, 'qf' 0..3, 'sf' 0..1, 'final' 0 → champion
create table if not exists public.bracket_predictions (
  id      bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  round   text not null check (round in ('r32','r16','qf','sf','final')),
  slot    int  not null,
  team_id int  not null references public.teams(id),
  unique (user_id, round, slot)
);

-- ── Per-user submission marker ──────────────────────────────────────────────
create table if not exists public.prediction_submissions (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  submitted_at timestamptz not null default now()
);

-- ── Tracks which finished matches still need an email digest ────────────────
create table if not exists public.pending_results (
  match_id   int primary key references public.matches(id) on delete cascade,
  added_at   timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════
--  Helper functions (SECURITY DEFINER so RLS policies can call them)
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function public.predictions_locked()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select lock_at from public.app_settings where id = 1) <= now(), false);
$$;

-- ════════════════════════════════════════════════════════════════════════
--  New-user trigger: create a profile from auth signup metadata
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_admin_email text;
begin
  select admin_email into v_admin_email from public.app_settings where id = 1;
  insert into public.profiles (id, first_name, last_name, phone, email, status, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.email, ''),
    case when new.email = v_admin_email then 'approved' else 'pending' end,
    case when new.email = v_admin_email then 'admin'    else 'user'    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════
--  Row-Level Security
-- ════════════════════════════════════════════════════════════════════════
alter table public.profiles                enable row level security;
alter table public.teams                   enable row level security;
alter table public.matches                 enable row level security;
alter table public.app_settings            enable row level security;
alter table public.match_predictions       enable row level security;
alter table public.advancement_predictions enable row level security;
alter table public.third_place_predictions enable row level security;
alter table public.bracket_predictions     enable row level security;
alter table public.prediction_submissions  enable row level security;
alter table public.pending_results         enable row level security;

-- Reference data: readable by any authenticated user; writes via service role only.
create policy "teams readable"    on public.teams       for select using (auth.role() = 'authenticated');
create policy "matches readable"  on public.matches     for select using (auth.role() = 'authenticated');
create policy "settings readable" on public.app_settings for select using (auth.role() = 'authenticated');

-- Profiles: see your own; admins see all; approved users see all (names for leaderboard).
create policy "profiles select" on public.profiles for select
  using (id = auth.uid() or public.is_admin() or public.is_approved());
-- A user may update only their own contact fields (never role/status — guarded by trigger below).
create policy "profiles self update" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Prevent non-admins from escalating their own role/status.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only restrict logged-in non-admin users. Trusted server/service-role updates
  -- (admin approvals) have no auth.uid() and are allowed through.
  if auth.uid() is not null and not public.is_admin() then
    new.role   := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_update_trg on public.profiles;
create trigger guard_profile_update_trg
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Generic prediction policies: owner read/write before lock; everyone reads after lock.
do $$
declare t text;
begin
  foreach t in array array[
    'match_predictions','advancement_predictions','third_place_predictions',
    'bracket_predictions','prediction_submissions'
  ] loop
    execute format($f$
      create policy "%1$s owner or post-lock select" on public.%1$s for select
        using (user_id = auth.uid() or (public.predictions_locked() and public.is_approved()));
      create policy "%1$s owner insert" on public.%1$s for insert
        with check (user_id = auth.uid() and public.is_approved() and not public.predictions_locked());
      create policy "%1$s owner update" on public.%1$s for update
        using (user_id = auth.uid() and public.is_approved() and not public.predictions_locked())
        with check (user_id = auth.uid());
      create policy "%1$s owner delete" on public.%1$s for delete
        using (user_id = auth.uid() and public.is_approved() and not public.predictions_locked());
    $f$, t);
  end loop;
end $$;
