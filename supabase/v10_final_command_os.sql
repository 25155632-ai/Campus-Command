-- NEXUS//03 FINAL COMMAND OS
-- Run once in Supabase SQL Editor after the existing schema/v9 migration.
-- This migration upgrades the boss-fight transaction, adds six incident classes,
-- persists post-incident knowledge, and exposes demo-safe execution through RPC.

create extension if not exists pgcrypto;

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

alter table public.ops_runs enable row level security;
drop policy if exists ops_runs_final_read on public.ops_runs;
create policy ops_runs_final_read on public.ops_runs for select to anon, authenticated using (true);

alter table public.audit_log enable row level security;
drop policy if exists audit_final_read on public.audit_log;
create policy audit_final_read on public.audit_log for select to anon, authenticated using (true);
drop policy if exists audit_final_insert on public.audit_log;
create policy audit_final_insert on public.audit_log for insert to anon, authenticated with check (true);

alter table public.simulation_runs enable row level security;
drop policy if exists simulations_final_read on public.simulation_runs;
create policy simulations_final_read on public.simulation_runs for select to anon, authenticated using (true);
drop policy if exists simulations_final_insert on public.simulation_runs;
create policy simulations_final_insert on public.simulation_runs for insert to anon, authenticated with check (true);

alter table public.events replica identity full;
alter table public.tasks replica identity full;
alter table public.teams replica identity full;
alter table public.resources replica identity full;
alter table public.dependencies replica identity full;
alter table public.ops_runs replica identity full;
alter table public.audit_log replica identity full;

-- Realtime publication is idempotent.
do $$
declare
  _table text;
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    foreach _table in array array['events','tasks','teams','resources','dependencies','ops_runs','audit_log'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', _table);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;

-- Drop the previous overloaded RPC so PostgREST cannot choose the wrong signature.
drop function if exists public.nexus_commit_incident(uuid,text,uuid,text,text,integer,uuid[]);
drop function if exists public.nexus_commit_incident(uuid,text,uuid,text,text,integer,text[]);

create or replace function public.nexus_commit_incident(
  p_event_id uuid,
  p_incident_type text,
  p_target_id uuid default null,
  p_proposed_venue text default null,
  p_risk text default 'medium',
  p_impact_count integer default 0,
  p_task_ids text[] default '{}'
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.events%rowtype;
  v_resource public.resources%rowtype;
  v_new_resource public.resources%rowtype;
  v_team public.teams%rowtype;
  v_task public.tasks%rowtype;
  v_previous_venue text;
  v_summary text;
  v_touched uuid[] := '{}';
  v_requested uuid[] := '{}';
  v_id text;
  v_run uuid;
  v_knowledge uuid;
  v_now timestamptz := now();
  v_task_count integer := 0;
  v_plan jsonb;
begin
  if p_event_id is null then raise exception 'eventId is required'; end if;
  if p_incident_type not in ('venue','resource','team','volunteer','task_delay','network') then
    raise exception 'Unsupported incident type: %', p_incident_type;
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then raise exception 'Event not found'; end if;
  v_previous_venue := v_event.venue;

  foreach v_id in array coalesce(p_task_ids, '{}') loop
    begin
      v_requested := array_append(v_requested, v_id::uuid);
    exception when invalid_text_representation then
      null;
    end;
  end loop;

  if p_incident_type = 'venue' then
    if nullif(trim(coalesce(p_proposed_venue,'')), '') is null then raise exception 'Proposed venue is required'; end if;
    if lower(trim(v_event.venue)) = lower(trim(p_proposed_venue)) then raise exception 'The event is already at that venue'; end if;

    update public.events
      set venue = trim(p_proposed_venue),
          risk = case when p_risk in ('low','medium','high','critical') then p_risk else risk end,
          updated_at = v_now
      where id = p_event_id;

    select * into v_resource from public.resources
      where kind='venue' and lower(name)=lower(v_previous_venue)
      order by created_at asc limit 1;
    select * into v_new_resource from public.resources
      where kind='venue' and lower(name)=lower(trim(p_proposed_venue))
      order by created_at asc limit 1;
    if v_resource.id is not null then update public.resources set status='available' where id=v_resource.id; end if;
    if v_new_resource.id is not null then update public.resources set status='reserved' where id=v_new_resource.id; end if;
    v_summary := format('%s → %s', v_previous_venue, trim(p_proposed_venue));

  elsif p_incident_type = 'resource' or p_incident_type = 'network' then
    select * into v_resource from public.resources where id=p_target_id for update;
    if not found then raise exception 'Resource not found'; end if;
    update public.resources set status='offline' where id=v_resource.id;
    v_summary := case when p_incident_type='network'
      then format('%s offline → activate backup connectivity', v_resource.name)
      else format('%s marked offline', v_resource.name) end;

  elsif p_incident_type = 'team' or p_incident_type = 'volunteer' then
    select * into v_team from public.teams where id=p_target_id for update;
    if not found then raise exception 'Team not found'; end if;
    if p_incident_type='team' then
      update public.teams set coverage=0 where id=v_team.id;
      v_summary := format('%s coverage → 0%%', v_team.name);
    else
      update public.teams set coverage=greatest(0, coverage-25) where id=v_team.id;
      v_summary := format('%s volunteer coverage reduced by 25%%', v_team.name);
    end if;

  elsif p_incident_type='task_delay' then
    select * into v_task from public.tasks where id=p_target_id and event_id=p_event_id for update;
    if not found then raise exception 'Task not found for this event'; end if;
    update public.tasks
      set status=case when status='done' then status else 'blocked' end,
          due_at=case when due_at is null then v_now + interval '60 minutes' else due_at + interval '60 minutes' end,
          impact_area=coalesce(impact_area,'schedule') || ' · delayed by incident',
          updated_at=v_now
      where id=v_task.id and status <> 'done';
    v_summary := format('%s delayed and dependent work revalidated', v_task.title);
  end if;

  -- Update exactly the unfinished tasks identified by the simulation.
  if coalesce(array_length(v_requested,1),0) > 0 then
    with changed as (
      update public.tasks
         set status=case when status='blocked' then 'blocked' else 'progress' end,
             impact_area=case when p_incident_type='venue'
               then format('venue change: %s → %s',v_previous_venue,trim(coalesce(p_proposed_venue,'')))
               else coalesce(impact_area,'operational') || format(' · %s incident',p_incident_type) end,
             updated_at=v_now
       where id=any(v_requested) and event_id=p_event_id and status <> 'done'
       returning id
    ) select coalesce(array_agg(id),'{}'), count(*) into v_touched, v_task_count from changed;
  end if;

  -- The direct incident target is always included when it is a task.
  if p_incident_type='task_delay' and v_task.id is not null and v_task.status <> 'done' and not (v_task.id = any(coalesce(v_touched,'{}'))) then
    v_touched := array_append(v_touched,v_task.id);
    v_task_count := v_task_count + 1;
  end if;

  v_plan := jsonb_build_object(
    'incidentType',p_incident_type,
    'targetId',p_target_id,
    'previousVenue',v_previous_venue,
    'proposedVenue',case when p_incident_type='venue' then p_proposed_venue else null end,
    'summary',v_summary,
    'taskIds',to_jsonb(v_touched),
    'taskCount',v_task_count
  );

  insert into public.ops_runs(actor_id,trigger_type,trigger_id,mode,risk,impact_count,status,plan,approved_at,committed_at)
  values(auth.uid(),p_incident_type,p_event_id::text,'commit',case when p_risk in ('low','medium','high','critical') then p_risk else 'medium' end,
         greatest(0,coalesce(p_impact_count,0)),'committed',v_plan,v_now,v_now)
  returning id into v_run;

  -- Every resolved incident becomes reusable operational knowledge.
  insert into public.knowledge_sources(title,source_type,content,metadata,verified)
  values(
    format('%s · %s',v_event.name,upper(replace(p_incident_type,'_',' '))),
    'incident_postmortem',
    format('Incident: %s\nEvent: %s\nResolution: %s\nTasks touched: %s\nOperator approval: recorded in audit log.',p_incident_type,v_event.name,v_summary,v_task_count),
    jsonb_build_object('event_id',p_event_id,'incident_type',p_incident_type,'risk',p_risk,'task_ids',to_jsonb(v_touched),'ops_run_id',v_run),
    false
  ) returning id into v_knowledge;

  insert into public.audit_log(actor_id,action,entity_type,entity_id,payload)
  values(auth.uid(),'incident.commit','event',p_event_id,
    jsonb_build_object('incidentType',p_incident_type,'targetId',p_target_id,'previousVenue',v_previous_venue,'proposedVenue',p_proposed_venue,
      'summary',v_summary,'taskIds',to_jsonb(v_touched),'taskCount',v_task_count,'opsRunId',v_run,'knowledgeId',v_knowledge));

  return jsonb_build_object(
    'committed',true,
    'eventName',v_event.name,
    'plan',v_plan || jsonb_build_object('opsRunId',v_run,'knowledgeId',v_knowledge),
    'event',jsonb_build_object('id',v_event.id,'name',v_event.name,'previousVenue',v_previous_venue,'venue',case when p_incident_type='venue' then p_proposed_venue else v_event.venue end)
  );
end;
$$;

grant execute on function public.nexus_commit_incident(uuid,text,uuid,text,text,integer,text[]) to anon, authenticated;

-- Demo resources required by the final incident selector.
insert into public.resources(name,kind,location,status,quantity)
select 'Event Network','network','North Block','ready',1
where not exists(select 1 from public.resources where lower(name)=lower('Event Network'));

insert into public.resources(name,kind,location,status,quantity)
select 'Backup Network','network','North Block','ready',1
where not exists(select 1 from public.resources where lower(name)=lower('Backup Network'));

-- Idempotent dependency enrichment for the KBC CodeRush scenario.
do $$
declare
  e uuid; volunteers uuid; technical uuid; hdmi uuid; network uuid;
  t_vol uuid; t_comm uuid; t_hdmi uuid;
begin
  select id into e from public.events where name='KBC CodeRush 2026' limit 1;
  select id into volunteers from public.teams where name='Volunteers' limit 1;
  select id into technical from public.teams where name='Technical' limit 1;
  select id into hdmi from public.resources where name='HDMI capture kit' limit 1;
  select id into network from public.resources where name='Event Network' limit 1;
  select id into t_vol from public.tasks where title='Re-route robotics volunteers' and event_id=e limit 1;
  select id into t_comm from public.tasks where title='Notify registered participants' and event_id=e limit 1;
  select id into t_hdmi from public.tasks where title='Inventory HDMI capture kits' and event_id=e limit 1;

  if e is not null and volunteers is not null and t_vol is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'team',volunteers,'task',t_vol,'team unavailable → volunteer dispatch') on conflict do nothing;
  end if;
  if e is not null and technical is not null and t_hdmi is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'team',technical,'task',t_hdmi,'team unavailable → equipment check') on conflict do nothing;
  end if;
  if e is not null and hdmi is not null and t_hdmi is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'resource',hdmi,'task',t_hdmi,'equipment failure → inventory task') on conflict do nothing;
  end if;
  if e is not null and network is not null and t_vol is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'resource',network,'task',t_vol,'network outage → volunteer dispatch') on conflict do nothing;
  end if;
  if e is not null and t_comm is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    select e,'task',t_vol,'task',t_comm,'volunteer dispatch → participant communication'
    where t_vol is not null
    on conflict do nothing;
  end if;
end $$;
