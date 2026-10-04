import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildOpsPlan } from '@/lib/autopilot';

export const dynamic = 'force-dynamic';

const demoFallback = {
  risk: 'high',
  impactedCount: 4,
  blockedCount: 1,
  actions: [
    { order: 1, target: 'Re-route robotics volunteers', targetType: 'task', action: 'Escalate and assign backup owner', reason: 'Venue change propagates into volunteer dispatch', approvalRequired: false },
    { order: 2, target: 'Notify registered participants', targetType: 'task', action: 'Review downstream readiness', reason: 'Venue information must remain consistent', approvalRequired: false },
    { order: 3, target: 'Confirm speaker arrival windows', targetType: 'task', action: 'Review downstream readiness', reason: 'Schedule and venue information must remain consistent', approvalRequired: false },
    { order: 4, target: 'Inventory HDMI capture kits', targetType: 'task', action: 'Review downstream readiness', reason: 'Equipment placement may change with the venue', approvalRequired: false }
  ]
};

export async function POST(req: Request) {
  const body = await req.json();
  const action = String(body.action || 'run');

  if (action === 'approve' || action === 'discard') {
    if (!body.opsRunId) return NextResponse.json({ error: 'opsRunId is required' }, { status: 400 });
    const supabase = await createClient();
    const status = action === 'approve' ? 'approved' : 'discarded';
    const patch: Record<string, unknown> = { status };
    if (action === 'approve') patch.approved_at = new Date().toISOString();
    const { data, error } = await supabase.from('ops_runs').update(patch).eq('id', body.opsRunId).select('id,status,approved_at').maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Autopilot run not found' }, { status: 404 });
    if (action === 'approve') {
      await supabase.from('audit_log').insert({ action: 'autopilot.plan.approved', entity_type: 'ops_run', entity_id: data.id, payload: { status } });
    } else {
      await supabase.from('audit_log').insert({ action: 'autopilot.plan.discarded', entity_type: 'ops_run', entity_id: data.id, payload: { status } });
    }
    return NextResponse.json({ ok: true, run: data });
  }

  const triggerId = String(body.triggerId || '');
  if (!triggerId) return NextResponse.json({ error: 'triggerId is required' }, { status: 400 });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ mode: 'demo', plan: demoFallback, opsRunId: null });
  }

  const supabase = await createClient();
  const [{ data: deps, error: depsError }, { data: tasks, error: tasksError }, { data: resources, error: resourcesError }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from('dependencies').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('resources').select('*'),
    supabase.from('events').select('*')
  ]);
  const readError = depsError || tasksError || resourcesError || eventsError;
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

  const edges = (deps || []).map((d: any) => ({ source_id: d.source_id, target_id: d.target_id, relation: d.relation, source_type: d.source_type, target_type: d.target_type }));
  const nodes = [
    ...(tasks || []).map((x: any) => ({ id: x.id, type: 'task', label: x.title, status: x.status, priority: x.priority })),
    ...(resources || []).map((x: any) => ({ id: x.id, type: 'resource', label: x.name, status: x.status }))
  ];

  const triggerResource = (resources || []).find((r: any) => String(r.name).toLowerCase() === triggerId.toLowerCase());
  const kbcEvent = (events || []).find((e: any) => e.name === 'KBC CodeRush 2026');
  const venueDemoSeeds = triggerResource?.name?.toLowerCase() === 'hall b' && kbcEvent
    ? (tasks || []).filter((t: any) => t.event_id === kbcEvent.id).map((t: any) => t.id)
    : [];

  const plan = buildOpsPlan(nodes, edges, triggerResource?.id || triggerId, venueDemoSeeds);
  const { data: inserted, error: insertError } = await supabase.from('ops_runs').insert({
    trigger_type: 'autopilot',
    trigger_id: triggerId,
    mode: 'simulate',
    risk: plan.risk,
    impact_count: plan.impactedCount,
    status: 'proposed',
    plan
  }).select('id').maybeSingle();

  if (insertError) return NextResponse.json({ error: insertError.message, plan, persistenceError: insertError.message }, { status: 500 });
  return NextResponse.json({ mode: 'live', plan, opsRunId: inserted?.id || null });
}
