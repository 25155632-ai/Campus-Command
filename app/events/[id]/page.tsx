'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ArrowLeft,ExternalLink,GitBranch,MapPin,CalendarDays,Users,Boxes,ClipboardList,BrainCircuit} from 'lucide-react';
import {Pill} from '@/components/ui';

type EventRecord={id:string;name:string;type?:string;venue?:string;start_at?:string;end_at?:string;status?:string;risk?:string;participants?:number;capacity?:number};

export default function EventDetail({params}:{params:{id:string}}){
  const [event,setEvent]=useState<EventRecord|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{(async()=>{try{const r=await fetch('/api/events',{cache:'no-store'});const j=await r.json();const found=(j.events||[]).find((x:EventRecord)=>String(x.id)===String(params.id));if(!found)throw new Error('Event not found');setEvent(found);}catch(e:any){setError(e.message||'Unable to load event');}finally{setLoading(false)}})()},[params.id]);
  if(loading)return <div className="glass rounded-2xl p-10 text-center text-sm text-slate-500">Loading event command view…</div>;
  if(error||!event)return <div className="space-y-4"><Link href="/events" className="text-xs text-slate-500 hover:text-white"><ArrowLeft size={14} className="inline mr-1"/>Back to events</Link><div className="glass rounded-2xl p-10 text-center text-sm text-rose-300">{error||'Event not found'}</div></div>;
  const risk=event.risk||'low';
  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-4"><Link href="/events" className="text-xs text-slate-500 hover:text-white"><ArrowLeft size={14} className="inline mr-1"/>Back to events</Link><div className="text-[10px] font-mono tracking-widest text-slate-600">EVENT COMMAND VIEW</div></div>
    <section className="glass rounded-3xl p-6 md:p-8 relative overflow-hidden"><div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-cyan-300/10 [transform:perspective(500px)_rotateX(62deg)]"/><div className="relative"><div className="flex flex-wrap items-center gap-2"><Pill tone="cyan">{event.type||'EVENT'}</Pill><Pill tone={risk==='high'||risk==='critical'?'bad':risk==='medium'?'warn':'good'}>{risk} risk</Pill><span className="text-[10px] font-mono text-emerald-400">● LIVE RECORD</span></div><h1 className="text-3xl md:text-5xl font-black tracking-tight mt-4">{event.name}</h1><div className="grid md:grid-cols-4 gap-3 mt-7">
      <Info icon={<MapPin size={15}/>} label="VENUE" value={event.venue||'—'}/>
      <Info icon={<CalendarDays size={15}/>} label="START" value={event.start_at?new Date(event.start_at).toLocaleString('en-IN'):'—'}/>
      <Info icon={<Users size={15}/>} label="PARTICIPANTS" value={String(event.participants??'—')}/>
      <Info icon={<Boxes size={15}/>} label="CAPACITY" value={String(event.capacity??'—')}/>
    </div></div></section>
    <div className="grid md:grid-cols-3 gap-4">
      <Action href={`/simulation?event=${encodeURIComponent(event.id)}`} icon={<GitBranch size={18}/>} title="Run simulation" text="Test an operational incident before committing changes." tone="cyan"/>
      <Action href="/operations" icon={<ClipboardList size={18}/>} title="Open operations" text="Review live tasks, ownership and escalations." tone="lime"/>
      <Action href="/intelligence" icon={<BrainCircuit size={18}/>} title="Open intelligence" text="Generate an incident briefing from verified data." tone="amber"/>
    </div>
    <section className="glass rounded-2xl p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-mono tracking-widest text-slate-600">OPERATIONAL CONTROL</div><h2 className="font-bold mt-1">Event is connected to the live fabric</h2></div><Link href={`/simulation?event=${encodeURIComponent(event.id)}`} className="rounded-xl bg-[var(--lime)] text-black px-4 py-2 text-xs font-bold">Open incident simulator <ExternalLink size={13} className="inline ml-1"/></Link></div><p className="text-xs text-slate-500 mt-3 max-w-3xl">Use the simulator to trace dependencies, calculate impact, review the proposed recovery plan and require human approval before the operational database is changed.</p></section>
  </div>
}

function Info({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4"><div className="text-cyan-300/70">{icon}</div><div className="text-[9px] font-mono tracking-widest text-slate-600 mt-3">{label}</div><div className="text-sm font-semibold mt-1 truncate">{value}</div></div>}
function Action({href,icon,title,text,tone}:{href:string;icon:React.ReactNode;title:string;text:string;tone:'cyan'|'lime'|'amber'}){const c=tone==='lime'?'text-lime-300':tone==='amber'?'text-amber-300':'text-cyan-300';return <Link href={href} className="glass rounded-2xl p-5 hover:bg-white/[.04] transition-colors focus-ring"><div className={c}>{icon}</div><h3 className="font-bold mt-4">{title}</h3><p className="text-xs text-slate-500 mt-2 leading-5">{text}</p><div className="text-[9px] font-mono tracking-widest text-slate-600 mt-5">OPEN →</div></Link>}
