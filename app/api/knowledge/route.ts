import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() || '';
  const supabase = await createClient();
  let query = supabase.from('knowledge_sources').select('id,title,source_type,source_url,content,metadata,verified,notion_page_id,created_at,updated_at').order('created_at', { ascending: false }).limit(50);
  if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data || [], mode: 'database' });
}
