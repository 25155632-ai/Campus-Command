'use client';
import { useState } from 'react';
import { AlertTriangle, ArrowRight, Check, CircleDot, Play, ShieldCheck, Sparkles, Workflow } from 'lucide-react';

const demoTrigger = 'Hall B';
const demo = [
  { order: 1, target: 'Re-route robotics volunteers', targetType: 'task', action: 'Escalate and assign backup owner', reason: 'Venue change propagates into volunteer dispatch', approvalRequired: false },
  { order: 2, target: 'Notify registered participants', targetType: 'task', action: 'Review downstream readiness', reason: 'Venue information must remain consistent', approvalRequired: false },
  { order: 3, target: 'Confirm speaker arrival windows', targetType: 'task', action: 'Review downstream readiness', reason: 'Schedule and venue information must remain consistent', approvalRequired: false },
  { order: 4, target: 'Inventory HDMI capture kits', targetType: 'task', action: 'Review downstream readiness', reason: 'Equipment placement may change with the venue', approvalRequired: false }
];

export default function Autopilot() {
  const [plan, setPlan] = useState<any>(null);
  const [opsRunId, setOpsRunId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [approved, setApproved] = useState(false);
  const [message, setMessage] = useState('');

  async function run() {
    setRunning(true); setApproved(false); setMessage('');
    try {
      const r = await fetch('/api/autopilot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ triggerId: demoTrigger }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Autopilot trace failed');
      setPlan(j.plan); setOpsRunId(j.opsRunId || null);
      if (j.opsRunId) setMessage('Proposal persisted to Postgres. Nothing has been committed.');
    } catch (e: any) { setMessage(e.message || 'Autopilot trace failed'); }
    finally { setRunning(false); }
  }

  async function decide(action: 'approve' | 'discard') {
    if (!opsRunId) { if (action === 'approve') setApproved(true); else setPlan(null); return; }
    try {
      const r = await fetch('/api/autopilot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, opsRunId }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Decision failed');
      if (action === 'approve') { setApproved(true); setMessage('Human approval recorded. No operational state was committed by Autopilot.'); }
      else { setPlan(null); setOpsRunId(null); setMessage('Proposal discarded and recorded.'); }
    } catch (e: any) { setMessage(e.message || 'Decision failed'); }
  }

  const p = plan || { risk: 'high', impactedCount: 4, blockedCount: 1, actions: demo };
  return <div className="space-y-6">
    <section className="hero-grid glass rounded-3xl p-6 md:p-8 overflow-hidden"><div className="relative z-10 max-w-3xl"><div className="eyebrow"><Sparkles size={13}/> AUTONOMOUS OPERATIONS LAYER</div><h1 className="text-4xl md:text-6xl font-black tracking-[-.04em] mt-3">Don't just see the incident.<br/><span className="text-[var(--lime)]">Orchestrate the response.</span></h1><p className="text-slate-400 mt-4 max-w-2xl">NEXUS traces a proposed change through the dependency fabric, identifies what can break, drafts the operational response, and waits for a human approval before execution.</p></div><div className="hero-orbit"><div className="orbit-core"><Workflow size={30}/></div><span className="orbit-node n1">EVENT</span><span className="orbit-node n2">TEAM</span><span className="orbit-node n3">RESOURCE</span><span className="orbit-node n4">TASK</span></div></section>
    <div className="grid md:grid-cols-[1.05fr_.95fr] gap-5">
      <section className="panel p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">TRIGGER</div><h2 className="text-xl font-bold mt-1">Venue change detected</h2></div><span className="status-chip risk-high"><AlertTriangle size={13}/> HIGH IMPACT</span></div><div className="mt-5 timeline"><div><b>14:08</b><span>Operator proposes <strong>Hall B</strong> for the main robotics block.</span></div><div><b>14:08</b><span>Dependency fabric identifies downstream records.</span></div><div><b>14:09</b><span>Autopilot drafts an action plan; nothing is committed.</span></div></div><button onClick={run} disabled={running} className="btn-primary mt-6"><Play size={16}/>{running ? 'Tracing fabric…' : 'Run impact autopilot'}</button></section>
      <section className="panel p-5"><div className="eyebrow">SYSTEM READOUT</div><div className="grid grid-cols-3 gap-3 mt-4">{[['RISK',p.risk.toUpperCase()],['IMPACTED',p.impactedCount],['BLOCKED',p.blockedCount]].map(([a,b])=><div className="metric" key={a as string}><div>{a}</div><strong>{b}</strong></div>)}</div><div className="mt-5 p-4 rounded-2xl bg-black/20 border border-white/[.06]"><div className="text-xs text-slate-500">CONTROL POLICY</div><p className="text-sm text-slate-300 mt-2">AI may recommend. Operators authorize. The database records the decision.</p></div></section>
    </div>
    {message && <div className="panel p-4 text-sm text-slate-300 border-cyan-300/10">{message}</div>}
    <section className="panel p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">PROPOSED RESPONSE</div><h2 className="text-xl font-bold mt-1">Execution queue</h2></div>{approved?<span className="status-chip status-ok"><Check size={13}/> APPROVED</span>:<span className="status-chip"><ShieldCheck size={13}/> HUMAN GATE</span>}</div><div className="mt-4 space-y-2">{p.actions.map((a:any)=><div className="action-row" key={a.order}><div className="action-index">{a.order}</div><div className="min-w-0 flex-1"><div className="font-semibold">{a.action}</div><div className="text-xs text-slate-500 mt-1">{a.target} · {a.reason}</div></div>{a.approvalRequired&&<span className="text-[10px] font-mono text-amber-300">APPROVAL</span>}<ArrowRight size={15} className="text-slate-600"/></div>)}</div><div className="flex flex-wrap gap-3 mt-5"><button className="btn-primary" disabled={approved} onClick={()=>decide('approve')}><Check size={16}/>Approve plan</button><button className="btn-secondary" onClick={()=>decide('discard')}>Discard</button></div></section>
    <section className="panel p-5"><div className="eyebrow">SAFETY MODEL</div><div className="grid md:grid-cols-4 gap-3 mt-4">{['Trace','Simulate','Approve','Commit'].map((x,i)=><div className="step-card" key={x}><div className="text-xs font-mono text-slate-600">0{i+1}</div><CircleDot size={18}/><b>{x}</b><span>{['Follow relationships','Calculate blast radius','Human decision gate','Write state + audit'][i]}</span></div>)}</div></section>
  </div>
}
