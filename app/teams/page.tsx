'use client';

import { useCallback, useEffect, useState } from 'react';
import { BriefcaseBusiness, Code2, Megaphone, ShieldCheck, UsersRound, Plus, RefreshCw, Pencil } from 'lucide-react';
import { Pill, SectionTitle } from '@/components/ui';
import { useRealtimeRefresh } from '@/lib/use-realtime-refresh';

const icons: Record<string, any> = {
  operations: BriefcaseBusiness,
  technical: Code2,
  marketing: Megaphone,
  registration: ShieldCheck,
  volunteers: UsersRound,
};

export default function Teams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [mode, setMode] = useState('database');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState({ name: '', role: 'operations', member_count: 1, coverage: 100, skills: '' });

  const load = useCallback(async () => {
    const r = await fetch('/api/teams', { cache: 'no-store' });
    const j = await r.json();
    if (r.ok) {
      setError('');
      setTeams(j.teams || []);
      setMode(j.mode || 'database');
    } else {
      setError(j.error || 'Could not load teams');
    }
    const tr = await fetch('/api/tasks', { cache: 'no-store' });
    const tj = await tr.json();
    setTasks(tj.tasks || []); if (!tr.ok && !error) setError(tj.error || 'Could not load tasks');
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(['teams'], load);

  function startEdit(team: any) {
    setEdit(team);
    setForm({
      name: team.name,
      role: team.role,
      member_count: team.member_count,
      coverage: team.coverage,
      skills: (team.skills || []).join(', '),
    });
    setOpen(true);
  }

  async function save() {
    const payload = {
      ...(edit ? { id: edit.id } : {}),
      name: form.name,
      role: form.role,
      member_count: Number(form.member_count),
      coverage: Number(form.coverage),
      skills: form.skills.split(',').map((x) => x.trim()).filter(Boolean),
    };
    const r = await fetch('/api/teams', {
      method: edit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) return alert(j.error || 'Unable to save team');
    setOpen(false);
    setEdit(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle eyebrow="PEOPLE GRAPH" title="Teams & responsibility" action={<Pill tone={mode === 'database' ? 'good' : 'warn'}>{mode.toUpperCase()}</Pill>} />
        <div className="flex gap-2 -mt-5">
          <button onClick={load} className="rounded-xl border border-white/10 p-2.5 text-slate-400"><RefreshCw size={15} /></button>
          <button onClick={() => { setEdit(null); setForm({ name: '', role: 'operations', member_count: 1, coverage: 100, skills: '' }); setOpen(true); }} className="rounded-xl bg-[var(--lime)] text-black px-3 text-xs font-bold"><Plus size={15} className="inline mr-1" />New team</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-300/20 bg-rose-300/[.04] p-4 text-xs text-rose-200"><b>Database error:</b> {error}</div>}

      <div className="glass rounded-2xl p-5">
        <SectionTitle eyebrow="TEAM READINESS" title="Operational coverage" />
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-2">
          {teams.map((team) => {
            const owned = tasks.filter((t) => {
              const owner = String(t.owner || '').toLowerCase();
              const name = String(team.name || '').toLowerCase();
              const role = String(team.role || '').toLowerCase();
              return owner === name || owner.includes(name) || owner === role || owner.includes(role);
            });
            const active = owned.filter((t) => t.status !== 'done').length;
            const risk = Number(team.coverage) < 85 || owned.some((t) => ['blocked'].includes(t.status) || ['high','critical'].includes(t.priority));
            return (
              <div key={`readiness-${team.id}`} className="rounded-xl border border-white/[.06] bg-white/[.02] p-4">
                <div className="flex items-center justify-between gap-2"><div className="text-xs font-semibold truncate">{team.name}</div><Pill tone={risk ? 'warn' : 'good'}>{risk ? 'AT RISK' : 'READY'}</Pill></div>
                <div className="mt-3 text-[10px] font-mono text-slate-600">COVERAGE</div>
                <div className="flex items-center gap-2 mt-1"><div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(0, Math.min(100, Number(team.coverage) || 0))}%` }} /></div><span className="text-xs font-mono">{team.coverage}%</span></div>
                <div className="mt-3 text-[10px] text-slate-500">{active} active task{active === 1 ? '' : 's'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teams.map((team) => {
          const I = icons[team.role] || UsersRound;
          return (
            <div key={team.id} className="glass rounded-2xl p-5 hover:border-white/15 transition">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/[.04] grid place-items-center"><I size={18} /></div>
                <Pill tone={Number(team.coverage) < 85 ? 'warn' : 'good'}>{team.coverage}% COVERAGE</Pill>
              </div>
              <div className="mt-5 text-lg font-bold">{team.name}</div>
              <div className="text-xs text-slate-500 mt-1">{team.member_count} people · {team.role}</div>
              <div className="mt-3 text-[10px] font-mono text-slate-600">RESPONSIBILITIES</div>
              <div className="mt-1 text-sm text-slate-300">{tasks.filter((t) => { const owner = String(t.owner || '').toLowerCase(); const name = String(team.name || '').toLowerCase(); const role = String(team.role || '').toLowerCase(); return owner === name || owner.includes(name) || owner === role || owner.includes(role); }).length} linked tasks</div>
              <div className="flex flex-wrap gap-1 mt-4">{(team.skills || []).map((skill: string) => <span key={skill} className="text-[9px] px-2 py-1 rounded-full bg-white/[.035] border border-white/[.06] text-slate-500">{skill}</span>)}</div>
              <div className="h-1.5 bg-white/5 rounded-full mt-5"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${team.coverage}%` }} /></div>
              <button onClick={() => startEdit(team)} className="mt-4 text-[10px] font-mono text-slate-500 hover:text-white"><Pencil size={12} className="inline mr-1" />EDIT RECORD</button>
            </div>
          );
        })}
      </div>

      {error && <div className="rounded-xl border border-rose-300/20 bg-rose-300/[.04] p-4 text-xs text-rose-200"><b>Database error:</b> {error}</div>}

      <div className="glass rounded-2xl p-5">
        <SectionTitle eyebrow="ROLE MATRIX" title="Who owns what" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[9px] uppercase tracking-widest font-mono text-slate-600"><tr><th className="py-3">Capability</th><th>Owner</th><th>Backup</th><th>Status</th></tr></thead>
            <tbody>
              {[['Venue operations','Operations','Facilities','ready'],['Speaker logistics','Hospitality','Operations','ready'],['AV & streaming','Technical','Stage','risk'],['Participant communications','Marketing','Registration','ready'],['Volunteer dispatch','Volunteers','Operations','risk']].map(r =>
                <tr key={r[0]} className="border-t border-white/[.06]"><td className="py-3 font-semibold">{r[0]}</td><td className="text-slate-400">{r[1]}</td><td className="text-slate-500">{r[2]}</td><td><Pill tone={r[3] === 'risk' ? 'warn' : 'good'}>{r[3]}</Pill></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
        <div className="glass rounded-2xl w-full max-w-lg p-6 bg-[#0b1015]">
          <div className="flex items-center justify-between"><div><div className="text-[10px] font-mono tracking-widest text-slate-600">DATABASE RECORD</div><h3 className="text-xl font-extrabold mt-1">{edit ? 'Edit team' : 'New team'}</h3></div><button onClick={() => setOpen(false)} className="text-slate-500">✕</button></div>
          <div className="grid md:grid-cols-2 gap-3 mt-6">
            <label className="block text-xs text-slate-400 md:col-span-2">Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm outline-none" /></label>
            <label className="block text-xs text-slate-400">Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm"><option>operations</option><option>technical</option><option>marketing</option><option>registration</option><option>volunteers</option><option>hospitality</option></select></label>
            <label className="block text-xs text-slate-400">Members<input type="number" min="0" value={form.member_count} onChange={e => setForm({ ...form, member_count: Number(e.target.value) })} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm" /></label>
            <label className="block text-xs text-slate-400">Coverage %<input type="number" min="0" max="100" value={form.coverage} onChange={e => setForm({ ...form, coverage: Number(e.target.value) })} className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm" /></label>
            <label className="block text-xs text-slate-400 md:col-span-2">Skills<input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="dispatch, escalation, AV" className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm" /></label>
          </div>
          <button onClick={save} className="w-full mt-5 rounded-xl bg-[var(--lime)] text-black py-3 font-bold text-sm">{edit ? 'Save changes' : 'Create team'}</button>
        </div>
      </div>}
    </div>
  );
}
