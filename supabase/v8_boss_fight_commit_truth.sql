-- NEXUS//03 v8 — truthful transactional boss-fight commit
-- Run once in Supabase SQL Editor AFTER v7.
-- The function returns the exact venue transition and exact task IDs actually updated.

create or replace function public.nexus_commit_venue_change(
  p_event_id uuid,
  p_proposed_venue text,
  p_risk text default 'medium',
  p_impact_count integer default 0,
  p_task_ids text[] default '{}'
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
  v_comm_task_id uuid;
  v_run public.ops_runs%rowtype;
  v_previous_venue text;
  v_now timestamptz := now();
  v_touched_task_ids uuid[] := '{}';
  v_requested_task_ids uuid[] := '{}';
  v_id text;
begin
  if p_event_id is null then raise exception 'eventId is required'; end if;
  if nullif(trim(p_proposed_venue), '') is null then raise exception 'proposed venue is required'; end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then raise exception 'Event not found'; end if;

  v_previous_venue := v_event.venue;
  if lower(trim(v_previous_venue)) = lower(trim(p_proposed_venue)) then
    raise exception 'The event is already at that venue';
  end if;

  -- Convert only valid UUID strings supplied by the simulation.
  foreach v_id in array coalesce(p_task_ids, '{}') loop
    begin
      v_requested_task_ids := array_append(v_requested_task_ids, v_id::uuid);
    exception when invalid_text_representation then
      null;
    end;
  end loop;

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

  -- Only update real, unfinished tasks belonging to this event, then capture
  -- exactly what PostgreSQL changed via RETURNING.
  if coalesce(array_length(v_requested_task_ids, 1), 0) > 0 then
    with changed as (
      update public.tasks
      set status = case when status = 'blocked' then 'blocked' else 'progress' end,
          impact_area = format('venue change: %s → %s', v_previous_venue, trim(p_proposed_venue)),
          updated_at = v_now
      where id = any(v_requested_task_ids)
        and event_id = p_event_id
        and status <> 'done'
      returning id
    )
    select coalesce(array_agg(id), '{}') into v_touched_task_ids from changed;
  end if;

  -- Idempotent communication task: reuse it if it already exists.
  select id into v_comm_task_id
  from public.tasks
  where event_id = p_event_id
    and lower(title) like 'notify participants:%venue changed%'
  order by created_at asc
  limit 1;

  if v_comm_task_id is null then
    insert into public.tasks(event_id, title, owner, status, impact_area, priority)
    values (
      p_event_id,
      format('Notify participants: venue changed to %s', trim(p_proposed_venue)),
      'Comms', 'todo', 'participant comms', 'high'
    ) returning id into v_comm_task_id;
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
      'taskIds', to_jsonb(v_touched_task_ids),
      'taskCount', coalesce(array_length(v_touched_task_ids, 1), 0),
      'oldResourceId', nullif(v_old_resource.id::text, ''),
      'newResourceId', nullif(v_new_resource.id::text, ''),
      'communicationTaskId', nullif(v_comm_task_id::text, '')
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
      'taskIds', to_jsonb(v_touched_task_ids),
      'taskCount', coalesce(array_length(v_touched_task_ids, 1), 0),
      'opsRunId', v_run.id,
      'communicationTaskId', v_comm_task_id
    )
  );

  return jsonb_build_object(
    'mode', 'database',
    'committed', true,
    'eventId', p_event_id,
    'plan', jsonb_build_object(
      'previousVenue', v_previous_venue,
      'proposedVenue', trim(p_proposed_venue),
      'taskIds', to_jsonb(v_touched_task_ids),
      'taskCount', coalesce(array_length(v_touched_task_ids, 1), 0),
      'communicationTaskId', v_comm_task_id,
      'opsRunId', v_run.id
    )
  );
end;
$$;

grant execute on function public.nexus_commit_venue_change(uuid, text, text, integer, text[]) to anon, authenticated;
