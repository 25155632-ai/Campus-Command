# NEXUS//03 FINAL EDITION — Command OS

## The judge-facing story

NEXUS is an event operations command system built around one rule:

> The engine may propose. A human must authorize. PostgreSQL commits the state.

## End-to-end incident workflow

1. Select a real event from Supabase.
2. Select one of six incident classes:
   - Venue unavailable
   - Equipment/resource failure
   - Team unavailable
   - Volunteer shortage
   - Session/task delay
   - Network outage
3. Trace the real dependency graph.
4. Calculate downstream impact and conflicts.
5. Persist the simulation as a hypothetical run.
6. Generate a source-aware incident briefing.
7. Present a human approval gate.
8. Commit one atomic PostgreSQL transaction.
9. Return exact changed task IDs/counts from PostgreSQL.
10. Write an ops run and audit record.
11. Capture a reusable incident postmortem in `knowledge_sources`.
12. Optionally synchronize the knowledge record to Notion.

## Source boundary

- **Verified records:** direct Postgres records.
- **Simulation:** hypothetical until approval.
- **AI analysis:** generated from a server-side context packet and explicitly labeled.
- **Post-incident knowledge:** persisted as unverified knowledge until an operator verifies it.

## Supabase migration

Run `supabase/v10_final_command_os.sql` after the earlier project migrations. It is designed to be idempotent for the final RPC/policies and includes realtime publication updates plus demo data enrichment.

## Demo sequence

### 90-second boss fight

1. Open `/simulation`.
2. Select `KBC CodeRush 2026`.
3. Choose `Venue unavailable`.
4. Set `Hall B`.
5. Run impact simulation.
6. Show impact count, conflicts, downstream tasks and explanations.
7. Generate incident briefing.
8. Explain that the plan is still hypothetical.
9. Approve and execute.
10. Show exact database-returned venue transition, task count, ops run and knowledge capture.
11. Open `/audit` to show the recorded action.
12. Open `/knowledge` to show the reusable postmortem.
13. Optionally sync the postmortem to Notion.

### Second incident

Run `Volunteer shortage` against `Volunteers`, or `Network outage` against `Event Network`. The same engine handles the new failure class.

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NOTION_API_KEY=
NOTION_PARENT_PAGE_ID=
OPENAI_API_KEY=
OPENAI_MODEL=
```

Server secrets must remain outside `NEXT_PUBLIC_*` variables.
