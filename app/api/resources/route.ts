import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('resources').select('*').order('kind').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ resources: data ?? [], mode: 'database' });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name?.trim() || !body.kind?.trim()) {
    return NextResponse.json({ error: 'name and kind are required' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('resources').insert({
    name: String(body.name).trim(),
    kind: String(body.kind).trim(),
    location: body.location ? String(body.location).trim() : null,
    status: String(body.status || 'available'),
    quantity: Number(body.quantity || 1),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    action: 'resource.created',
    entity_type: 'resource',
    entity_id: data.id,
    payload: { name: data.name, kind: data.kind },
  });
  return NextResponse.json({ resource: data, mode: 'database' }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const patch: Record<string, unknown> = {};
  for (const key of ['name', 'kind', 'location', 'status', 'quantity']) {
    if (body[key] !== undefined) patch[key] = key === 'quantity' ? Number(body[key]) : body[key];
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from('resources').update(patch).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    action: 'resource.updated',
    entity_type: 'resource',
    entity_id: data.id,
    payload: patch,
  });
  return NextResponse.json({ resource: data, mode: 'database' });
}
