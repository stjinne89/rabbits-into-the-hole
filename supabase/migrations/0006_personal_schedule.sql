-- Personal festival programme: a rabbit can pin itself to any imported act.

create table if not exists public.user_act_selections (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  act_id     bigint not null references public.acts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, act_id)
);

create index if not exists user_act_selections_act_idx
  on public.user_act_selections (act_id);

alter table public.user_act_selections enable row level security;

create policy "members read own act selections"
  on public.user_act_selections
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "members create own act selections"
  on public.user_act_selections
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "members delete own act selections"
  on public.user_act_selections
  for delete
  to authenticated
  using (user_id = auth.uid());
