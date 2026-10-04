-- CLEAN NEXUS DEMO RESET
-- Data only. Keeps tables, functions and policies.
begin;
delete from public.audit_log;
delete from public.knowledge_sources;
delete from public.simulation_runs;
DO $$ BEGIN IF to_regclass('public.ops_runs') IS NOT NULL THEN delete from public.ops_runs; END IF; END $$;
delete from public.dependencies;
delete from public.tasks;
delete from public.resources;
delete from public.teams;
delete from public.events;
commit;

select 'events' table_name, count(*) from public.events
union all select 'teams', count(*) from public.teams
union all select 'resources', count(*) from public.resources
union all select 'tasks', count(*) from public.tasks
union all select 'dependencies', count(*) from public.dependencies
union all select 'simulation_runs', count(*) from public.simulation_runs
union all select 'knowledge_sources', count(*) from public.knowledge_sources
union all select 'audit_log', count(*) from public.audit_log;
