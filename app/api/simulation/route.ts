import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { downstream, detectConflicts, riskFromImpact, type Edge } from '@/lib/engine';
import { INCIDENTS, type IncidentType } from '@/lib/incident';

export const dynamic = 'force-dynamic';
type Row = Record<string, any>;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventId = body?.eventId ? String(body.eventId) : null;
    const incidentType = String(body?.change?.type || 'venue') as IncidentType;
    const value = String(body?.change?.value || '').trim();
    const targetId = body?.change?.targetId ? String(body.change.targetId) : value;

    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    if (!INCIDENTS[incidentType]) return NextResponse.json({ error: 'Unsupported incident type' }, { status: 400 });
    if (incidentType === 'venue' && !value) return NextResponse.json({ error: 'proposed venue is required' }, { status: 400 });
    if (incidentType !== 'venue' && !targetId) return NextResponse.json({ error: 'incident target is required' }, { status: 400 });

    const supabase = await createClient();
    const [eventRes, depsRes, tasksRes, teamsRes, resourcesRes, eventsRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).limit(1).maybeSingle(),
      supabase.from('dependencies').select('id,source_id,target_id,relation,source_type,target_type,event_id').eq('event_id', eventId),
      supabase.from('tasks').select('*').eq('event_id', eventId),
      supabase.from('teams').select('*'),
      supabase.from('resources').select('*'),
      supabase.from('events').select('id,name,start_at,end_at,venue').limit(100),
    ]);

    if (eventRes.error || !eventRes.data) return NextResponse.json({ error: eventRes.error?.message || 'Event not found' }, { status: 404 });
    if (depsRes.error) return NextResponse.json({ error: depsRes.error.message }, { status: 500 });

    const event = eventRes.data;
    const tasks = tasksRes.data || [];
    const teams = teamsRes.data || [];
    const resources = resourcesRes.data || [];
    const events = eventsRes.data || [];
    const edges: Edge[] = (depsRes.data || []).map((d: Row) => ({
      source_id: String(d.source_id), target_id: String(d.target_id), relation: String(d.relation || ''),
      source_type: d.source_type ? String(d.source_type) : undefined, target_type: d.target_type ? String(d.target_type) : undefined,
    }));

    const nodeMap = new Map<string, Row>();
    tasks.forEach((x: Row) => nodeMap.set(String(x.id), { ...x, type: 'task', name: x.title }));
    teams.forEach((x: Row) => nodeMap.set(String(x.id), { ...x, type: 'team', name: x.name }));
    resources.forEach((x: Row) => nodeMap.set(String(x.id), { ...x, type: 'resource', name: x.name }));

    let startId = targetId;
    let targetName = value;
    let currentLabel = '';

    if (incidentType === 'venue') {
      currentLabel = String(event.venue || '');
      const old = resources.find((r: Row) => r.kind === 'venue' && String(r.name).toLowerCase() === currentLabel.toLowerCase());
      startId = String(old?.id || event.id);
      targetName = value;
      if (!old) {
        tasks.forEach((t: Row) => edges.push({ source_id: String(event.id), target_id: String(t.id), relation: 'event → operational task', source_type: 'event', target_type: 'task' }));
      }
    } else if (incidentType === 'team' || incidentType === 'volunteer') {
      const team = teams.find((t: Row) => String(t.id) === targetId);
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      targetName = team.name;
      if (incidentType === 'volunteer') targetName = `${team.name} volunteer coverage`;
    } else {
      const resource = resources.find((r: Row) => String(r.id) === targetId);
      if (incidentType === 'task_delay') {
        const task = tasks.find((t: Row) => String(t.id) === targetId);
        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        targetName = task.title;
      } else {
        if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        targetName = resource.name;
      }
    }

    let ids = downstream(startId, edges);
    const impactedIds = new Set(ids);
    if (incidentType === 'venue' && startId === event.id) tasks.forEach((t: Row) => impactedIds.add(String(t.id)));
    if (incidentType === 'task_delay') impactedIds.add(targetId);
    if ((incidentType === 'team' || incidentType === 'volunteer') && impactedIds.size === 0) {
      tasks.filter((t: Row) => String(t.owner || '').toLowerCase().includes('operations') || String(t.impact_area || '').toLowerCase().includes('volunteer')).forEach((t: Row) => impactedIds.add(String(t.id)));
    }
    if ((incidentType === 'resource' || incidentType === 'network') && impactedIds.size === 0) {
      tasks.filter((t: Row) => String(t.impact_area || '').toLowerCase().includes('equipment') || String(t.impact_area || '').toLowerCase().includes('network')).forEach((t: Row) => impactedIds.add(String(t.id)));
    }

    const impactedNodes = [...impactedIds].map(id => nodeMap.get(id)).filter(Boolean) as Row[];
    const conflicts = detectConflicts(events as any[]);
    const criticalOpen = tasks.filter((t: Row) => t.status !== 'done' && ['critical', 'high'].includes(t.priority)).length;
    const risk = riskFromImpact(impactedNodes.length, conflicts.length, criticalOpen);
    const severityFor = (n: Row) => n.priority === 'critical' || n.status === 'blocked' ? 'high' : n.type === 'resource' ? 'medium' : 'medium';
    const impacts = impactedNodes.slice(0, 30).map(n => ({
      id: String(n.id), name: n.name, type: n.type,
      relation: edges.find(e => e.target_id === String(n.id))?.relation || 'incident → operational task', severity: severityFor(n),
    }));

    const executionPlan: any[] = [];
    if (incidentType === 'venue') executionPlan.push({ action: 'Move event venue', entityType: 'event', entityId: event.id, description: `${currentLabel} → ${value}`, approvalRequired: true });
    if (incidentType === 'resource') executionPlan.push({ action: 'Mark resource unavailable', entityType: 'resource', entityId: targetId, description: `${targetName} → offline`, approvalRequired: true });
    if (incidentType === 'network') executionPlan.push({ action: 'Activate network incident response', entityType: 'resource', entityId: targetId, description: `${targetName} → offline; activate backup connectivity`, approvalRequired: true });
    if (incidentType === 'team') executionPlan.push({ action: 'Mark team unavailable', entityType: 'team', entityId: targetId, description: `${targetName} coverage → 0%`, approvalRequired: true });
    if (incidentType === 'volunteer') executionPlan.push({ action: 'Reduce volunteer coverage', entityType: 'team', entityId: targetId, description: `${targetName} requires immediate dispatch reallocation`, approvalRequired: true });
    if (incidentType === 'task_delay') executionPlan.push({ action: 'Delay operational task', entityType: 'task', entityId: targetId, description: `${targetName} is delayed; dependent actions require resequencing`, approvalRequired: true });
    executionPlan.push(...impactedNodes.filter(n => n.type === 'task' && n.status !== 'done').map(n => ({
      action: n.status === 'blocked' ? 'Escalate blocked task' : 'Revalidate operational task', entityType: 'task', entityId: String(n.id),
      description: `${(() => {
        const name = String(n.name || 'Operational task');
        if (incidentType === 'venue' && /venue changed to/i.test(name)) {
          return name.replace(/venue changed to\s+.*$/i, `venue changed to ${value}`);
        }
        return name;
      })()} requires review after ${INCIDENTS[incidentType].label.toLowerCase()}`, approvalRequired: false,
    })));

    const result = {
      incident: { type: incidentType, label: INCIDENTS[incidentType].label, targetId, targetName },
      event: { id: event.id, name: event.name, currentVenue: String(event.venue || ''), proposedVenue: incidentType === 'venue' ? value : String(event.venue || '') },
      risk, summary: `${INCIDENTS[incidentType].label} would affect ${impactedNodes.length} downstream records`,
      impacts: impacts.length ? impacts : [{ id: 'preview', name: 'No downstream records are connected yet', type: 'graph', relation: 'awaiting relationships', severity: 'medium' }],
      conflicts: conflicts.length, mode: 'database', executionPlan,
      explanation: [
        `${event.name}: ${INCIDENTS[incidentType].label}`,
        `Target: ${targetName}`,
        `${impactedNodes.length} downstream operational record(s) traced`,
        ...conflicts.slice(0, 2).map((c: any) => c.detail),
        criticalOpen ? `${criticalOpen} high/critical open action(s) require attention` : 'No high/critical open action detected',
      ],
      safety: { verifiedRecords: true, hypotheticalUntilApproved: true, humanApprovalRequired: true },
    };

    const insert = await supabase.from('simulation_runs').insert({
      event_id: eventId, change_type: incidentType, proposed_value: incidentType === 'venue' ? value : targetId,
      risk, impact_count: impactedNodes.length, conflicts: conflicts.length, result,
    });
    return NextResponse.json({ ...result, persisted: !insert.error, persistenceError: insert.error?.message || null });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Simulation failed' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get('eventId');
  const supabase = await createClient();
  let query = supabase.from('simulation_runs').select('id,event_id,change_type,proposed_value,risk,impact_count,conflicts,result,created_at').order('created_at', { ascending: false }).limit(20);
  if (eventId) query = query.eq('event_id', eventId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data || [], mode: 'database' });
}
