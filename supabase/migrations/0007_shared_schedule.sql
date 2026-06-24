-- Let authenticated festival members see which rabbits selected each act.
-- Members can still only add or remove their own selections.

drop policy if exists "members read own act selections"
  on public.user_act_selections;

create policy "members read all act selections"
  on public.user_act_selections
  for select
  to authenticated
  using (true);

alter publication supabase_realtime
  add table public.user_act_selections;
