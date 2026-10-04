'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, CircleAlert, Users, Activity, ArrowUpRight, Plus } from 'lucide-react';
import { Pill, SectionTitle } from '@/components/ui';
import { useRealtimeRefresh } from '@/lib/use-realtime-refresh';

export default function Operations() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [mode, setMode] = useState('database');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', owner: 'Operations', event_id: '', priority: 'medium', impact_area: 'operational', due_at: '' });

  const load = useCallback(async () => {
    const [tr, er] = await Promise.all([
      fetch('/api/tasks', { cache: 'no-store' }),
      fetch('/api/events', { cache: 'no-store' }),
    ]);
    const tj = await tr.json(); const ej = await er.json();
    setTasks(tj.tasks || []); setEvents(ej.events || []); setMode(tj.mode || 'database');
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(['tasks', 'events'], load);

  async function toggle(t: any) {
    const next = t.status === 'done' ? 'todo' : 'done';
    const r = await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, status: next }) });
    if (!r.ok) { const j = await r.json(); return alert(j.error || 'Task update failed'); }
    setTasks(a => a.map(x => x.id === t.id ? { ...x, status: next } : x));
  }

  async function createTask() {
    if (!form.title.trim()) return;
    const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      ...form,
      event_id: form.event_id || null,
      due_at: form.due_at || null,
    }) });
    const j = await r.json();
    if (!r.ok) return alert(j.error || 'Task creation failed');
    setOpen(false); setForm({ title:'', owner:'Operations', event_id: form.event_id, priority:'medium', impact_area:'operational', due_at:'' });
    await load();
  }

  const done = tasks.filter(t => t.status === 'done').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <SectionTitle eyebrow="LIVE CONTROL" title="Operations room" action={<Pill tone={mode === 'database' ? 'good' : 'warn'}>{mode === 'database' ? 'DATABASE CONNECTED' : 'DEMO FABRIC'}</Pill>} />
      <div className="flex gap-2 -mt-5"><button onClick={load} className="rounded-xl border border-white/10 p-2.5 text-slate-400"><RefreshCw size={15}/></button><button onClick={()=>setOpen(true)} className="rounded-xl bg-[var(--lime)] text-black px-3 text-xs font-bold"><Plus size={15} className="inline mr-1"/>New task</button></div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="glass rounded-2xl p-4"><div className="text-2xl font-black">{tasks.length}</div><div className="text-xs text-slate-500 mt-1">live tasks</div></div>
      <div className="glass rounded-2xl p-4"><div className="text-2xl font-black">{done}</div><div className="text-xs text-slate-500 mt-1">completed</div></div>
      <div className="glass rounded-2xl p-4"><div className="text-2xl font-black">{blocked}</div><div className="text-xs text-slate-500 mt-1">blocked</div></div>
      <div className="glass rounded-2xl p-4"><div className="text-2xl font-black">{events.length}</div><div className="text-xs text-slate-500 mt-1">events linked</div></div>
    </div>

    <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-5">
      <section className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5"><div><div className="text-xs font-semibold">LIVE TASK QUEUE</div><div className="text-[10px] text-slate-600 mt-1 font-mono">REALTIME · POSTGRES</div></div><div className="text-right"><div className="text-2xl font-black">{done}/{tasks.length}</div><div className="text-[10px] text-slate-600">actions cleared</div></div></div>
        <div className="space-y-1">{tasks.map((t,i)=><button key={t.id} onClick={()=>toggle(t)} className="w-full text-left flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/[.03]">
          <div className={`h-6 w-6 rounded-full grid place-items-center border ${t.status==='done'?'border-emerald-400/30 bg-emerald-400/10 text-emerald-300':'border-white/10 text-slate-600'}`}>{t.status==='done'?<Check size={13}/>:<span className="text-[10px]">{i+1}</span>}</div>
          <div className="flex-1 min-w-0"><div className={`text-xs ${t.status==='done'?'line-through text-slate-600':''}`}>{t.title}</div><div className="text-[10px] text-slate-600 mt-1">{t.owner||'Unassigned'} · {t.impact_area||'operational'} {t.event_id?'· linked event':''}</div></div>
          {t.status==='blocked'?<Pill tone="bad">BLOCKED</Pill>:t.status==='progress'?<Pill tone="cyan">IN PROGRESS</Pill>:t.status==='done'?<Pill tone="good">DONE</Pill>:<Pill>TODO</Pill>}
        </button>)}</div>
        {!tasks.length && <div className="py-10 text-center text-sm text-slate-600">No tasks in the database.</div>}
      </section>

      <section className="glass rounded-2xl p-5"><SectionTitle eyebrow="ROLE VIEW" title="Team coverage"/>
        <div className="space-y-4">{[['Operations','8 / 8',100],['Technical','7 / 9',78],['Marketing','5 / 5',100],['Registration','4 / 4',100],['Volunteers','31 / 37',84]].map(([n,c,p])=><div key={String(n)} className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-white/[.035] grid place-items-center"><Users size={15}/></div><div className="flex-1"><div className="flex justify-between text-xs"><span>{n}</span><span className="font-mono text-slate-500">{c}</span></div><div className="h-1.5 rounded-full bg-white/5 mt-2"><div className={`h-full rounded-full ${Number(p)<90?'bg-amber-300':'bg-emerald-400'}`} style={{width:`${p}%`}}/></div></div></div>)}</div>
        <div className="mt-6 rounded-xl border border-amber-400/10 bg-amber-400/[.04] p-4"><div className="flex gap-2"><CircleAlert size={16} className="text-amber-300"/><div><div className="text-xs font-semibold">Escalation window</div><p className="text-[10px] text-slate-500 mt-1">Task state is persisted and visible to every connected operator surface.</p></div></div></div>
      </section>
    </div>

    <section className="grid md:grid-cols-3 gap-4"><div className="glass rounded-2xl p-5"><Activity size={17} className="text-cyan-300"/><div className="font-bold mt-4">Live status</div><p className="text-xs text-slate-500 mt-2">Task changes are written to Postgres and subscribed to through Supabase Realtime.</p></div><div className="glass rounded-2xl p-5"><ArrowUpRight size={17} className="text-lime-300"/><div className="font-bold mt-4">Escalation path</div><p className="text-xs text-slate-500 mt-2">Blocked actions stay visible until an operator resolves or reassigns them.</p></div><div className="glass rounded-2xl p-5"><CircleAlert size={17} className="text-rose-300"/><div className="font-bold mt-4">Risk rule</div><p className="text-xs text-slate-500 mt-2">Dependency impact can elevate an event from medium to high or critical before changes are applied.</p></div></section>

    {open && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"><div className="glass rounded-2xl w-full max-w-lg p-6 bg-[#0b1015]">
      <div className="flex items-center justify-between"><div><div className="text-[10px] font-mono tracking-widest text-slate-600">CREATE OPERATIONAL RECORD</div><h3 className="text-xl font-extrabold mt-1">New task</h3></div><button onClick={()=>setOpen(false)} className="text-slate-500">✕</button></div>
      <div className="space-y-3 mt-6">
        <label className="block text-xs text-slate-400">Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-slate-400">Owner<input value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"/></label>
          <label className="block text-xs text-slate-400">Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"><option>low</option><option>medium</option><option>high</option><option>critical</option></select></label>
        </div>
        <label className="block text-xs text-slate-400">Event<select value={form.event_id} onChange={e=>setForm({...form,event_id:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"><option value="">Unlinked</option>{events.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <label className="block text-xs text-slate-400">Impact area<input value={form.impact_area} onChange={e=>setForm({...form,impact_area:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"/></label>
        <label className="block text-xs text-slate-400">Due<input type="datetime-local" value={form.due_at} onChange={e=>setForm({...form,due_at:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"/></label>
      </div>
      <button onClick={createTask} className="w-full mt-5 rounded-xl bg-[var(--lime)] text-black py-3 font-bold text-sm">Create task</button>
    </div></div>}
  </div>;
}
