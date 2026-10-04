import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'knowledge source id is required' }, { status: 400 });
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_PARENT_PAGE_ID) {
    return NextResponse.json({ error: 'Set NOTION_API_KEY and NOTION_PARENT_PAGE_ID first.' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: source, error: sourceError } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (sourceError || !source) return NextResponse.json({ error: sourceError?.message || 'Knowledge source not found' }, { status: 404 });

  const notionContent = `${source.source_type} · ${source.verified ? 'VERIFIED' : 'UNVERIFIED'}\n\n${String(source.content || '').replace(/\\n/g, '\n')}`;
  const notionRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
    body: JSON.stringify({
      parent: { page_id: process.env.NOTION_PARENT_PAGE_ID },
      properties: { title: { title: [{ text: { content: source.title } }] } },
      children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: notionContent } }] } }],
    }),
  });

  const payload = await notionRes.json();
  if (!notionRes.ok) return NextResponse.json({ error: payload.message || 'Notion API error' }, { status: 502 });

  const { data: updated, error: updateError } = await supabase
    .from('knowledge_sources')
    .update({ notion_page_id: payload.id })
    .eq('id', id)
    .select('id,notion_page_id')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({
      error: `Notion page was created, but NEXUS could not save the sync state: ${updateError.message}`,
      notion_page_id: payload.id
    }, { status: 500 });
  }
  if (!updated?.notion_page_id) {
    return NextResponse.json({ error: 'Notion page was created, but the knowledge record was not updated.', notion_page_id: payload.id }, { status: 500 });
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    action: 'knowledge.notion_sync',
    entity_type: 'knowledge_source',
    entity_id: id,
    payload: { notion_page_id: payload.id }
  });
  if (auditError) return NextResponse.json({ ok: true, notion_page_id: payload.id, warning: auditError.message });

  return NextResponse.json({ ok: true, notion_page_id: payload.id, synced: true });
}
