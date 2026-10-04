import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('id,title,source_type,source_url,content,metadata,verified,notion_page_id,created_at,updated_at')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Knowledge record not found.' }, { status: 404 });
  return NextResponse.json({ source: data, mode: 'database' });
}
