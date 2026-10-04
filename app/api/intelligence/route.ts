import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { extractAnnouncement } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { text, persist = false } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'announcement text is required' }, { status: 400 });
  const localExtraction: any = extractAnnouncement(text);
  let extraction: any = localExtraction;
  let mode = 'local-parser';
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-6-astra',
        instructions: 'Extract operational event data from the announcement. Return ONLY JSON with keys title,type,date,time,venue,deadline,actions. Never invent missing values; use null for missing fields. actions must be an array of concise imperative tasks.',
        input: text,
      });
      const raw = response.output_text.trim();
      const aiExtraction = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/```$/i, ''));
      // Keep verified-looking deterministic fields when the model returns a
      // partial or malformed value. AI can enrich actions, but it must not
      // overwrite a confidently parsed date/venue/deadline with nonsense.
      extraction = {
        ...localExtraction,
        ...aiExtraction,
        date: localExtraction.date || aiExtraction.date || null,
        venue: localExtraction.venue || aiExtraction.venue || null,
        deadline: localExtraction.deadline || aiExtraction.deadline || null,
        time: localExtraction.time || aiExtraction.time || null,
        volunteerDeploymentTime: localExtraction.volunteerDeploymentTime || aiExtraction.volunteerDeploymentTime || null,
        speakerArrivalTime: localExtraction.speakerArrivalTime || aiExtraction.speakerArrivalTime || null,
        actions: Array.isArray(aiExtraction.actions) && aiExtraction.actions.length ? aiExtraction.actions : localExtraction.actions,
      };
      mode = 'openai';
    } catch { mode = 'local-parser-fallback'; }
  }
  let persisted = false;
  let persistenceError: string | null = null;
  let knowledgeId: string | null = null;
  if (persist && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('knowledge_sources').insert({ title: extraction.title || 'Imported announcement', source_type: 'announcement', content: text, verified: false, metadata: { extraction, mode } }).select().single();
    if (!error && data) { persisted = true; knowledgeId = data.id; }
    else persistenceError = error?.message || 'Knowledge source could not be written.';
  }
  return NextResponse.json({ extraction, mode, persisted, knowledgeId, persistenceError });
}
