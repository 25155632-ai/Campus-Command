import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      return NextResponse.json({
        nodes: [],
        edges: [],
        mode: 'database_error',
        error: 'Supabase environment variables are missing. NEXUS will not substitute demo graph data.',
      }, { status: 503 });
    }

    const supabase = await createClient();
    const [e, t, tm, r, d] = await Promise.all([
      supabase.from('events').select('id,name,venue').limit(12),
      supabase.from('tasks').select('id,title,event_id,status,priority').limit(24),
      supabase.from('teams').select('id,name,role,coverage').limit(12),
      supabase.from('resources').select('id,name,kind,status').limit(12),
      supabase.from('dependencies').select('id,event_id,source_id,source_type,target_id,target_type,relation').limit(80),
    ]);

    const firstError = [e, t, tm, r, d].find((x: any) => x.error)?.error;
    if (firstError) {
      return NextResponse.json({
        nodes: [],
        edges: [],
        mode: 'database_error',
        error: firstError.message,
      }, { status: 500 });
    }

    const nodes = [
      ...(e.data || []).map((x: any) => ({ id: x.id, type: 'event', name: x.name, meta: x.venue || '' })),
      ...(t.data || []).map((x: any) => ({ id: x.id, type: 'task', name: x.title, meta: `${x.status || 'todo'}${x.priority ? ` · ${x.priority}` : ''}`, event_id: x.event_id })),
      ...(tm.data || []).map((x: any) => ({ id: x.id, type: 'team', name: x.name, meta: `${x.role || 'team'}${x.coverage != null ? ` · ${x.coverage}% coverage` : ''}` })),
      ...(r.data || []).map((x: any) => ({ id: x.id, type: 'resource', name: x.name, meta: `${x.kind || 'resource'}${x.status ? ` · ${x.status}` : ''}` })),
    ];

    return NextResponse.json({ nodes, edges: d.data || [], mode: 'database' });
  } catch (error: any) {
    return NextResponse.json({ nodes: [], edges: [], mode: 'database_error', error: error?.message || 'Unable to load dependency fabric' }, { status: 500 });
  }
}
