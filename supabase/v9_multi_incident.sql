-- NEXUS//03 v9 — Multi-Incident Recovery Engine
-- Run once in Supabase SQL Editor AFTER the v8 commit SQL.
-- The function is SECURITY DEFINER so the browser demo can commit atomically
-- without requiring a Supabase login. For production, replace this with
-- authenticated/operator RLS and server-side authorization.

create or replace function public.nexus_commit_incident(
  p_event_id uuid,
  p_incident_type text,
  p_target_id uuid default null,
  p_proposed_venue text default null,
  p_risk text default 'medium',
  p_impact_count integer default 0,
  p_task_ids uuid[] default '{}'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
  r public.resources%rowtype;
  new_r public.resources%rowtype;
  tm public.teams%rowtype;
  old_venue text;
  touched_ids uuid[] := '{}';
  touched_count integer := 0;
  ops_id uuid;
  summary text;
  plan jsonb;
begin
  select * into e from public.events where id = p_event_id for update;
  if not found then raise exception 'Event not found'; end if;

  if p_incident_type not in ('venue','resource','team','volunteer') then
    raise exception 'Unsupported incident type: %', p_incident_type;
  end if;

  old_venue := e.venue;

  if p_incident_type = 'venue' then
    if coalesce(trim(p_proposed_venue),'') = '' then raise exception 'Proposed venue is required'; end if;
    if lower(trim(e.venue)) = lower(trim(p_proposed_venue)) then raise exception 'Event is already at %', p_proposed_venue; end if;

    update public.events set venue = trim(p_proposed_venue), updated_at = now() where id = p_event_id;
    update public.resources set status = 'available' where kind = 'venue' and lower(name) = lower(old_venue);
    select * into new_r from public.resources where kind = 'venue' and lower(name) = lower(trim(p_proposed_venue)) order by created_at limit 1;
    if new_r.id is not null then
      update public.resources set status = 'reserved' where id = new_r.id;
    end if;
    summary := old_venue || ' → ' || trim(p_proposed_venue);

  elsif p_incident_type = 'resource' then
    select * into r from public.resources where id = p_target_id for update;
    if not found then raise exception 'Resource not found'; end if;
    update public.resources set status = 'offline' where id = r.id;
    summary := r.name || ' marked offline';

  elsif p_incident_type = 'team' then
    select * into tm from public.teams where id = p_target_id for update;
    if not found then raise exception 'Team not found'; end if;
    update public.teams set coverage = 0 where id = tm.id;
    summary := tm.name || ' coverage → 0%';

  else
    select * into tm from public.teams where id = p_target_id for update;
    if not found then raise exception 'Volunteer team not found'; end if;
    update public.teams set coverage = greatest(0, coverage - 25) where id = tm.id;
    summary := tm.name || ' coverage reduced by 25%';
  end if;

  -- Only touch task rows that belong to this event and were actually identified
  -- by the simulation. Completed tasks are left untouched.
  with candidates as (
    select t.id from public.tasks t
    where t.event_id = p_event_id
      and t.status <> 'done'
      and t.id = any(coalesce(p_task_ids, '{}'))
  ), changed as (
    update public.tasks t
       set status = case when t.priority in ('high','critical') then 'blocked' else 'progress' end,
           updated_at = now()
     where t.id in (select id from candidates)
     returning t.id
  )
  select coalesce(array_agg(id), '{}'), count(*) into touched_ids, touched_count from changed;

  -- Always create an operational run and audit record inside this same transaction.
  insert into public.ops_runs(actor_id, trigger_type, trigger_id, mode, risk, impact_count, status, plan, approved_at, committed_at)
  values (auth.uid(), p_incident_type, p_event_id::text, 'commit', p_risk, p_impact_count, 'committed',
          jsonb_build_object('incidentType',p_incident_type,'targetId',p_target_id,'previousVenue',old_venue,'proposedVenue',p_proposed_venue,'summary',summary,'taskIds',touched_ids,'taskCount',touched_count), now(), now())
  returning id into ops_id;

  insert into public.audit_log(actor_id, action, entity_type, entity_id, payload)
  values (auth.uid(), 'incident.commit', 'event', p_event_id,
          jsonb_build_object('incidentType',p_incident_type,'targetId',p_target_id,'previousVenue',old_venue,'proposedVenue',p_proposed_venue,'summary',summary,'taskIds',touched_ids,'taskCount',touched_count,'opsRunId',ops_id));

  plan := jsonb_build_object(
    'summary', summary,
    'previousVenue', old_venue,
    'proposedVenue', case when p_incident_type = 'venue' then p_proposed_venue else null end,
    'taskIds', touched_ids,
    'taskCount', touched_count,
    'opsRunId', ops_id
  );
  return jsonb_build_object('plan',plan,'eventName',e.name);
end;
$$;

grant execute on function public.nexus_commit_incident(uuid,text,uuid,text,text,integer,uuid[]) to anon, authenticated;

insert into public.resources(name,kind,location,status,quantity)
select 'Event Network','network','North Block','ready',1
where not exists (select 1 from public.resources where name='Event Network');

-- Demo graph enrichment: connect the volunteer team and technical resources to
-- real KBC CodeRush tasks so the incident engine has multiple traversable paths.
do $$
declare
  e uuid; tv uuid; tt uuid; tr uuid; tn uuid; t1 uuid; t2 uuid; t3 uuid;
begin
  select id into e from public.events where name='KBC CodeRush 2026' limit 1;
  select id into tv from public.teams where name='Volunteers' limit 1;
  select id into tt from public.teams where name='Technical' limit 1;
  select id into tr from public.resources where name='HDMI capture kit' limit 1;
  select id into tn from public.resources where name='Event Network' limit 1;
  select id into t1 from public.tasks where title='Re-route robotics volunteers' and event_id=e limit 1;
  select id into t2 from public.tasks where title='Notify registered participants' and event_id=e limit 1;
  select id into t3 from public.tasks where title='Inventory HDMI capture kits' and event_id=e limit 1;

  if e is not null and tv is not null and t1 is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'team',tv,'task',t1,'team unavailable → volunteer dispatch') on conflict do nothing;
  end if;
  if e is not null and tt is not null and t3 is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'team',tt,'task',t3,'team unavailable → equipment check') on conflict do nothing;
  end if;
  if e is not null and tr is not null and t3 is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'resource',tr,'task',t3,'equipment failure → inventory task') on conflict do nothing;
  end if;
  if e is not null and t1 is not null and tn is not null then
    insert into public.dependencies(event_id,source_type,source_id,target_type,target_id,relation)
    values(e,'resource',tn,'task',t1,'network outage → volunteer dispatch') on conflict do nothing;
  end if;
end $$;
