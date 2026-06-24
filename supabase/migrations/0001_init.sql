-- Rabbits into the Hole — initial schema
-- Run with `supabase db push` or paste into the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.rabbit_breeds (
  id            int generated always as identity primary key,
  name          text not null,
  image_url     text not null,
  marker_color  text not null default '#7c3aed'
);

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text not null,
  rabbit_breed_id int references public.rabbit_breeds (id),
  avatar_url      text,
  share_location  boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.owntracks_devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  username    text not null unique,
  secret_hash text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.locations (
  -- references profiles (not auth.users) so PostgREST can embed the owner's profile/breed
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  lat        double precision not null,
  lon        double precision not null,
  accuracy   double precision,
  battery    int,
  tst        bigint not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.stages (
  id         int generated always as identity primary key,
  name       text not null unique,
  lat        double precision not null,
  lon        double precision not null,
  color      text not null default '#16a34a',
  sort_order int not null default 0
);

create table if not exists public.acts (
  id             bigint generated always as identity primary key,
  stage_id       int not null references public.stages (id) on delete cascade,
  artist_name    text not null,
  start_time     timestamptz not null,
  end_time       timestamptz not null,
  clashfinder_id text unique
);

create index if not exists acts_stage_time_idx on public.acts (stage_id, start_time);

-- ---------------------------------------------------------------------------
-- New-user trigger: create a profile row automatically on signup.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'konijn'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.rabbit_breeds     enable row level security;
alter table public.profiles          enable row level security;
alter table public.owntracks_devices enable row level security;
alter table public.locations         enable row level security;
alter table public.stages            enable row level security;
alter table public.acts              enable row level security;

-- Reference data: any authenticated user may read.
create policy "breeds readable" on public.rabbit_breeds
  for select to authenticated using (true);
create policy "stages readable" on public.stages
  for select to authenticated using (true);
create policy "acts readable" on public.acts
  for select to authenticated using (true);

-- Profiles: everyone (authenticated) can read; you can only write your own.
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Locations: readable when the owner shares (or it's your own row).
-- Writes happen only through the service-role ingest endpoint (no client policy).
create policy "locations readable when shared" on public.locations
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = locations.user_id and p.share_location = true
    )
  );

-- OwnTracks devices: a user may see their own device metadata.
create policy "devices select own" on public.owntracks_devices
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime: broadcast location changes to subscribed clients.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.locations;
