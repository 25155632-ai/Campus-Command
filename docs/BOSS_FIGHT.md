# NEXUS//03 — Boss Fight / Incident Command

## Demo flow

1. Open **Simulation / Incident Command**.
2. Pick an event with a registered current venue.
3. Choose a different replacement venue.
4. Run **Impact Simulation**.
5. Review the blast radius and execution plan.
6. Click **Approve & execute change**.
7. The commit route updates the live event venue, venue resource states, affected tasks, creates a participant communication task when needed, writes an `ops_runs` record, and writes an `audit_log` entry.
8. Supabase Realtime refreshes the operational views after the database mutation.

## Database migration

Run `supabase/v5_live_fabric.sql` once after applying the base schema. The migration is safe to rerun and adds realtime publication for `ops_runs` plus indexes used by incident traversal.

## Important

The returned project intentionally does **not** contain `.env.local`. Keep your Supabase and API credentials in the local project.

## v7 Commit Transaction Fix

If the browser reaches the Human Gate but commit fails with `cannot coerce it to a single JSON object`, run `supabase/v7_boss_fight_commit.sql` once in Supabase SQL Editor.

The commit route now uses `nexus_commit_venue_change(...)`, a transactional `SECURITY DEFINER` function. This avoids duplicate venue rows and browser-anon RLS/PostgREST single-row coercion problems and commits the event, resources, impacted tasks, communication task, `ops_runs`, and `audit_log` as one database transaction.

## v9 — Multi-Incident Recovery Engine

The Simulation surface now supports four real incident classes:

- Venue unavailable
- Equipment / resource failure
- Team unavailable
- Volunteer shortage

All use the same workflow: trace → impact → simulate → human approval → transactional commit → audit.

Run `supabase/v9_multi_incident.sql` once in Supabase SQL Editor after the v8 migration. The migration creates `nexus_commit_incident()` and enriches the KBC CodeRush dependency graph with team/resource edges.
