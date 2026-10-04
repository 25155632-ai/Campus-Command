'use client';
import { useState } from 'react';
import { BrainCircuit, Database, FileScan, Sparkles, Wand2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Pill, SectionTitle } from '@/components/ui';

const sample = `KBC CodeRush hackathon — 2026-10-18 at Innovation Arena. Registration closes 2026-10-15. Bring your laptop and college ID. Volunteers should confirm their deployment before 08:30. Speaker arrival begins at 14:30.`;

export default function Intelligence() {
  const [text, setText] = useState(sample); const [result, setResult] = useState<any>(null); const [busy, setBusy] = useState(false); const [persist, setPersist] = useState(true);
  async function extract() { setBusy(true); const r = await fetch('/api/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,persist})}); const j=await r.json(); setResult(j); setBusy(false); }
  return <div className="space-y-6">
    <SectionTitle eyebrow="INTELLIGENCE PIPELINE" title="Messy input → operational system" action={<Pill tone="cyan"><BrainCircuit size={12}/> EXTRACTION READY</Pill>}/>
    <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-5">
      <section className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-cyan-400/10 border border-cyan-400/15 grid place-items-center"><FileScan className="text-cyan-300" size={18}/></div><div><div className="font-bold">Announcement intake</div><div className="text-[10px] text-slate-600 font-mono">UNSTRUCTURED SOURCE</div></div></div>
        <textarea value={text} onChange={e=>setText(e.target.value)} className="mt-5 w-full min-h-56 rounded-xl bg-[#080c10] border border-white/10 p-4 text-sm leading-6 outline-none focus:border-cyan-300/30" placeholder="Paste a WhatsApp message, poster text, club announcement or meeting note…"/>
        <label className="flex items-center gap-2 mt-4 text-xs text-slate-400"><input type="checkbox" checked={persist} onChange={e=>setPersist(e.target.checked)}/> Save source into the persistent knowledge layer</label>
        <button onClick={extract} disabled={busy || !text.trim()} className="mt-4 w-full rounded-xl bg-[var(--lime)] text-black py-3 font-bold text-sm disabled:opacity-40">{busy?<span className="animate-pulse">Extracting operational structure…</span>:<><Wand2 size={15} className="inline mr-2"/>Extract + structure</>}</button>
      </section>
      <section className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between"><div><div className="text-[10px] font-mono text-slate-600">STRUCTURED RESULT</div><h3 className="text-xl font-extrabold mt-1">{result?.extraction?.title || 'Waiting for an announcement'}</h3></div>{result&&<Pill tone={result.mode==='openai'?'cyan':'warn'}>{result.mode}</Pill>}</div>
        {!result ? <div className="mt-10 border border-dashed border-white/10 rounded-2xl p-10 text-center text-sm text-slate-600">The extracted event, deadline, venue and action graph will appear here.</div> : <div className="mt-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">{[['TYPE',result.extraction.type],['DATE',result.extraction.date||'Not found'],['EVENT TIME',result.extraction.time||'Not found'],['VENUE',result.extraction.venue||'Not found'],['REGISTRATION DEADLINE',result.extraction.deadline||'Not found'],['VOLUNTEER DEPLOYMENT',result.extraction.volunteerDeploymentTime||'Not found'],['SPEAKER ARRIVAL',result.extraction.speakerArrivalTime||'Not found']].map(([a,b])=><div key={a} className="rounded-xl bg-white/[.025] border border-white/[.06] p-3"><div className="text-[9px] font-mono text-slate-600">{a}</div><div className="text-sm mt-1">{b}</div></div>)}</div>
          <div className="text-[10px] font-mono text-slate-600 mt-4">PROPOSED ACTIONS</div>{(result.extraction.actions||[]).map((a:string,i:number)=><div key={a} className="flex gap-3 items-center rounded-xl border border-white/[.06] p-3"><div className="h-6 w-6 rounded-full bg-lime-300/10 text-lime-300 grid place-items-center text-[10px]">{i+1}</div><div className="text-xs flex-1">{a}</div><CheckCircle2 size={14} className="text-slate-600"/></div>)}
          <div className={`mt-4 rounded-xl border p-3 text-xs ${result.persisted ? 'border-lime-300/10 bg-lime-300/[.025] text-slate-300' : result.persistenceError ? 'border-red-300/10 bg-red-300/[.025] text-red-200' : 'border-cyan-400/10 bg-cyan-400/[.025] text-slate-400'}`}><Database size={14} className="inline mr-2 text-cyan-300"/>{result.persisted ? `Source persisted to Postgres knowledge_sources${result.knowledgeId ? ` · ${result.knowledgeId}` : ''}.` : result.persistenceError ? `Persistence failed: ${result.persistenceError}` : 'Preview only — no source was written.'}</div>
        </div>}
      </section>
    </div>
    <section className="grid md:grid-cols-3 gap-4"><div className="glass rounded-2xl p-5"><Sparkles size={17} className="text-cyan-300"/><div className="font-bold mt-4">AI when configured</div><p className="text-xs text-slate-500 mt-2">If an OpenAI key exists, extraction uses the server-side Responses API. Otherwise a deterministic parser keeps the demo functional.</p></div><div className="glass rounded-2xl p-5"><Database size={17} className="text-lime-300"/><div className="font-bold mt-4">Persistent source</div><p className="text-xs text-slate-500 mt-2">Imported announcements can become first-class knowledge records instead of disappearing after the demo.</p></div><div className="glass rounded-2xl p-5"><AlertTriangle size={17} className="text-amber-300"/><div className="font-bold mt-4">Human verification</div><p className="text-xs text-slate-500 mt-2">Imported AI output stays unverified until an operator confirms it, preserving the source boundary required by the brief.</p></div></section>
  </div>
}
