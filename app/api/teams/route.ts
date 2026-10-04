import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('teams').select('*').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ teams: data ?? [], mode: 'database' });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from('teams').insert({
    name: String(body.name).trim(),
    role: String(body.role || 'operations'),
    member_count: Number(body.member_count || 0),
    coverage: Math.max(0, Math.min(100, Number(body.coverage ?? 100))),
    skills: Array.isArray(body.skills) ? body.skills : [],
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    action: 'team.created',
    entity_type: 'team',
    entity_id: data.id,
    payload: { name: data.name },
  });
  return NextResponse.json({ team: data, mode: 'database' }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const patch: Record<string, unknown> = {};
  for (const key of ['name', 'role', 'member_count', 'coverage', 'skills']) {
    if (body[key] !== undefined) patch[key] = key === 'coverage'
      ? Math.max(0, Math.min(100, Number(body[key])))
      : body[key];
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('teams').update(patch).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    action: 'team.updated',
    entity_type: 'team',
    entity_id: data.id,
    payload: patch,
  });
  return NextResponse.json({ team: data, mode: 'database' });
}
