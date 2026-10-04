import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get('eventId');
  const supabase = await createClient();
  let query = supabase.from('dependencies').select('*').order('created_at', { ascending: true });
  if (eventId) query = query.eq('event_id', eventId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dependencies: data ?? [], mode: 'database' });
}

export async function POST(req: Request) {
  const body = await req.json();
  for (const key of ['event_id', 'source_type', 'source_id', 'target_type', 'target_id', 'relation']) {
    if (!body[key]) return NextResponse.json({ error: `${key} is required` }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('dependencies').insert({
    event_id: body.event_id,
    source_type: body.source_type,
    source_id: body.source_id,
    target_type: body.target_type,
    target_id: body.target_id,
    relation: body.relation,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    action: 'dependency.created',
    entity_type: 'dependency',
    entity_id: data.id,
    payload: data,
  });
  return NextResponse.json({ dependency: data, mode: 'database' }, { status: 201 });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from('dependencies').delete().eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    action: 'dependency.deleted',
    entity_type: 'dependency',
    entity_id: data.id,
    payload: data,
  });
  return NextResponse.json({ ok: true, dependency: data });
}
