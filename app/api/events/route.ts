import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ events: [], mode: 'database_error', error: 'Supabase environment variables are missing.' }, { status: 503 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('events').select('*').order('start_at', { ascending: true });
  if (error) return NextResponse.json({ events: [], mode: 'database_error', error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [], mode: 'database' });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name || !body.venue || !body.start_at) return NextResponse.json({ error: 'name, venue and start_at are required' }, { status: 400 });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are missing.' }, { status: 503 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('events').insert({
    name: body.name,
    type: body.type || 'Event',
    venue: body.venue,
    start_at: new Date(body.start_at).toISOString(),
    end_at: body.end_at ? new Date(body.end_at).toISOString() : null,
    status: 'planned',
    risk: 'low',
    participants: Number(body.participants || 0),
    capacity: Number(body.capacity || 0),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({ action: 'event.created', entity_type: 'event', entity_id: data.id, payload: { name: data.name, venue: data.venue } });
  return NextResponse.json({ event: data, mode: 'database' }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return NextResponse.json({ ok: true, mode: 'demo' });
  const patch: Record<string, unknown> = {};
  for (const key of ['name', 'type', 'venue', 'status', 'risk', 'participants', 'capacity']) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  for (const key of ['start_at', 'end_at']) {
    if (body[key] !== undefined) patch[key] = body[key] ? new Date(body[key]).toISOString() : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('events').update(patch).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({ action: 'event.updated', entity_type: 'event', entity_id: data.id, payload: patch });
  return NextResponse.json({ event: data, mode: 'database' });
}
