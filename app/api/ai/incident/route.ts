import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { eventId, simulation } = await req.json();
    if (!eventId || !simulation) return NextResponse.json({ error: 'eventId and simulation are required' }, { status: 400 });

    const supabase = await createClient();
    const [eventRes, tasksRes, teamsRes, resourcesRes, knowledgeRes] = await Promise.all([
      supabase.from('events').select('id,name,type,venue,start_at,end_at,status,risk,participants,capacity').eq('id', eventId).limit(1).maybeSingle(),
      supabase.from('tasks').select('id,title,owner,status,priority,impact_area,due_at').eq('event_id', eventId),
      supabase.from('teams').select('id,name,role,member_count,coverage,skills'),
      supabase.from('resources').select('id,name,kind,status,location,quantity'),
      supabase.from('knowledge_sources').select('title,source_type,content,verified').order('created_at', { ascending: false }).limit(12),
    ]);

    const context = JSON.stringify({
      verifiedEvent: eventRes.data || null,
      verifiedTasks: tasksRes.data || [],
      verifiedTeams: teamsRes.data || [],
      verifiedResources: resourcesRes.data || [],
      verifiedKnowledge: knowledgeRes.data || [],
      simulation,
    });

    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-5',
        instructions: 'You are NEXUS Operations Intelligence. Use only supplied verified records and the simulation. Clearly separate VERIFIED FACTS from ANALYSIS. Do not invent records. Return a concise incident briefing with sections: Situation, Verified Impact, Recovery Options, Operator Checks. Do not choose or authorize an option for the operator.',
        input: context,
      });
      return NextResponse.json({ mode: 'openai', answer: response.output_text, sourceBoundary: 'AI analysis based on supplied verified records.' });
    }

    const impacted = Array.isArray(simulation.impacts) ? simulation.impacts : [];
    const actions = Array.isArray(simulation.executionPlan) ? simulation.executionPlan : [];
    const answer = [
      'VERIFIED FACTS',
      `• Event: ${eventRes.data?.name || 'Unknown event'}`,
      `• Current venue: ${eventRes.data?.venue || 'Not recorded'}`,
      `• Incident: ${simulation.incident?.label || 'Operational incident'}`,
      `• Risk: ${simulation.risk || 'unknown'}`,
      `• Downstream records traced: ${impacted.length}`,
      '',
      'ANALYSIS',
      `• ${simulation.summary || 'The simulation identified downstream operational impact.'}`,
      `• ${actions.length} proposed plan step(s) require review before commit.`,
      '',
      'OPERATOR CHECKS',
      '• Confirm the proposed resource/team/task state is available before execution.',
      '• Review high or critical tasks and communication timing.',
      '• Approve only after the blast radius matches the operational plan.',
    ].join('\n');
    return NextResponse.json({ mode: 'deterministic', answer, sourceBoundary: 'Deterministic briefing from verified database records and simulation output.' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Incident intelligence failed' }, { status: 500 });
  }
}
