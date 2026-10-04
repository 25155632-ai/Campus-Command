-- NEXUS//03 v6 BOSS FIGHT DEMO ACCESS PATCH
-- Run this once in Supabase SQL Editor for the local/competition demo.
-- It intentionally allows the browser anon role to commit after the app's human approval gate.
-- For production, use authenticated role-based policies instead.

DO $$
BEGIN
  -- These tables are mutated by the incident command commit route.
  NULL;
END $$;

drop policy if exists events_write on public.events;
create policy events_write on public.events for all to anon, authenticated using (true) with check (true);
drop policy if exists tasks_write on public.tasks;
create policy tasks_write on public.tasks for all to anon, authenticated using (true) with check (true);
drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams for all to anon, authenticated using (true) with check (true);
drop policy if exists resources_write on public.resources;
create policy resources_write on public.resources for all to anon, authenticated using (true) with check (true);
drop policy if exists deps_write on public.dependencies;
create policy deps_write on public.dependencies for all to anon, authenticated using (true) with check (true);
drop policy if exists knowledge_write on public.knowledge_sources;
create policy knowledge_write on public.knowledge_sources for all to anon, authenticated using (true) with check (true);

drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to anon, authenticated using (true);
drop policy if exists audit_write on public.audit_log;
create policy audit_write on public.audit_log for insert to anon, authenticated with check (true);

drop policy if exists simulations_read on public.simulation_runs;
create policy simulations_read on public.simulation_runs for select to anon, authenticated using (true);
drop policy if exists simulations_write on public.simulation_runs;
create policy simulations_write on public.simulation_runs for insert to anon, authenticated with check (true);

drop policy if exists ops_runs_read on public.ops_runs;
create policy ops_runs_read on public.ops_runs for select to anon, authenticated using (true);
drop policy if exists ops_runs_write on public.ops_runs;
create policy ops_runs_write on public.ops_runs for all to anon, authenticated using (true) with check (true);

-- Realtime for the execution ledger.
alter table public.ops_runs replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='ops_runs'
  ) then
    alter publication supabase_realtime add table public.ops_runs;
  end if;
end $$;
