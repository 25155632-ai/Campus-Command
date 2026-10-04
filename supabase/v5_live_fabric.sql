-- NEXUS//03 v5 LIVE FABRIC MIGRATION
-- Run this once on an existing Supabase project.
-- Safe to rerun.

alter table public.events replica identity full;
alter table public.tasks replica identity full;
alter table public.teams replica identity full;
alter table public.resources replica identity full;
alter table public.dependencies replica identity full;

drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select to anon, authenticated using (true);
drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams for all to authenticated using (true) with check (true);

drop policy if exists resources_read on public.resources;
create policy resources_read on public.resources for select to anon, authenticated using (true);
drop policy if exists resources_write on public.resources;
create policy resources_write on public.resources for all to authenticated using (true) with check (true);

do $$
declare t text;
begin
  foreach t in array array['events','tasks','teams','resources','dependencies'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Expand the demo graph for the venue-change scenario.
do $$
declare e uuid; t1 uuid; t2 uuid; rHall uuid; rHdmi uuid; tmVol uuid;
begin
  select id into e from public.events where name='KBC CodeRush 2026' limit 1;
  select id into t1 from public.tasks where title='Re-route robotics volunteers' and event_id=e limit 1;
  select id into t2 from public.tasks where title='Notify registered participants' and event_id=e limit 1;
  select id into rHall from public.resources where name='Hall B' limit 1;
  select id into rHdmi from public.resources where name='HDMI capture kit' limit 1;
  select id into tmVol from public.teams where name='Volunteers' limit 1;

  if e is not null and rHall is not null and t1 is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'resource',rHall,'task',t1,'venue change → volunteer dispatch')
    on conflict do nothing;
  end if;
  if e is not null and t1 is not null and t2 is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'task',t1,'task',t2,'dispatch → participant communication')
    on conflict do nothing;
  end if;
  if e is not null and t1 is not null and tmVol is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'task',t1,'team',tmVol,'dispatch → volunteer team')
    on conflict do nothing;
  end if;
  if e is not null and rHall is not null and rHdmi is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'resource',rHall,'resource',rHdmi,'venue → capture equipment')
    on conflict do nothing;
  end if;
end $$;

-- v5.1 INCIDENT COMMAND hardening
alter table public.ops_runs replica identity full;
create index if not exists dependencies_event_source_idx on public.dependencies(event_id, source_id);
create index if not exists dependencies_event_target_idx on public.dependencies(event_id, target_id);
create index if not exists tasks_event_status_idx on public.tasks(event_id, status);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='ops_runs'
  ) then
    alter publication supabase_realtime add table public.ops_runs;
  end if;
end $$;


-- v6 BOSS FIGHT DEMO ACCESS
-- This local/competition demo intentionally permits the anon browser role to
-- perform the command-center mutations after the UI's human approval gate.
-- For production, replace these policies with authenticated role-based policies.

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
