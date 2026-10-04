'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Database, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { Pill } from '@/components/ui';

type Source = {
  id: string;
  title: string;
  source_type: string;
  source_url?: string | null;
  content: string;
  metadata?: Record<string, unknown> | null;
  verified: boolean;
  notion_page_id?: string | null;
  created_at: string;
  updated_at: string;
};

export default function KnowledgeDetail({ params }: { params: { id: string } }) {
  const [source, setSource] = useState<Source | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/knowledge/${params.id}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Unable to load knowledge record.');
      setSource(j.source);
    } catch (e: any) {
      setError(e.message || 'Unable to load knowledge record.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params.id]);

  if (loading) return <div className="glass rounded-2xl p-8 text-sm text-slate-500">Loading operational memory…</div>;
  if (error || !source) return <div className="space-y-4"><Link href="/knowledge" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15}/> Back to Knowledge</Link><div className="glass rounded-2xl p-8 text-sm text-red-300">{error || 'Knowledge record not found.'}</div></div>;

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-4">
      <Link href="/knowledge" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15}/> Knowledge</Link>
      <button onClick={load} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><RefreshCw size={14}/></button>
    </div>

    <section className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono text-cyan-300 tracking-[.2em]">OPERATIONAL MEMORY</div>
          <h1 className="text-2xl font-black tracking-tight mt-2">{source.title}</h1>
          <div className="flex flex-wrap gap-2 mt-4">
            <Pill><BookOpen size={11}/> {source.source_type}</Pill>
            <Pill tone={source.verified ? 'good' : 'warn'}>{source.verified ? <CheckCircle2 size={11}/> : <ShieldCheck size={11}/>} {source.verified ? 'VERIFIED' : 'UNVERIFIED'}</Pill>
            {source.notion_page_id && <Pill tone="cyan">NOTION SYNCED</Pill>}
          </div>
        </div>
        {source.source_url && <a href={source.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:text-white"><ExternalLink size={13}/> Source</a>}
      </div>
    </section>

    <div className="grid lg:grid-cols-[1.4fr_.6fr] gap-5">
      <section className="glass rounded-2xl p-6">
        <div className="text-[10px] font-mono text-slate-600 mb-3">POST-EVENT KNOWLEDGE</div>
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{String(source.content || '').replace(/\\n/g, '\n')}</div>
      </section>
      <aside className="space-y-4">
        <div className="glass rounded-2xl p-5"><Database size={17} className="text-amber-300"/><div className="font-bold mt-4">Persistent source</div><p className="text-xs text-slate-500 mt-2">This record is stored in Postgres and survives browser refreshes and new sessions.</p></div>
        <div className="glass rounded-2xl p-5"><ShieldCheck size={17} className="text-lime-300"/><div className="font-bold mt-4">Verification boundary</div><p className="text-xs text-slate-500 mt-2">Verified operational records remain distinguishable from generated analysis.</p></div>
        <div className="glass rounded-2xl p-5 text-xs text-slate-500"><div>Created</div><div className="text-slate-300 mt-1">{new Date(source.created_at).toLocaleString('en-IN')}</div><div className="mt-3">Updated</div><div className="text-slate-300 mt-1">{new Date(source.updated_at).toLocaleString('en-IN')}</div></div>
      </aside>
    </div>
  </div>;
}
