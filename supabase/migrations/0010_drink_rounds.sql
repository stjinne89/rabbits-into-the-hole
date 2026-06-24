-- Shared realtime drink rounds. All writes go through guarded RPC functions;
-- authenticated members can read the menu, active round and its selections.

create table if not exists public.drink_items (
  id         int generated always as identity primary key,
  name       text not null,
  category   text not null,
  sort_order int not null default 0,
  active     boolean not null default true
);

create unique index if not exists drink_items_name_unique_idx
  on public.drink_items (lower(name));

create table if not exists public.drink_rounds (
  id            uuid primary key default gen_random_uuid(),
  collector_id  uuid not null references public.profiles (id) on delete restrict,
  status        text not null default 'open'
                check (status in ('open', 'collecting', 'completed')),
  created_at    timestamptz not null default now(),
  collecting_at timestamptz,
  completed_at  timestamptz,
  constraint drink_round_status_timestamps check (
    (status = 'open' and collecting_at is null and completed_at is null)
    or
    (status = 'collecting' and collecting_at is not null and completed_at is null)
    or
    (status = 'completed' and collecting_at is not null and completed_at is not null)
  )
);

-- PostgreSQL partial uniqueness guarantees that even simultaneous starts can
-- produce only one active round.
create unique index if not exists drink_rounds_one_active_idx
  on public.drink_rounds ((true))
  where status in ('open', 'collecting');

create index if not exists drink_rounds_created_idx
  on public.drink_rounds (created_at desc);

create table if not exists public.drink_round_selections (
  round_id      uuid not null references public.drink_rounds (id) on delete cascade,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  drink_item_id int not null references public.drink_items (id) on delete restrict,
  quantity      int not null check (quantity between 1 and 20),
  updated_by    uuid not null references public.profiles (id) on delete restrict,
  updated_at    timestamptz not null default now(),
  primary key (round_id, recipient_id, drink_item_id)
);

create index if not exists drink_round_selections_recipient_idx
  on public.drink_round_selections (round_id, recipient_id);

-- Keep obsolete seed items available for historic rounds, but hide them from
-- the current menu when this seed is re-run.
update public.drink_items set active = false;

insert into public.drink_items (name, category, sort_order) values
  ('Birra Moretti klein',  'Bier', 10),
  ('Birra Moretti groot',  'Bier', 20),
  ('Desperados',           'Bier', 30),
  ('Coca-Cola',            'Fris', 40),
  ('Fanta',                'Fris', 50),
  ('Sprite',               'Fris', 60),
  ('Fuze Tea',             'Fris', 70),
  ('Red Bull',             'Fris', 80),
  ('Water still',          'Water', 90),
  ('Water sparkling',      'Water', 100),
  ('STËLZ Hard Seltzer',   'Mixdrank', 110),
  ('STËLZ Hard Ice Tea',   'Mixdrank', 120),
  ('Baco',                 'Mixdrank', 130),
  ('Absolut Sprite',       'Mixdrank', 140),
  ('Wijn rosé',            'Wijn', 150),
  ('Wijn wit',             'Wijn', 160)
on conflict (lower(name)) do update set
  category = excluded.category,
  sort_order = excluded.sort_order,
  active = true;

alter table public.drink_items enable row level security;
alter table public.drink_rounds enable row level security;
alter table public.drink_round_selections enable row level security;

create policy "drink items readable"
  on public.drink_items
  for select
  to authenticated
  using (true);

create policy "drink rounds readable"
  on public.drink_rounds
  for select
  to authenticated
  using (true);

create policy "drink selections readable"
  on public.drink_round_selections
  for select
  to authenticated
  using (true);

create or replace function public.start_drink_round()
returns public.drink_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.drink_rounds;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn om een rondje te starten.';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Maak eerst je profiel af.';
  end if;

  insert into public.drink_rounds (collector_id)
  values (auth.uid())
  returning * into result;

  return result;
exception
  when unique_violation then
    raise exception 'Er staat al een rondje open.';
end;
$$;

create or replace function public.change_drink_quantity(
  p_round_id uuid,
  p_recipient_id uuid,
  p_drink_item_id int,
  p_delta int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  new_quantity int;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn om een drankje toe te voegen.';
  end if;

  if p_delta not in (-1, 1) then
    raise exception 'De hoeveelheid kan alleen met één worden aangepast.';
  end if;

  -- Serialise changes to the same person/drink combination so simultaneous
  -- taps from multiple phones cannot overwrite one another.
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_round_id::text || ':' || p_recipient_id::text || ':' || p_drink_item_id::text,
      0
    )
  );

  select status
  into current_status
  from public.drink_rounds
  where id = p_round_id
  for update;

  if current_status is null then
    raise exception 'Dit rondje bestaat niet meer.';
  end if;
  if current_status <> 'open' then
    raise exception 'Dit rondje is al vergrendeld.';
  end if;
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'Dit konijn bestaat niet.';
  end if;
  if not exists (
    select 1 from public.drink_items
    where id = p_drink_item_id and active = true
  ) then
    raise exception 'Dit drankje staat niet op de kaart.';
  end if;

  if p_delta = 1 then
    if exists (
      select 1
      from public.drink_round_selections
      where round_id = p_round_id
        and recipient_id = p_recipient_id
        and drink_item_id = p_drink_item_id
        and quantity >= 20
    ) then
      raise exception 'Je kunt maximaal twintig dezelfde drankjes toevoegen.';
    end if;

    insert into public.drink_round_selections (
      round_id,
      recipient_id,
      drink_item_id,
      quantity,
      updated_by
    )
    values (p_round_id, p_recipient_id, p_drink_item_id, 1, auth.uid())
    on conflict (round_id, recipient_id, drink_item_id)
    do update set
      quantity = public.drink_round_selections.quantity + 1,
      updated_by = auth.uid(),
      updated_at = now()
    returning quantity into new_quantity;
  else
    delete from public.drink_round_selections
    where round_id = p_round_id
      and recipient_id = p_recipient_id
      and drink_item_id = p_drink_item_id
      and quantity = 1
    returning 0 into new_quantity;

    if not found then
      update public.drink_round_selections
      set
        quantity = quantity - 1,
        updated_by = auth.uid(),
        updated_at = now()
      where round_id = p_round_id
        and recipient_id = p_recipient_id
        and drink_item_id = p_drink_item_id
        and quantity > 1
      returning quantity into new_quantity;
    end if;

    new_quantity := coalesce(new_quantity, 0);
  end if;

  return new_quantity;
end;
$$;

create or replace function public.advance_drink_round(p_round_id uuid)
returns public.drink_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  current_round public.drink_rounds;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn om het rondje af te ronden.';
  end if;

  select *
  into current_round
  from public.drink_rounds
  where id = p_round_id
  for update;

  if current_round.id is null then
    raise exception 'Dit rondje bestaat niet meer.';
  end if;
  if current_round.collector_id <> auth.uid() then
    raise exception 'Alleen de haler kan deze stap uitvoeren.';
  end if;

  if current_round.status = 'open' then
    update public.drink_rounds
    set status = 'collecting', collecting_at = now()
    where id = p_round_id
    returning * into current_round;
  elsif current_round.status = 'collecting' then
    update public.drink_rounds
    set status = 'completed', completed_at = now()
    where id = p_round_id
    returning * into current_round;
  else
    raise exception 'Dit rondje is al afgerond.';
  end if;

  return current_round;
end;
$$;

create or replace function public.add_drink_item(
  p_name text,
  p_category text
)
returns public.drink_items
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := btrim(p_name);
  clean_category text := btrim(p_category);
  result public.drink_items;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn om een drankje toe te voegen.';
  end if;
  if char_length(clean_name) not between 2 and 60 then
    raise exception 'Geef een dranknaam van 2 tot 60 tekens op.';
  end if;
  if clean_category not in ('Bier', 'Fris', 'Water', 'Mixdrank', 'Wijn', 'Overig') then
    raise exception 'Kies een geldige categorie.';
  end if;

  select *
  into result
  from public.drink_items
  where lower(name) = lower(clean_name);

  if result.id is not null then
    update public.drink_items
    set active = true
    where id = result.id
    returning * into result;
    return result;
  end if;

  insert into public.drink_items (name, category, sort_order)
  values (
    clean_name,
    clean_category,
    coalesce((select max(sort_order) + 10 from public.drink_items), 10)
  )
  returning * into result;

  return result;
exception
  when unique_violation then
    select *
    into result
    from public.drink_items
    where lower(name) = lower(clean_name);
    return result;
end;
$$;

revoke all on function public.start_drink_round() from public, anon;
revoke all on function public.change_drink_quantity(uuid, uuid, int, int)
  from public, anon;
revoke all on function public.advance_drink_round(uuid) from public, anon;
revoke all on function public.add_drink_item(text, text) from public, anon;

grant execute on function public.start_drink_round() to authenticated;
grant execute on function public.change_drink_quantity(uuid, uuid, int, int)
  to authenticated;
grant execute on function public.advance_drink_round(uuid) to authenticated;
grant execute on function public.add_drink_item(text, text) to authenticated;

alter publication supabase_realtime add table public.drink_items;
alter publication supabase_realtime add table public.drink_rounds;
alter publication supabase_realtime add table public.drink_round_selections;
