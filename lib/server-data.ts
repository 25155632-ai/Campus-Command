import { createClient } from '@/lib/supabase/server';

/**
 * Server-side dashboard data is intentionally database-only.
 * We do not silently fall back to demo-data: a demo command center must
 * reflect the records that actually exist in Postgres.
 */
export async function getEvents() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('events').select('*').order('start_at', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function getTasks() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('tasks').select('*').order('due_at', { ascending: true, nullsFirst: false });
  if (error) return [];
  return data ?? [];
}

export async function getOperationalStats() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { people: 0, teams: 0, resources: 0, dependencies: 0 };
  }
  const supabase = await createClient();
  const [teams, resources, dependencies] = await Promise.all([
    supabase.from('teams').select('member_count'),
    supabase.from('resources').select('id'),
    supabase.from('dependencies').select('id'),
  ]);
  return {
    people: (teams.data || []).reduce((sum: number, x: any) => sum + Number(x.member_count || 0), 0),
    teams: teams.data?.length || 0,
    resources: resources.data?.length || 0,
    dependencies: dependencies.data?.length || 0,
  };
}
