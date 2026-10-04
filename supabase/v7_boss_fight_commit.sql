-- NEXUS//03 v7 — transactional boss-fight commit
-- Run once in Supabase SQL Editor.
-- This makes the operator commit atomic and avoids PostgREST single-row coercion/RLS issues.

create or replace function public.nexus_commit_venue_change(
  p_event_id uuid,
  p_proposed_venue text,
  p_risk text default 'medium',
  p_impact_count integer default 0,
  p_task_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.events%rowtype;
  v_old_resource public.resources%rowtype;
  v_new_resource public.resources%rowtype;
  v_existing_comm uuid;
  v_comm_task public.tasks%rowtype;
  v_run public.ops_runs%rowtype;
  v_previous_venue text;
  v_now timestamptz := now();
begin
  if p_event_id is null then
    raise exception 'eventId is required';
  end if;
  if nullif(trim(p_proposed_venue), '') is null then
    raise exception 'proposed venue is required';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found';
  end if;

  v_previous_venue := v_event.venue;
  if v_previous_venue = trim(p_proposed_venue) then
    raise exception 'The event is already at that venue';
  end if;

  -- limit 1 deliberately: older demo databases may contain duplicate venue rows.
  select * into v_old_resource
  from public.resources
  where kind = 'venue' and lower(name) = lower(v_previous_venue)
  order by created_at asc
  limit 1;

  select * into v_new_resource
  from public.resources
  where kind = 'venue' and lower(name) = lower(trim(p_proposed_venue))
  order by created_at asc
  limit 1;

  update public.events
  set venue = trim(p_proposed_venue),
      risk = case when p_risk in ('low','medium','high','critical') then p_risk else risk end,
      updated_at = v_now
  where id = p_event_id;

  if v_old_resource.id is not null then
    update public.resources set status = 'available' where id = v_old_resource.id;
  end if;

  if v_new_resource.id is not null then
    update public.resources set status = 'reserved' where id = v_new_resource.id;
  end if;

  if coalesce(array_length(p_task_ids, 1), 0) > 0 then
    update public.tasks
    set status = 'progress',
        impact_area = format('venue change: %s → %s', v_previous_venue, trim(p_proposed_venue)),
        updated_at = v_now
    where id = any(p_task_ids)
      and event_id = p_event_id
      and status <> 'done';
  end if;

  select id into v_existing_comm
  from public.tasks
  where event_id = p_event_id
    and lower(title) like '%notify participants%'
    and lower(title) like '%venue%'
  order by created_at asc
  limit 1;

  if v_existing_comm is null then
    insert into public.tasks(event_id, title, owner, status, impact_area, priority)
    values (
      p_event_id,
      format('Notify participants: venue changed to %s', trim(p_proposed_venue)),
      'Comms', 'todo', 'participant comms', 'high'
    )
    returning * into v_comm_task;
  end if;

  insert into public.ops_runs(
    trigger_type, trigger_id, mode, risk, impact_count, status, plan, approved_at, committed_at
  ) values (
    'venue_change', p_event_id::text, 'commit',
    case when p_risk in ('low','medium','high','critical') then p_risk else 'medium' end,
    coalesce(p_impact_count, 0), 'committed',
    jsonb_build_object(
      'previousVenue', v_previous_venue,
      'proposedVenue', trim(p_proposed_venue),
      'taskIds', to_jsonb(coalesce(p_task_ids, '{}')),
      'oldResourceId', nullif(v_old_resource.id::text, ''),
      'newResourceId', nullif(v_new_resource.id::text, ''),
      'communicationTaskId', nullif(v_comm_task.id::text, '')
    ),
    v_now, v_now
  ) returning * into v_run;

  insert into public.audit_log(action, entity_type, entity_id, payload)
  values (
    'incident.venue_change.committed', 'event', p_event_id,
    jsonb_build_object(
      'previousVenue', v_previous_venue,
      'proposedVenue', trim(p_proposed_venue),
      'risk', p_risk,
      'impactCount', coalesce(p_impact_count, 0),
      'opsRunId', v_run.id,
      'communicationTaskId', nullif(v_comm_task.id::text, '')
    )
  );

  return jsonb_build_object(
    'mode', 'database',
    'committed', true,
    'eventId', p_event_id,
    'plan', jsonb_build_object(
      'previousVenue', v_previous_venue,
      'proposedVenue', trim(p_proposed_venue),
      'taskIds', to_jsonb(coalesce(p_task_ids, '{}')),
      'communicationTaskId', nullif(v_comm_task.id::text, ''),
      'opsRunId', v_run.id
    )
  );
exception
  when others then
    raise exception '%', sqlerrm;
end;
$$;

grant execute on function public.nexus_commit_venue_change(uuid, text, text, integer, uuid[]) to anon, authenticated;
