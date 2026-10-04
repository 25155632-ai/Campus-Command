import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
type TaskLike = { id?: unknown; type?: unknown; entityType?: unknown };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventId = String(body?.eventId || '');
    const incidentType = String(body?.incidentType || 'venue');
    const proposedVenue = String(body?.proposedVenue || '').trim();
    const targetId = body?.targetId ? String(body.targetId) : null;
    const simulation = body?.simulation;

    if (!eventId || !simulation) return NextResponse.json({ error: 'eventId and simulation are required' }, { status: 400 });
    if (body?.approved !== true) return NextResponse.json({ error: 'Operator approval is required before commit' }, { status: 409 });
    if (!['venue', 'resource', 'team', 'volunteer', 'task_delay', 'network'].includes(incidentType)) {
      return NextResponse.json({ error: 'Unsupported incident type' }, { status: 400 });
    }

    const ids = new Set<string>();
    for (const x of (Array.isArray(simulation.impacts) ? simulation.impacts : []) as TaskLike[]) {
      if (x?.type === 'task' && typeof x.id === 'string') ids.add(x.id);
    }
    for (const x of (Array.isArray(simulation.executionPlan) ? simulation.executionPlan : []) as TaskLike[]) {
      if (x?.entityType === 'task' && typeof x.id === 'string') ids.add(x.id);
    }
    if (incidentType === 'task_delay' && targetId) ids.add(targetId);

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('nexus_commit_incident', {
      p_event_id: eventId,
      p_incident_type: incidentType,
      p_target_id: targetId,
      p_proposed_venue: incidentType === 'venue' ? proposedVenue : null,
      p_risk: String(simulation.risk || 'medium'),
      p_impact_count: Number(simulation.impacts?.length || 0),
      p_task_ids: [...ids],
    });

    if (error) {
      return NextResponse.json({
        error: `Commit transaction failed: ${error.message}`,
        code: error.code || null,
        hint: 'Run supabase/v10_final_command_os.sql in Supabase SQL Editor, then restart the dev server.',
      }, { status: 500 });
    }

    const plan = data?.plan || {};
    const taskIds = Array.isArray(plan.taskIds)
      ? plan.taskIds.filter((x: unknown): x is string => typeof x === 'string')
      : [];

    return NextResponse.json({
      mode: 'database',
      committed: Boolean(data?.committed),
      event: data?.event || {
        id: eventId,
        name: data?.eventName || null,
        previousVenue: plan.previousVenue || null,
        venue: plan.proposedVenue || null,
      },
      plan: {
        ...plan,
        taskIds,
        taskCount: Number(plan.taskCount ?? taskIds.length),
      },
      opsRunId: plan.opsRunId || null,
      knowledgeId: plan.knowledgeId || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Commit failed' }, { status: 500 });
  }
}
