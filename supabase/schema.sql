-- NEXUS//03 v2 — Supabase/Postgres schema.
-- Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.events (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 type text not null default 'Event',
 venue text not null,
 start_at timestamptz not null,
 end_at timestamptz,
 status text not null default 'planned' check (status in ('planned','live','completed','cancelled')),
 risk text not null default 'low' check (risk in ('low','medium','high','critical')),
 participants integer not null default 0,
 capacity integer not null default 0,
 notion_page_id text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.teams (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 role text not null default 'operations',
 member_count integer not null default 0,
 coverage integer not null default 100,
 skills text[] not null default '{}',
 created_at timestamptz not null default now()
);

create table if not exists public.resources (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 kind text not null,
 location text,
 status text not null default 'available',
 quantity integer not null default 1,
 created_at timestamptz not null default now()
);

create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),
 event_id uuid references public.events(id) on delete cascade,
 title text not null,
 owner text,
 status text not null default 'todo' check (status in ('todo','progress','blocked','done')),
 due_at timestamptz,
 impact_area text,
 priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.dependencies (
 id uuid primary key default gen_random_uuid(),
 event_id uuid references public.events(id) on delete cascade,
 source_type text not null,
 source_id uuid not null,
 target_type text not null,
 target_id uuid not null,
 relation text not null,
 created_at timestamptz not null default now(),
 unique(source_id,target_id,relation)
);

create table if not exists public.knowledge_sources (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 source_type text not null,
 source_url text,
 content text not null,
 metadata jsonb not null default '{}',
 verified boolean not null default false,
 notion_page_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table if exists public.knowledge_sources add column if not exists metadata jsonb not null default '{}';

create table if not exists public.simulation_runs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id) on delete set null,
 event_id uuid references public.events(id) on delete set null,
 change_type text not null,
 proposed_value text not null,
 risk text not null,
 impact_count integer not null default 0,
 conflicts integer not null default 0,
 result jsonb not null default '{}',
 created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id) on delete set null,
 action text not null,
 entity_type text not null,
 entity_id uuid,
 payload jsonb not null default '{}',
 created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events for each row execute function public.set_updated_at();
drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists knowledge_updated_at on public.knowledge_sources;
create trigger knowledge_updated_at before update on public.knowledge_sources for each row execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.resources enable row level security;
alter table public.tasks enable row level security;
alter table public.dependencies enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.audit_log enable row level security;
alter table public.simulation_runs enable row level security;

-- Demo-friendly policies. Tighten these for production role isolation.
drop policy if exists events_read on public.events; create policy events_read on public.events for select to anon, authenticated using (true);
drop policy if exists events_write on public.events; create policy events_write on public.events for all to authenticated using (true) with check (true);
drop policy if exists tasks_read on public.tasks; create policy tasks_read on public.tasks for select to anon, authenticated using (true);
drop policy if exists tasks_write on public.tasks; create policy tasks_write on public.tasks for all to authenticated using (true) with check (true);
drop policy if exists teams_read on public.teams; create policy teams_read on public.teams for select to anon, authenticated using (true);
drop policy if exists teams_write on public.teams; create policy teams_write on public.teams for all to authenticated using (true) with check (true);
drop policy if exists resources_read on public.resources; create policy resources_read on public.resources for select to anon, authenticated using (true);
drop policy if exists resources_write on public.resources; create policy resources_write on public.resources for all to authenticated using (true) with check (true);
drop policy if exists deps_read on public.dependencies; create policy deps_read on public.dependencies for select to anon, authenticated using (true);
drop policy if exists deps_write on public.dependencies; create policy deps_write on public.dependencies for all to authenticated using (true) with check (true);
drop policy if exists knowledge_read on public.knowledge_sources; create policy knowledge_read on public.knowledge_sources for select to anon, authenticated using (true);
drop policy if exists knowledge_write on public.knowledge_sources; create policy knowledge_write on public.knowledge_sources for all to authenticated using (true) with check (true);
drop policy if exists audit_read on public.audit_log; create policy audit_read on public.audit_log for select to authenticated using (true);
drop policy if exists audit_write on public.audit_log; create policy audit_write on public.audit_log for insert to authenticated with check (true);
drop policy if exists simulations_read on public.simulation_runs; create policy simulations_read on public.simulation_runs for select to authenticated using (true);
drop policy if exists simulations_write on public.simulation_runs; create policy simulations_write on public.simulation_runs for insert to authenticated with check (true);

insert into public.events(name,type,venue,start_at,end_at,status,risk,participants,capacity)
select * from (values
('KBC CodeRush 2026','Hackathon','Innovation Arena','2026-10-18T09:00:00+05:30'::timestamptz,'2026-10-18T21:00:00+05:30'::timestamptz,'live','medium',184,240),
('AI Research Sprint','Research','Lab Block C','2026-10-21T10:00:00+05:30'::timestamptz,'2026-10-21T18:00:00+05:30'::timestamptz,'planned','low',62,80),
('Tech Fest Main Stage','Conference','Main Auditorium','2026-11-04T08:30:00+05:30'::timestamptz,'2026-11-04T20:00:00+05:30'::timestamptz,'planned','high',620,700)
) v(name,type,venue,start_at,end_at,status,risk,participants,capacity)
where not exists (select 1 from public.events e where e.name=v.name);

insert into public.teams(name,role,member_count,coverage,skills) values
('Operations','operations',8,100,array['planning','dispatch','escalation']),
('Technical','technical',9,78,array['AV','network','power','stage']),
('Marketing','marketing',5,100,array['comms','social','design']),
('Registration','registration',4,100,array['check-in','badges','support']),
('Volunteers','volunteers',37,84,array['crowd','logistics','hospitality'])
on conflict (name) do nothing;

insert into public.resources(name,kind,location,status,quantity) values
('Main Auditorium','venue','North Block','reserved',1),('Hall B','venue','North Block','available',1),('HDMI capture kit','equipment','Tech Store','available',8),('Backup power','utility','Main Auditorium','ready',2)
on conflict do nothing;

insert into public.knowledge_sources(title,source_type,content,verified) values
('Hall B allocation','record','Hall B can host robotics sessions and requires a technical operator plus volunteer dispatch.',true),
('Volunteer roster v4','record','Technical coverage is 7 of 9 target operators; volunteer coverage is 31 of 37 for the current event.',true),
('Hackathon run-of-show','notion','KBC CodeRush opens at 09:00. Robotics block uses the primary technical bay. Speaker arrival window begins at 14:30.',true)
on conflict do nothing;

insert into public.tasks(event_id,title,owner,status,due_at,impact_area,priority)
select e.id, v.title,v.owner,v.status,v.due_at,v.impact_area,v.priority
from public.events e cross join (values
('Re-route robotics volunteers','Operations','blocked','2026-10-04T12:00:00+05:30'::timestamptz,'venue change','high'),
('Notify registered participants','Comms','todo','2026-10-05T15:00:00+05:30'::timestamptz,'participant comms','high'),
('Confirm speaker arrival windows','Hospitality','progress','2026-10-05T17:00:00+05:30'::timestamptz,'schedule','medium'),
('Inventory HDMI capture kits','Technical','done','2026-10-03T11:00:00+05:30'::timestamptz,'equipment','medium')
) v(title,owner,status,due_at,impact_area,priority)
where e.name='KBC CodeRush 2026'
and not exists(select 1 from public.tasks t where t.title=v.title and t.event_id=e.id);

-- Seed a small but real dependency graph for the demo.
do $$
declare e uuid; t1 uuid; t2 uuid; r1 uuid; team1 uuid;
begin
 select id into e from public.events where name='KBC CodeRush 2026' limit 1;
 select id into t1 from public.tasks where title='Re-route robotics volunteers' and event_id=e limit 1;
 select id into t2 from public.tasks where title='Notify registered participants' and event_id=e limit 1;
 select id into r1 from public.resources where name='Hall B' limit 1;
 select id into team1 from public.teams where name='Volunteers' limit 1;
 if e is not null and r1 is not null and t1 is not null then
   insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation) values
   (e,'resource',r1,'task',t1,'venue change → volunteer dispatch') on conflict do nothing;
 end if;
 if e is not null and t1 is not null and t2 is not null then
   insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation) values
   (e,'task',t1,'task',t2,'dispatch → participant communication') on conflict do nothing;
 end if;
end $$;


-- v4 autonomous operations layer
create table if not exists public.ops_policies (
 id uuid primary key default gen_random_uuid(),
 name text unique not null,
 role text not null,
 max_risk_to_auto_apply text not null default 'low',
 requires_human_approval boolean not null default true,
 allowed_actions text[] not null default '{}',
 created_at timestamptz not null default now()
);
create table if not exists public.ops_runs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id) on delete set null,
 trigger_type text not null,
 trigger_id text not null,
 mode text not null default 'simulate',
 risk text not null,
 impact_count integer not null default 0,
 status text not null default 'proposed',
 plan jsonb not null default '{}',
 approved_at timestamptz,
 committed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.ops_policies enable row level security;
alter table public.ops_runs enable row level security;
drop policy if exists ops_policy_read on public.ops_policies; create policy ops_policy_read on public.ops_policies for select to anon, authenticated using (true);
drop policy if exists ops_policy_write on public.ops_policies; create policy ops_policy_write on public.ops_policies for all to authenticated using (true) with check (true);
drop policy if exists ops_runs_read on public.ops_runs; create policy ops_runs_read on public.ops_runs for select to authenticated using (true);
drop policy if exists ops_runs_write on public.ops_runs; create policy ops_runs_write on public.ops_runs for all to authenticated using (true) with check (true);
insert into public.ops_policies(name,role,max_risk_to_auto_apply,requires_human_approval,allowed_actions) values
('Operations Lead','operations','medium',true,array['reassign','notify','escalate','simulate']),
('Technical Lead','technical','low',true,array['reassign','equipment_check','simulate']),
('Incident Commander','leadership','high',true,array['reassign','notify','escalate','simulate','commit'])
on conflict(name) do nothing;


-- v5 live operational fabric
-- Enable full row payloads so the browser can refresh immediately after writes.
alter table public.events replica identity full;
alter table public.tasks replica identity full;
alter table public.teams replica identity full;
alter table public.resources replica identity full;
alter table public.dependencies replica identity full;

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

-- Expand the demo graph so a venue change has a visible multi-hop blast radius.
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
