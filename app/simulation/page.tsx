'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle, ArrowRight, BrainCircuit, CheckCircle2, Clock3, GitBranch, History,
  Play, RotateCcw, ShieldAlert, ShieldCheck, Sparkles, Users, Boxes, Zap,
} from 'lucide-react';
import { Pill, SectionTitle } from '@/components/ui';
import { useRealtimeRefresh } from '@/lib/use-realtime-refresh';
import { incidentList, type IncidentType } from '@/lib/incident';

export default function Simulation() {
  const searchParams = useSearchParams();
  const requestedEventId = searchParams.get('event') || '';
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentType>('venue');
  const [venue, setVenue] = useState('Hall B');
  const [targetId, setTargetId] = useState('');
  const [resources, setResources] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [mode, setMode] = useState<'idle' | 'running' | 'done' | 'committing' | 'committed'>('idle');
  const [result, setResult] = useState<any>(null);
  const [commitResult, setCommitResult] = useState<any>(null);
  const [brief, setBrief] = useState<any>(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const selected = events.find(e => e.id === eventId);
  const selectedIncident = incidentList.find(x => x.value === incidentType)!;

  const load = useCallback(async () => {
    const [ev, rr, tr, kr] = await Promise.all([
      fetch('/api/events', { cache: 'no-store' }),
      fetch('/api/resources', { cache: 'no-store' }),
      fetch('/api/teams', { cache: 'no-store' }),
      fetch('/api/tasks', { cache: 'no-store' }),
    ]);
    const [ej, rj, tj, kj] = await Promise.all([ev.json(), rr.json(), tr.json(), kr.json()]);
    const next = ej.events || [];
    setEvents(next);
    setEventId(current => {
      if (requestedEventId && next.some((event: any) => String(event.id) === String(requestedEventId))) {
        return requestedEventId;
      }
      return current || next[0]?.id || '';
    });
    setResources(rj.resources || []);
    setTeams(tj.teams || []);
    setTasks(kj.tasks || []);
  }, [requestedEventId]);

  const loadHistory = useCallback(async () => {
    if (!eventId) return;
    const r = await fetch(`/api/simulation?eventId=${encodeURIComponent(eventId)}`, { cache: 'no-store' });
    const j = await r.json();
    setHistory(j.runs || []);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadHistory(); }, [loadHistory]);
  useRealtimeRefresh(['events', 'tasks', 'resources', 'teams', 'dependencies', 'ops_runs', 'audit_log'], () => { load(); loadHistory(); });

  const targetOptions = useMemo(() => {
    if (incidentType === 'team' || incidentType === 'volunteer') return teams;
    if (incidentType === 'task_delay') return tasks.filter(t => t.event_id === eventId && t.status !== 'done');
    if (incidentType === 'network') return resources.filter(r => String(r.kind).toLowerCase() === 'network');
    return resources;
  }, [incidentType, teams, tasks, resources, eventId]);

  function reset() {
    setMode('idle'); setResult(null); setCommitResult(null); setBrief(null);
  }

  async function run() {
    setMode('running'); setCommitResult(null); setBrief(null);
    try {
      const value = incidentType === 'venue' ? venue : targetId;
      const r = await fetch('/api/simulation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, change: { type: incidentType, value, targetId } }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Simulation failed');
      setResult(j);
      setMode('done');
      await loadHistory();
    } catch (error: any) {
      setResult({ risk: 'critical', summary: error.message || 'Simulation failed', impacts: [], executionPlan: [], explanation: [] });
      setMode('done');
    }
  }

  async function getBriefing() {
    if (!result) return;
    setBriefBusy(true);
    try {
      const r = await fetch('/api/ai/incident', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, simulation: result }),
      });
      const j = await r.json();
      setBrief(j);
    } finally { setBriefBusy(false); }
  }

  async function commit() {
    if (!result || !eventId) return;
    const targetLabel = incidentType === 'venue' ? venue : result.incident?.targetName || targetId;
    if (!confirm(`Approve “${selectedIncident.label}” for ${targetLabel}? This will mutate the live operational database and create an audit record.`)) return;
    setMode('committing');
    try {
      const r = await fetch('/api/operations/commit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, incidentType, proposedVenue: incidentType === 'venue' ? venue : undefined, targetId, simulation: result, approved: true }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Commit failed');
      setCommitResult(j); setMode('committed');
      await load(); await loadHistory();
    } catch (error: any) {
      alert(error.message || 'Commit failed'); setMode('done');
    }
  }

  const approved = mode === 'committed';
  const targetLabel = incidentType === 'venue' ? 'Replacement venue' : incidentType === 'task_delay' ? 'Delayed task' : selectedIncident.target === 'team' ? 'Affected team' : 'Affected resource';

  return <div className="space-y-6">
    <section className="hero-grid glass rounded-3xl p-6 md:p-8 overflow-hidden">
      <div className="relative z-10 max-w-3xl">
        <div className="eyebrow"><Zap size={13}/> INCIDENT COMMAND // FINAL EDITION</div>
        <h1 className="text-4xl md:text-6xl font-black tracking-[-.05em] mt-3">Break the plan.<br/><span className="text-[var(--lime)]">Watch NEXUS recover it.</span></h1>
        <p className="text-slate-400 mt-4 max-w-2xl">Six incident classes, one deterministic dependency engine, a human approval gate and one atomic Postgres commit. Nothing mutates until the operator authorizes it.</p>
        <div className="flex flex-wrap gap-2 mt-5">{['TRACE','IMPACT','SIMULATE','INTELLIGENCE','APPROVE','COMMIT','AUDIT'].map((x,i)=><span key={x} className="text-[9px] font-mono border border-white/10 rounded-full px-2.5 py-1 text-slate-500">0{i+1} {x}</span>)}</div>
      </div>
      <div className="hero-orbit"><div className="orbit-core"><ShieldCheck size={30}/></div><span className="orbit-node n1">TRACE</span><span className="orbit-node n2">SIMULATE</span><span className="orbit-node n3">APPROVE</span><span className="orbit-node n4">COMMIT</span></div>
    </section>

    <div className="grid lg:grid-cols-[.72fr_1.28fr] gap-5">
      <section className="glass rounded-2xl p-6">
        <div className="text-[10px] font-mono text-slate-600 tracking-widest">01 / INCIDENT INPUT</div>
        <h3 className="text-xl font-extrabold mt-2">Incident command</h3>
        <p className="text-xs text-slate-500 leading-5 mt-2">Select a failure mode and a real database target. The engine will trace actual dependency edges before proposing recovery.</p>

        <label className="block text-xs text-slate-400 mt-6">Incident type
          <select value={incidentType} onChange={e=>{setIncidentType(e.target.value as IncidentType);setTargetId('');reset()}} className="mt-2 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm">
            {incidentList.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </label>

        <div className="mt-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[.025] p-3"><div className="text-[9px] font-mono text-cyan-300/60">PLAYBOOK</div><div className="text-xs font-semibold mt-1">{selectedIncident.recovery}</div><div className="text-[10px] text-slate-500 mt-1">{selectedIncident.description}</div></div>

        <label className="block text-xs text-slate-400 mt-5">Event
          <select value={eventId} onChange={e=>{setEventId(e.target.value);reset()}} className="mt-2 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm">
            {events.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>

        {incidentType === 'venue' ? <>
          {selected && <div className="mt-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-xs"><span className="text-slate-600">CURRENT VENUE</span><div className="font-semibold mt-1">{selected.venue}</div></div>}
          <label className="block text-xs text-slate-400 mt-3">Replacement venue
            <select value={venue} onChange={e=>{setVenue(e.target.value);reset()}} className="mt-2 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"><option>Hall B</option><option>Main Auditorium</option><option>Innovation Arena</option></select>
          </label>
        </> : <label className="block text-xs text-slate-400 mt-3">{targetLabel}
          <select value={targetId} onChange={e=>{setTargetId(e.target.value);reset()}} className="mt-2 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm">
            <option value="">Select target</option>
            {targetOptions.map(x=><option key={x.id} value={x.id}>[{incidentType === 'task_delay' ? 'TASK' : x.kind ? String(x.kind).toUpperCase() : String(x.role || 'TEAM').toUpperCase()}] {x.title || x.name} {x.coverage !== undefined ? `· ${x.coverage}%` : ''}</option>)}
          </select>
        </label>}

        <button onClick={run} disabled={mode==='running'||mode==='committing'||!eventId||(incidentType==='venue' ? selected?.venue===venue : !targetId)} className="mt-5 w-full rounded-xl bg-[var(--lime)] text-black py-3 font-bold text-sm disabled:opacity-50">{mode==='running'?<span className="animate-pulse">Tracing dependency fabric…</span>:<><Play size={15} className="inline mr-1"/>Run impact simulation</>}</button>
        <button onClick={reset} className="mt-2 w-full rounded-xl border border-white/10 py-2.5 text-xs text-slate-400"><RotateCcw size={13} className="inline mr-1"/>Reset scenario</button>
      </section>

      <section className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between"><div><div className="text-[10px] font-mono text-slate-600 tracking-widest">02 / BLAST RADIUS</div><h3 className="text-xl font-extrabold mt-2">{result?.summary || 'Waiting for a scenario'}</h3></div>{result&&<Pill tone={result.risk==='critical'||result.risk==='high'?'bad':result.risk==='medium'?'warn':'good'}>{String(result.risk).toUpperCase()} IMPACT</Pill>}</div>
        {result ? <>
          <div className="grid grid-cols-3 gap-3 mt-5"><div className="metric"><div>IMPACTED</div><strong>{result.impacts?.length || 0}</strong></div><div className="metric"><div>CONFLICTS</div><strong>{result.conflicts || 0}</strong></div><div className="metric"><div>PLAN STEPS</div><strong>{result.executionPlan?.length || 0}</strong></div></div>
          <div className="mt-4 rounded-2xl border border-white/[.06] bg-[#080c10] p-4"><div className="text-[9px] font-mono tracking-widest text-slate-600">IMPACT MAP · VERIFIED RECORDS</div><div className="grid grid-cols-3 gap-2 mt-3">{['event','task','team','resource'].map((type:any)=><div key={type} className="rounded-xl border border-white/[.05] bg-white/[.02] p-3"><div className="text-[9px] uppercase text-slate-600">{type}s</div><div className="text-lg font-black mt-1">{(result.impacts || []).filter((x:any)=>String(x.type).toLowerCase()===type).length}</div></div>)}</div><div className="text-[10px] text-slate-500 mt-3">NEXUS traced the current database graph first; these counts are derived from the simulation response.</div></div>
          <div className="mt-4 space-y-2 max-h-[330px] overflow-auto pr-1">{(result.impacts || []).map((x:any)=><div key={x.id} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3"><div className="h-8 w-8 rounded-lg bg-white/[.04] grid place-items-center text-cyan-300"><ArrowRight size={14}/></div><div className="flex-1 min-w-0"><div className="text-xs font-semibold truncate">{x.name}</div><div className="text-[10px] text-slate-600 mt-1">{x.type} · {x.relation}</div></div><Pill tone={x.severity==='high'?'bad':'warn'}>{x.severity}</Pill></div>)}</div>
          <div className="mt-4 space-y-1">{(result.explanation||[]).map((x:string,i:number)=><div key={i} className="text-[11px] text-slate-500">• {x}</div>)}</div>
          <div className="flex flex-wrap gap-2 mt-5"><button onClick={getBriefing} disabled={briefBusy} className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.04] px-4 py-2.5 text-xs text-cyan-200 disabled:opacity-50"><BrainCircuit size={14} className="inline mr-2"/>{briefBusy?'Building intelligence…':'Generate incident briefing'}</button><span className="rounded-xl border border-white/10 px-3 py-2.5 text-[9px] font-mono text-slate-600">VERIFIED DATA → ANALYSIS</span></div>
        </> : <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-center"><ShieldAlert size={24} className="mx-auto text-slate-600"/><div className="text-sm text-slate-500 mt-3">No simulation has been committed.</div><div className="text-[10px] text-slate-700 mt-1">Everything remains hypothetical until an operator approves execution.</div></div>}
      </section>
    </div>

    {brief && <section className="glass rounded-2xl p-6 border-cyan-300/10"><div className="flex items-center justify-between"><div><div className="text-[10px] font-mono text-cyan-300/60">INTELLIGENCE LAYER</div><h3 className="text-xl font-extrabold mt-1">Incident briefing</h3></div><Pill tone="cyan"><Sparkles size={11}/>{brief.mode === 'openai' ? 'AI ANALYSIS' : 'DETERMINISTIC'}</Pill></div><div className="mt-4 rounded-xl bg-[#080c10] border border-white/[.06] p-5 text-sm leading-6 text-slate-300 whitespace-pre-wrap">{brief.answer}</div><div className="mt-3 text-[10px] text-slate-600">{brief.sourceBoundary}</div></section>}

    {result && !approved && <section className="glass rounded-2xl p-6 border-amber-300/10">
      <div className="flex items-center justify-between"><div><div className="text-[10px] font-mono text-amber-300/60 tracking-widest">03 / HUMAN GATE</div><h3 className="text-xl font-extrabold mt-2">Proposed execution plan</h3></div><Pill tone="warn"><AlertTriangle size={12}/> OPERATOR APPROVAL</Pill></div>
      <div className="grid md:grid-cols-2 gap-2 mt-5">{(result.executionPlan||[]).map((x:any,i:number)=><div key={`${x.entityId}-${i}`} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><div className="flex items-center gap-2"><span className="text-[10px] font-mono text-slate-600">{String(i+1).padStart(2,'0')}</span><b className="text-xs">{x.action}</b>{x.approvalRequired&&<span className="ml-auto text-[9px] font-mono text-amber-300">APPROVAL</span>}</div><div className="text-[10px] text-slate-500 mt-2">{x.description}</div></div>)}</div>
      <div className="flex flex-wrap gap-3 mt-5"><button onClick={commit} disabled={mode==='committing'} className="rounded-xl bg-[var(--lime)] text-black px-5 py-3 font-bold text-sm disabled:opacity-50">{mode==='committing'?'Committing atomic transaction…':'Approve & execute change'}</button><div className="rounded-xl border border-white/10 px-4 py-3 text-[10px] font-mono text-slate-500">ENGINE PROPOSES · HUMAN AUTHORIZES · POSTGRES COMMITS</div></div>
    </section>}

    {approved && <section className="glass rounded-2xl p-6 border-emerald-300/20"><div className="flex items-center gap-3"><CheckCircle2 className="text-emerald-300"/><div><div className="text-[10px] font-mono text-emerald-300/70 tracking-widest">04 / INCIDENT RESOLVED</div><h3 className="text-xl font-extrabold mt-1">Live state committed</h3></div></div><div className="grid md:grid-cols-4 gap-3 mt-5"><div className="metric"><div>CHANGE</div><strong className="text-base">{commitResult?.plan?.summary || 'Committed'}</strong></div><div className="metric"><div>TASKS TOUCHED</div><strong>{commitResult?.plan?.taskCount ?? 0}</strong></div><div className="metric"><div>OPS RUN</div><strong className="text-base">{commitResult?.opsRunId ? 'AUDITED' : 'RECORDED'}</strong></div><div className="metric"><div>KNOWLEDGE</div><strong className="text-base">{commitResult?.knowledgeId ? 'CAPTURED' : 'PENDING'}</strong></div></div><p className="text-xs text-slate-500 mt-4">The final values shown here come from the PostgreSQL transaction response, not from the browser's assumptions.</p></section>}

    <section className="grid md:grid-cols-4 gap-4"><div className="glass rounded-2xl p-5"><GitBranch size={17} className="text-cyan-300"/><div className="font-bold mt-4">Trace</div><p className="text-xs text-slate-500 mt-2">Traverse real dependency edges from the incident target.</p></div><div className="glass rounded-2xl p-5"><ShieldAlert size={17} className="text-amber-300"/><div className="font-bold mt-4">Simulate</div><p className="text-xs text-slate-500 mt-2">Calculate blast radius without mutating live state.</p></div><div className="glass rounded-2xl p-5"><ShieldCheck size={17} className="text-emerald-300"/><div className="font-bold mt-4">Approve</div><p className="text-xs text-slate-500 mt-2">Keep a human decision gate before high-impact changes.</p></div><div className="glass rounded-2xl p-5"><Zap size={17} className="text-lime-300"/><div className="font-bold mt-4">Commit</div><p className="text-xs text-slate-500 mt-2">Write one atomic state change, audit record and knowledge capture.</p></div></section>

    <section className="glass rounded-2xl p-5"><SectionTitle eyebrow="INCIDENT HISTORY" title="Recent simulations" action={<Pill tone="cyan"><History size={11}/> PERSISTED</Pill>}/><div className="space-y-2 mt-4">{history.slice(0,8).map((h:any)=><div key={h.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3"><div className="h-8 w-8 rounded-lg bg-white/[.03] grid place-items-center"><Clock3 size={14} className="text-slate-500"/></div><div className="flex-1 min-w-0"><div className="text-xs font-semibold">{String(h.change_type).replace('_',' ')} · {h.proposed_value}</div><div className="text-[10px] text-slate-600 mt-1">{new Date(h.created_at).toLocaleString('en-IN')} · {h.impact_count} impact · {h.conflicts} conflicts</div></div><Pill tone={['critical','high'].includes(h.risk)?'bad':h.risk==='medium'?'warn':'good'}>{h.risk}</Pill></div>)}{!history.length&&<div className="text-sm text-slate-600 text-center py-6">No simulations stored for this event yet.</div>}</div></section>
  </div>;
}
