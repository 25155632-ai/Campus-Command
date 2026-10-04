-- NEXUS//03 FINAL DEMO ACCESS PATCH
-- The prototype has no login screen, so its server-side Supabase client runs as anon.
-- These policies are intentionally permissive for the competition demo.
-- Do NOT use this policy set unchanged for a production multi-user deployment.

begin;

alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.resources enable row level security;
alter table public.tasks enable row level security;
alter table public.dependencies enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.audit_log enable row level security;
alter table public.simulation_runs enable row level security;

-- Core operational records
 drop policy if exists events_write on public.events;
 create policy events_write on public.events for all to anon, authenticated using (true) with check (true);
 drop policy if exists teams_write on public.teams;
 create policy teams_write on public.teams for all to anon, authenticated using (true) with check (true);
 drop policy if exists resources_write on public.resources;
 create policy resources_write on public.resources for all to anon, authenticated using (true) with check (true);
 drop policy if exists tasks_write on public.tasks;
 create policy tasks_write on public.tasks for all to anon, authenticated using (true) with check (true);
 drop policy if exists deps_write on public.dependencies;
 create policy deps_write on public.dependencies for all to anon, authenticated using (true) with check (true);
 drop policy if exists knowledge_write on public.knowledge_sources;
 create policy knowledge_write on public.knowledge_sources for all to anon, authenticated using (true) with check (true);

-- Audit and simulation are also written by the anonymous demo client.
 drop policy if exists audit_read on public.audit_log;
 create policy audit_read on public.audit_log for select to anon, authenticated using (true);
 drop policy if exists audit_write on public.audit_log;
 create policy audit_write on public.audit_log for insert to anon, authenticated with check (true);
 drop policy if exists simulations_read on public.simulation_runs;
 create policy simulations_read on public.simulation_runs for select to anon, authenticated using (true);
 drop policy if exists simulations_write on public.simulation_runs;
 create policy simulations_write on public.simulation_runs for all to anon, authenticated using (true) with check (true);

-- Ops runs used by Autopilot.
DO $$
BEGIN
  IF to_regclass('public.ops_runs') IS NOT NULL THEN
    ALTER TABLE public.ops_runs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS ops_runs_read ON public.ops_runs;
    CREATE POLICY ops_runs_read ON public.ops_runs FOR SELECT TO anon, authenticated USING (true);
    DROP POLICY IF EXISTS ops_runs_write ON public.ops_runs;
    CREATE POLICY ops_runs_write ON public.ops_runs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

commit;
