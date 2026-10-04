'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Network, RefreshCw, ShieldAlert, Boxes, Users, ListChecks, Plus, Trash2, GitBranch, X, ExternalLink } from 'lucide-react';
import { Pill, SectionTitle } from '@/components/ui';
import { useRealtimeRefresh } from '@/lib/use-realtime-refresh';

const palette: Record<string, string> = {
  event: 'border-lime-300/30 bg-lime-300/10 text-lime-200',
  task: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200',
  team: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  resource: 'border-rose-300/25 bg-rose-300/10 text-rose-200',
};

const nodePositions = (nodes: any[]) => nodes.slice(0, 24).map((n: any, i: number) => {
  const groups: Record<string, any[]> = { event: [], task: [], team: [], resource: [] };
  nodes.slice(0, 24).forEach((x: any, index: number) => { (groups[x.type] || groups.task).push({ x, index }); });
  const group = groups[n.type] || groups.task;
  const local = group.findIndex((g: any) => g.index === i);
  if (n.type === 'event') {
    const count = groups.event.length;
    return { x: count <= 1 ? 50 : 30 + local * (40 / Math.max(1, count - 1)), y: 48 };
  }
  if (n.type === 'team') return { x: 18 + (local % 3) * 16, y: 18 + Math.floor(local / 3) * 24 };
  if (n.type === 'resource') return { x: 82 - (local % 3) * 16, y: 18 + Math.floor(local / 3) * 24 };
  return { x: 25 + (local % 4) * 17, y: 76 + Math.floor(local / 4) * 12 };
});

export default function Graph() {
  const [data, setData] = useState<any>({ nodes: [], edges: [], mode: 'database' });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ event_id: '', source_id: '', target_id: '', relation: 'operational dependency' });

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/graph', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Dependency fabric unavailable');
      setData(j);
      setError('');
    } catch (e: any) {
      setData({ nodes: [], edges: [], mode: 'database_error' });
      setError(e?.message || 'Dependency fabric unavailable');
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(['events', 'tasks', 'teams', 'resources', 'dependencies'], load);

  const nodeMap = useMemo(() => new Map<string, any>((data.nodes || []).map((n: any) => [n.id, n])), [data.nodes]);
  const positions = useMemo(() => nodePositions(data.nodes || []), [data.nodes]);
  const positionMap = useMemo(() => new Map<string, { x: number; y: number }>((data.nodes || []).slice(0, 24).map((n: any, i: number) => [n.id, positions[i] as { x: number; y: number }])), [data.nodes, positions]);
  const selected = nodeMap.get(selectedId);
  const connected = useMemo(() => {
    if (!selectedId) return [];
    const ids = new Set<string>();
    (data.edges || []).forEach((e: any) => { if (e.source_id === selectedId) ids.add(e.target_id); if (e.target_id === selectedId) ids.add(e.source_id); });
    return [...ids].map(id => nodeMap.get(id)).filter(Boolean);
  }, [selectedId, data.edges, nodeMap]);

  const source = nodeMap.get(form.source_id);
  const target = nodeMap.get(form.target_id);
  const events = (data.nodes || []).filter((n: any) => n.type === 'event');
  const nodes = (data.nodes || []).filter((n: any) => n.type !== 'event');

  async function addEdge() {
    if (!form.event_id || !source || !target || !form.relation.trim()) return;
    const r = await fetch('/api/dependencies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: form.event_id, source_type: source.type, source_id: source.id, target_type: target.type, target_id: target.id, relation: form.relation }) });
    const j = await r.json();
    if (!r.ok) return alert(j.error || 'Unable to create dependency');
    setOpen(false); setForm({ event_id: form.event_id, source_id: '', target_id: '', relation: 'operational dependency' }); await load();
  }

  async function removeEdge(id: string) {
    if (!confirm('Remove this dependency edge?')) return;
    const r = await fetch(`/api/dependencies?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const j = await r.json();
    if (!r.ok) return alert(j.error || 'Unable to remove dependency');
    if (selectedId) setSelectedId('');
    await load();
  }

  const edgeTouchesSelection = (e: any) => !selectedId || e.source_id === selectedId || e.target_id === selectedId;

  return <div className="space-y-6">
    <SectionTitle eyebrow="RELATIONSHIP FABRIC" title="Dependency graph" action={<div className="flex gap-2"><Pill tone={data.mode === 'database' ? 'good' : 'bad'}>{data.mode === 'database' ? 'POSTGRES LIVE' : 'DATABASE ERROR'}</Pill><button onClick={load} className="rounded-lg border border-white/10 p-2 text-slate-400"><RefreshCw size={14}/></button><button onClick={()=>setOpen(true)} className="rounded-lg bg-[var(--lime)] text-black p-2"><Plus size={14}/></button></div>}/>

    {error && <div className="rounded-xl border border-rose-300/20 bg-rose-300/[.04] p-4 text-xs text-rose-200"><b>Database connection failed.</b> {error}<div className="text-[10px] text-rose-200/60 mt-1">NEXUS deliberately does not replace live records with demo data.</div></div>}

    <section className="glass rounded-2xl p-5 overflow-hidden">
      <div className="perspective-stage rounded-2xl bg-[#080c10] border border-white/[.06] min-h-[580px] relative overflow-hidden">
        <div className="absolute inset-0 graph-floor"/>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {(data.edges || []).map((e: any, i: number) => {
            const a = positionMap.get(e.source_id), b = positionMap.get(e.target_id);
            if (!a || !b) return null;
            const active = edgeTouchesSelection(e);
            return <line key={e.id || i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? 'rgba(163,230,53,.45)' : 'rgba(148,163,184,.12)'} strokeWidth={active ? '.42' : '.22'} strokeDasharray={active ? '0' : '1.2 1.2'} />;
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="graph-core"><div className="core-ring r1"/><div className="core-ring r2"/><div className="core-ring r3"/><div className="core-label"><Network size={18}/><span>LIVE<br/>FABRIC</span></div></div></div>
        {(data.nodes || []).slice(0, 24).map((n: any, i: number) => {
          const p = positions[i];
          const active = !selectedId || n.id === selectedId || connected.some((x: any) => x.id === n.id);
          return <button key={n.id} onClick={()=>setSelectedId(selectedId === n.id ? '' : n.id)} className={`absolute node-card text-left ${palette[n.type] || palette.task} transition-all ${active ? 'opacity-100 scale-100' : 'opacity-25 scale-95'}`} style={{ left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%, -50%)' }}><div className="text-[9px] font-mono opacity-60">{n.type}</div><div className="text-[11px] font-semibold mt-1 max-w-36 truncate">{n.name}</div><div className="text-[9px] opacity-50 mt-1 max-w-36 truncate">{n.meta || 'live record'}</div></button>;
        })}
        {!data.nodes.length && !busy && !error && <div className="absolute inset-0 grid place-items-center text-sm text-slate-600">No graph records yet.</div>}
        {busy && <div className="absolute top-4 right-4 text-[9px] font-mono text-slate-600 animate-pulse">SYNCING POSTGRES…</div>}
      </div>
      <div className="flex flex-wrap gap-3 mt-4 text-[10px] font-mono text-slate-500"><span><Boxes className="inline mr-1 text-lime-300" size={12}/>events</span><span><ListChecks className="inline mr-1 text-cyan-300" size={12}/>tasks</span><span><Users className="inline mr-1 text-amber-300" size={12}/>teams</span><span><ShieldAlert className="inline mr-1 text-rose-300" size={12}/>resources</span><span className="ml-auto">Click a node to trace its neighborhood</span></div>
    </section>

    {selected && <section className="glass rounded-2xl p-5 border-lime-300/10"><div className="flex items-start gap-4"><div className={`rounded-xl border p-3 ${palette[selected.type]}`}><GitBranch size={18}/></div><div className="flex-1"><div className="text-[9px] font-mono text-slate-600 uppercase">Selected {selected.type}</div><h3 className="text-lg font-extrabold mt-1">{selected.name}</h3><div className="text-xs text-slate-500 mt-1">{selected.meta || 'Live database record'}</div></div><button onClick={()=>setSelectedId('')} className="text-slate-600"><X size={16}/></button></div><div className="grid md:grid-cols-3 gap-3 mt-4"><div className="metric"><div>DIRECT CONNECTIONS</div><strong>{connected.length}</strong></div><div className="metric"><div>OUTBOUND</div><strong>{(data.edges || []).filter((e:any)=>e.source_id===selected.id).length}</strong></div><div className="metric"><div>INBOUND</div><strong>{(data.edges || []).filter((e:any)=>e.target_id===selected.id).length}</strong></div></div>{connected.length>0&&<div className="mt-4 space-y-2">{connected.slice(0,8).map((n:any)=><div key={n.id} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3"><Pill tone="cyan">{n.type}</Pill><span className="text-xs font-semibold flex-1">{n.name}</span><ExternalLink size={13} className="text-slate-600"/></div>)}</div>}</section>}

    <section className="grid md:grid-cols-3 gap-4"><div className="glass rounded-2xl p-5"><div className="text-2xl font-black">{data.nodes.length}</div><div className="text-xs text-slate-500 mt-1">live graph nodes</div></div><div className="glass rounded-2xl p-5"><div className="text-2xl font-black">{data.edges.length}</div><div className="text-xs text-slate-500 mt-1">dependency edges</div></div><div className="glass rounded-2xl p-5"><div className="text-2xl font-black">{data.edges.filter((e:any)=>e.relation).length}</div><div className="text-xs text-slate-500 mt-1">traceable relationships</div></div></section>

    <section className="glass rounded-2xl p-5">
      <SectionTitle eyebrow="EDGE REGISTER" title="Traceable relationships" action={<Pill tone="cyan"><GitBranch size={12}/> LIVE GRAPH</Pill>}/>
      <div className="space-y-2">{data.edges.map((edge:any) => { const s=nodeMap.get(edge.source_id), t=nodeMap.get(edge.target_id); return <div key={edge.id || `${edge.source_id}-${edge.target_id}-${edge.relation}`} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-opacity ${selectedId && !edgeTouchesSelection(edge) ? 'opacity-30 border-white/[.03]' : 'border-white/[.06] bg-white/[.02]'}`}><Pill tone="bad">{s?.type || edge.source_type}</Pill><span className="text-xs font-semibold">{s?.name || edge.source_id?.slice(0,8)}</span><span className="text-slate-600">→</span><span className="text-xs text-slate-400">{edge.relation}</span><span className="text-slate-600">→</span><Pill tone="cyan">{t?.type || edge.target_type}</Pill><span className="text-xs font-semibold flex-1">{t?.name || edge.target_id?.slice(0,8)}</span>{edge.id&&<button onClick={()=>removeEdge(edge.id)} className="text-slate-600 hover:text-rose-300"><Trash2 size={14}/></button>}</div>; })}{!data.edges.length&&<div className="text-sm text-slate-600 p-5 text-center">No dependency edges yet. Create your first relationship to activate the fabric.</div>}</div>
    </section>

    {open && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"><div className="glass rounded-2xl w-full max-w-lg p-6 bg-[#0b1015]"><div className="flex items-center justify-between"><div><div className="text-[10px] font-mono tracking-widest text-slate-600">GRAPH MUTATION</div><h3 className="text-xl font-extrabold mt-1">Create dependency</h3></div><button onClick={()=>setOpen(false)} className="text-slate-500">✕</button></div><div className="space-y-3 mt-6"><label className="block text-xs text-slate-400">Event<select value={form.event_id} onChange={(e:any)=>setForm({...form,event_id:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"><option value="">Select event</option>{events.map((e:any)=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><label className="block text-xs text-slate-400">Source<select value={form.source_id} onChange={(e:any)=>setForm({...form,source_id:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"><option value="">Select source node</option>{nodes.map((n:any)=><option key={n.id} value={n.id}>[{n.type}] {n.name}</option>)}</select></label><label className="block text-xs text-slate-400">Target<select value={form.target_id} onChange={(e:any)=>setForm({...form,target_id:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"><option value="">Select target node</option>{nodes.filter((n:any)=>n.id!==form.source_id).map((n:any)=><option key={n.id} value={n.id}>[{n.type}] {n.name}</option>)}</select></label><label className="block text-xs text-slate-400">Relationship<input value={form.relation} onChange={(e:any)=>setForm({...form,relation:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"/></label></div><button onClick={addEdge} disabled={!form.event_id||!form.source_id||!form.target_id} className="w-full mt-5 rounded-xl bg-[var(--lime)] text-black py-3 font-bold text-sm disabled:opacity-40">Add dependency edge</button></div></div>}
  </div>;
}
