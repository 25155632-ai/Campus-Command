import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') || 40), 100);
  const supabase = await createClient();
  const { data, error } = await supabase.from('audit_log').select('id,action,entity_type,entity_id,payload,created_at').order('created_at', { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ audit: data || [], mode: 'database' });
}
