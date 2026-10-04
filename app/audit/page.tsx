'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, ShieldCheck, Database, Clock3 } from 'lucide-react';
import { Pill, SectionTitle } from '@/components/ui';
import { useRealtimeRefresh } from '@/lib/use-realtime-refresh';

export default function AuditPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    setBusy(true);
    const r = await fetch('/api/audit?limit=60', { cache: 'no-store' });
    const j = await r.json();
    setRows(j.audit || []);
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(['audit_log', 'ops_runs'], load);

  return <div className="space-y-6">
    <SectionTitle eyebrow="GOVERNANCE LAYER" title="Audit trail" action={<div className="flex gap-2 items-center"><Pill tone="good"><ShieldCheck size={11}/> IMMUTABLE RECORDING</Pill><button onClick={load} className="rounded-lg border border-white/10 p-2 text-slate-400"><RefreshCw size={14} className={busy?'animate-spin':''}/></button></div>}/>
    <section className="grid md:grid-cols-3 gap-3"><div className="glass rounded-2xl p-5"><ClipboardList size={17} className="text-cyan-300"/><div className="text-2xl font-black mt-4">{rows.length}</div><div className="text-xs text-slate-500 mt-1">recent records</div></div><div className="glass rounded-2xl p-5"><Database size={17} className="text-lime-300"/><div className="text-2xl font-black mt-4">Postgres</div><div className="text-xs text-slate-500 mt-1">source of truth</div></div><div className="glass rounded-2xl p-5"><ShieldCheck size={17} className="text-emerald-300"/><div className="text-2xl font-black mt-4">Human gate</div><div className="text-xs text-slate-500 mt-1">required before commit</div></div></section>
    <section className="glass rounded-2xl p-5"><div className="text-[10px] font-mono tracking-widest text-slate-600">CHRONOLOGICAL EVENT LOG</div><div className="space-y-2 mt-4">{rows.map(row=><div key={row.id} className="rounded-xl border border-white/[.06] bg-white/[.02] p-4"><div className="flex flex-wrap gap-3 items-center"><div className="h-8 w-8 rounded-lg bg-white/[.03] grid place-items-center"><Clock3 size={14} className="text-slate-500"/></div><div className="flex-1"><div className="text-xs font-semibold">{row.action}</div><div className="text-[10px] text-slate-600 mt-1">{row.entity_type} · {row.entity_id || 'system'} · {new Date(row.created_at).toLocaleString('en-IN')}</div></div><Pill tone="cyan">VERIFIED RECORD</Pill></div><details className="mt-3"><summary className="cursor-pointer text-[10px] text-slate-600">View payload</summary><pre className="mt-2 overflow-auto rounded-lg bg-black/20 border border-white/[.04] p-3 text-[10px] text-slate-500">{JSON.stringify(row.payload || {}, null, 2)}</pre></details></div>)}{!rows.length&&<div className="text-center py-10 text-sm text-slate-600">No audit records available.</div>}</div></section>
  </div>;
}
