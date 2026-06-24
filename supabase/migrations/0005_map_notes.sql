-- Shared map notes. Notes without expires_at are permanent; temporary notes
-- disappear from the app after the member-selected date and time.

create table if not exists public.map_notes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  text       text not null check (
    char_length(btrim(text)) between 1 and 280
  ),
  map_x      double precision not null check (map_x between 0 and 3500),
  map_y      double precision not null check (map_y between 0 and 3500),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint map_notes_expiry_after_creation check (
    expires_at is null or expires_at > created_at
  )
);

create index if not exists map_notes_active_idx
  on public.map_notes (expires_at, created_at desc);

create index if not exists map_notes_user_idx
  on public.map_notes (user_id);

alter table public.map_notes enable row level security;

create policy "map notes readable"
  on public.map_notes
  for select
  to authenticated
  using (expires_at is null or expires_at > now());

create policy "members create own map notes"
  on public.map_notes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (expires_at is null or expires_at > now())
  );

create policy "members delete own map notes"
  on public.map_notes
  for delete
  to authenticated
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.map_notes;
