'use client';

import { useCallback, useEffect, useState } from 'react';
import { Boxes, Plus, RefreshCw, Pencil, MapPin, PackageCheck } from 'lucide-react';
import { Pill, SectionTitle } from '@/components/ui';
import { useRealtimeRefresh } from '@/lib/use-realtime-refresh';

export default function Resources() {
  const [resources, setResources] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', kind: 'venue', location: '', status: 'available', quantity: 1 });

  const load = useCallback(async () => {
    const r = await fetch('/api/resources', { cache: 'no-store' });
    const j = await r.json();
    if (r.ok) { setResources(j.resources || []); setError(''); } else { setResources([]); setError(j.error || 'Could not load resources'); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(['resources'], load);

  function startEdit(resource: any) {
    setEdit(resource);
    setForm({ name: resource.name, kind: resource.kind, location: resource.location || '', status: resource.status, quantity: resource.quantity });
    setOpen(true);
  }

  async function save() {
    const payload = { ...(edit ? { id: edit.id } : {}), ...form, quantity: Number(form.quantity) };
    const r = await fetch('/api/resources', { method: edit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (!r.ok) return alert(j.error || 'Unable to save resource');
    setOpen(false); setEdit(null); await load();
  }

  const statusTone = (s: string) => s === 'available' || s === 'ready' ? 'good' : s === 'reserved' ? 'cyan' : s === 'maintenance' ? 'bad' : 'warn';

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <SectionTitle eyebrow="RESOURCE FABRIC" title="Resources & venues" action={<Pill tone="good"><PackageCheck size={12}/> POSTGRES</Pill>} />
      <div className="flex gap-2 -mt-5"><button onClick={load} className="rounded-xl border border-white/10 p-2.5 text-slate-400"><RefreshCw size={15}/></button><button onClick={() => { setEdit(null); setForm({ name:'',kind:'venue',location:'',status:'available',quantity:1 }); setOpen(true); }} className="rounded-xl bg-[var(--lime)] text-black px-3 text-xs font-bold"><Plus size={15} className="inline mr-1"/>New resource</button></div>
    </div>

    {error && <div className="rounded-xl border border-rose-300/20 bg-rose-300/[.04] p-4 text-xs text-rose-200"><b>Database error:</b> {error}</div>}

    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {resources.map((r) => <div key={r.id} className="glass rounded-2xl p-5">
        <div className="flex items-start justify-between"><div className="h-10 w-10 rounded-xl bg-white/[.04] grid place-items-center text-rose-300"><Boxes size={18}/></div><Pill tone={statusTone(r.status)}>{r.status}</Pill></div>
        <div className="mt-5 text-lg font-bold">{r.name}</div>
        <div className="text-xs text-slate-500 mt-1 uppercase font-mono">{r.kind} · qty {r.quantity}</div>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-4"><MapPin size={12}/>{r.location || 'Unspecified location'}</div>
        <button onClick={() => startEdit(r)} className="mt-5 text-[10px] font-mono text-slate-500 hover:text-white"><Pencil size={12} className="inline mr-1"/>EDIT RECORD</button>
      </div>)}
      {!resources.length && <div className="glass rounded-2xl p-8 text-sm text-slate-500">No resources found.</div>}
    </div>

    <div className="glass rounded-2xl p-5"><SectionTitle eyebrow="OPERATIONS NOTE" title="Resources are graph nodes" /><p className="text-sm text-slate-400 max-w-3xl leading-6">Venue, equipment and utility records can be connected to tasks and teams through the dependency fabric. A resource update therefore becomes an observable operational change instead of an isolated field edit.</p></div>

    {open && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"><div className="glass rounded-2xl w-full max-w-lg p-6 bg-[#0b1015]">
      <div className="flex items-center justify-between"><div><div className="text-[10px] font-mono tracking-widest text-slate-600">DATABASE RECORD</div><h3 className="text-xl font-extrabold mt-1">{edit ? 'Edit resource' : 'New resource'}</h3></div><button onClick={() => setOpen(false)} className="text-slate-500">✕</button></div>
      <div className="grid md:grid-cols-2 gap-3 mt-6">
        <label className="block text-xs text-slate-400 md:col-span-2">Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"/></label>
        <label className="block text-xs text-slate-400">Kind<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"><option>venue</option><option>equipment</option><option>utility</option><option>transport</option><option>other</option></select></label>
        <label className="block text-xs text-slate-400">Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"><option>available</option><option>reserved</option><option>ready</option><option>maintenance</option><option>offline</option></select></label>
        <label className="block text-xs text-slate-400">Quantity<input type="number" min="1" value={form.quantity} onChange={e=>setForm({...form,quantity:Number(e.target.value)})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"/></label>
        <label className="block text-xs text-slate-400">Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"/></label>
      </div>
      <button onClick={save} className="w-full mt-5 rounded-xl bg-[var(--lime)] text-black py-3 font-bold text-sm">{edit?'Save changes':'Create resource'}</button>
    </div></div>}
  </div>;
}
