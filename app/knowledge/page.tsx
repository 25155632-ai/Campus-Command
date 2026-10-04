'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { BookOpen, FileText, Link2, Search, Sparkles, ShieldCheck, Database, RefreshCw, ExternalLink } from 'lucide-react';
import { Pill, SectionTitle } from '@/components/ui';
import { useRealtimeRefresh } from '@/lib/use-realtime-refresh';

export default function Knowledge() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/knowledge${q ? `?q=${encodeURIComponent(q)}` : ''}`, { cache: 'no-store' });
    const j = await r.json();
    setRows(j.sources || []);
  }, [q]);
  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(['knowledge_sources', 'audit_log'], load);

  async function ask() {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q || 'What operational knowledge should the incident commander review right now?' }) });
      const data = await response.json();
      setAnswer(data.answer || data.error || 'No answer available.');
    } finally { setLoading(false); }
  }

  async function sync(id: string) {
    setSyncing(id);
    try {
      const r = await fetch('/api/knowledge/sync-notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Notion sync failed');
      await load();
    } catch (e: any) { alert(e.message || 'Notion sync failed'); }
    finally { setSyncing(null); }
  }

  return <div className="space-y-6">
    <SectionTitle eyebrow="KNOWLEDGE LAYER" title="Operational memory" action={<div className="flex gap-2"><Pill tone="good"><ShieldCheck size={12}/> SOURCE-AWARE</Pill><button onClick={load} className="rounded-lg border border-white/10 p-2 text-slate-400"><RefreshCw size={14}/></button></div>}/>
    <div className="glass rounded-2xl p-5">
      <div className="flex gap-3"><div className="flex-1 relative"><Search size={16} className="absolute left-3 top-3.5 text-slate-600"/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ask()}} placeholder="Search verified records or ask the operational graph…" className="w-full rounded-xl bg-[#0b0f13] border border-white/10 py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-300/30"/></div><button onClick={ask} disabled={loading} className="rounded-xl bg-white/[.05] border border-white/10 px-4 text-cyan-300 disabled:opacity-50"><Sparkles size={16}/></button></div>
      <div className="mt-5 grid lg:grid-cols-[.85fr_1.15fr] gap-5">
        <div className="rounded-2xl bg-[#0b0f13] border border-white/[.06] p-5 min-h-52"><div className="text-[10px] font-mono text-slate-600 mb-4">ANSWER TRACE</div>{answer?<div className="text-sm leading-6 text-slate-300 whitespace-pre-wrap">{answer}</div>:<div className="text-sm leading-6 text-slate-500">Ask a question. The intelligence layer receives current database context and distinguishes verified records from generated analysis.</div>}<div className="mt-5 flex gap-2 flex-wrap"><Pill tone="cyan"><Link2 size={11}/> Postgres</Pill><Pill><Link2 size={11}/> Simulation</Pill><Pill><Link2 size={11}/> Incident history</Pill></div></div>
        <div><div className="text-[10px] font-mono text-slate-600 mb-3">PERSISTENT RECORDS · {rows.length}</div><div className="space-y-2 max-h-[340px] overflow-auto pr-1">{rows.map(n=><div key={n.id} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3 hover:border-cyan-300/20 hover:bg-white/[.035] transition"><Link href={`/knowledge/${n.id}`} className="block"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-white/[.04] grid place-items-center"><FileText size={14} className="text-slate-500"/></div><div className="flex-1 min-w-0"><div className="text-xs font-semibold truncate">{n.title}</div><div className="text-[10px] text-slate-600 mt-1">{n.source_type} · {new Date(n.created_at).toLocaleString('en-IN')}</div></div><Pill tone={n.verified?'good':'warn'}>{n.verified?'VERIFIED':'UNVERIFIED'}</Pill></div><p className="text-[10px] text-slate-500 mt-3 line-clamp-2">{n.content}</p><div className="text-[10px] text-cyan-300 mt-3">Open postmortem →</div></Link><div className="flex gap-2 mt-3"><button onClick={()=>sync(n.id)} disabled={syncing===n.id || !!n.notion_page_id} className={`text-[10px] rounded-lg border border-white/10 px-2.5 py-1.5 ${n.notion_page_id?'text-emerald-300':'text-slate-400'} disabled:opacity-50`}><ExternalLink size={11} className="inline mr-1"/>{syncing===n.id?'Syncing…':n.notion_page_id?'Synced to Notion':'Sync to Notion'}</button></div></div>)}{!rows.length&&<div className="text-sm text-slate-600 p-6 text-center">No knowledge records found.</div>}</div></div>
      </div>
    </div>
    <section className="grid md:grid-cols-3 gap-4"><div className="glass rounded-2xl p-5"><BookOpen size={17} className="text-cyan-300"/><div className="font-bold mt-4">Notion memory</div><p className="text-xs text-slate-500 mt-2">Resolved incidents can be pushed into a real Notion parent page when credentials are configured.</p></div><div className="glass rounded-2xl p-5"><ShieldCheck size={17} className="text-lime-300"/><div className="font-bold mt-4">Verified boundary</div><p className="text-xs text-slate-500 mt-2">Database records, imported sources and AI analysis remain visibly distinguishable.</p></div><div className="glass rounded-2xl p-5"><Database size={17} className="text-amber-300"/><div className="font-bold mt-4">Persistent source</div><p className="text-xs text-slate-500 mt-2">Post-incident knowledge is stored in Postgres instead of disappearing after a browser refresh.</p></div></section>
  </div>;
}
