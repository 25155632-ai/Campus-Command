-- NEXUS//03 quality fixes
-- Run once after v10_final_command_os.sql.
-- These demo-safe policies match the app's current anonymous server client.

alter table public.knowledge_sources enable row level security;
drop policy if exists knowledge_write on public.knowledge_sources;
create policy knowledge_write on public.knowledge_sources
  for all to anon, authenticated using (true) with check (true);

drop policy if exists knowledge_read on public.knowledge_sources;
create policy knowledge_read on public.knowledge_sources
  for select to anon, authenticated using (true);

alter table public.ops_runs enable row level security;
drop policy if exists ops_runs_quality_write on public.ops_runs;
create policy ops_runs_quality_write on public.ops_runs
  for all to anon, authenticated using (true) with check (true);
drop policy if exists ops_runs_quality_read on public.ops_runs;
create policy ops_runs_quality_read on public.ops_runs
  for select to anon, authenticated using (true);

-- Keep governance records visible to the demo command center.
drop policy if exists audit_quality_read on public.audit_log;
create policy audit_quality_read on public.audit_log
  for select to anon, authenticated using (true);
drop policy if exists audit_quality_insert on public.audit_log;
create policy audit_quality_insert on public.audit_log
  for insert to anon, authenticated with check (true);
