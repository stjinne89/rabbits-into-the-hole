-- Gamification: rabbits earn a candy ("snoepje") when they are near each other.
-- A pair can score once per hour; candies are tallied per rabbit breed.

create table if not exists public.encounters (
  id         bigint generated always as identity primary key,
  user_low   uuid not null references public.profiles (id) on delete cascade,
  user_high  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists encounters_pair_time_idx
  on public.encounters (user_low, user_high, created_at desc);

create table if not exists public.candies (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  breed_id     int references public.rabbit_breeds (id),
  source       text not null default 'encounter',
  encounter_id bigint references public.encounters (id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index if not exists candies_breed_idx on public.candies (breed_id);
create index if not exists candies_user_idx on public.candies (user_id);

-- Proximity + award logic. Runs for every location write (OwnTracks or sim).
create or replace function public.award_encounters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other   record;
  dist_m  double precision;
  ulow    uuid;
  uhigh   uuid;
  enc_id  bigint;
  radius  constant double precision := 10;   -- metres = "together"
begin
  for other in
    select l.user_id, l.lat, l.lon
    from public.locations l
    where l.user_id <> new.user_id
      and l.updated_at > now() - interval '15 minutes'
  loop
    -- Haversine distance in metres.
    dist_m := 2 * 6371000 * asin(sqrt(
      power(sin(radians(other.lat - new.lat) / 2), 2) +
      cos(radians(new.lat)) * cos(radians(other.lat)) *
      power(sin(radians(other.lon - new.lon) / 2), 2)
    ));

    if dist_m <= radius then
      ulow  := least(new.user_id, other.user_id);
      uhigh := greatest(new.user_id, other.user_id);

      -- This pair may earn at most once per hour.
      if not exists (
        select 1 from public.encounters e
        where e.user_low = ulow and e.user_high = uhigh
          and e.created_at > now() - interval '1 hour'
      ) then
        insert into public.encounters (user_low, user_high)
        values (ulow, uhigh)
        returning id into enc_id;

        insert into public.candies (user_id, breed_id, source, encounter_id)
        select ulow,  (select rabbit_breed_id from public.profiles where id = ulow),
               'encounter', enc_id
        union all
        select uhigh, (select rabbit_breed_id from public.profiles where id = uhigh),
               'encounter', enc_id;
      end if;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists on_location_award on public.locations;
create trigger on_location_award
  after insert or update on public.locations
  for each row execute function public.award_encounters();

-- Leaderboard: candies per breed (runs with the caller's RLS).
create or replace view public.breed_scores
with (security_invoker = on) as
  select b.id, b.name, b.image_url, b.marker_color,
         count(c.id)::int as candies
  from public.rabbit_breeds b
  left join public.candies c on c.breed_id = b.id
  group by b.id, b.name, b.image_url, b.marker_color;

-- RLS
alter table public.encounters enable row level security;
alter table public.candies    enable row level security;

-- Candies are readable by any logged-in member (shared leaderboard).
-- Inserts happen only via the SECURITY DEFINER trigger, so no write policy.
create policy "candies readable" on public.candies
  for select to authenticated using (true);

grant select on public.breed_scores to authenticated;

-- Live leaderboard updates.
alter publication supabase_realtime add table public.candies;
