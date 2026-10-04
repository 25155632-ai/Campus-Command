import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ tasks: [], mode: 'database_error', error: 'Supabase environment variables are missing.' }, { status: 503 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('tasks').select('*').order('due_at', { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ tasks: [], mode: 'database_error', error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [], mode: 'database' });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are missing.' }, { status: 503 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('tasks').insert({
    event_id: body.event_id || null,
    title: String(body.title).trim(),
    owner: body.owner || null,
    status: body.status || 'todo',
    due_at: body.due_at ? new Date(body.due_at).toISOString() : null,
    impact_area: body.impact_area || null,
    priority: body.priority || 'medium',
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    action: 'task.created',
    entity_type: 'task',
    entity_id: data.id,
    payload: { title: data.title, event_id: data.event_id },
  });
  return NextResponse.json({ task: data, mode: 'database' }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ ok: true, mode: 'demo' });
  }
  const patch: Record<string, unknown> = {};
  for (const key of ['status', 'title', 'owner', 'event_id', 'impact_area', 'priority', 'due_at']) {
    if (body[key] !== undefined) patch[key] = key === 'due_at' && body[key] ? new Date(body[key]).toISOString() : body[key];
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    action: 'task.updated',
    entity_type: 'task',
    entity_id: data.id,
    payload: patch,
  });
  return NextResponse.json({ task: data, ok: true, mode: 'database' });
}
