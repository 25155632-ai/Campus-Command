# NEXUS//03 FINAL EDITION — Event Command OS

A full-stack operational command center for KBC-NOTION-03: **Intelligent Team Operations & Event Command Center**.

## What is final in this edition

- Real Supabase/Postgres events, tasks, teams, resources, dependencies, simulations, operations runs, audit records and knowledge.
- Six incident classes: venue, resource, team, volunteer, task delay and network outage.
- Deterministic dependency traversal and conflict/risk analysis.
- Hypothetical simulation persisted before execution.
- Source-aware incident intelligence with OpenAI optional and deterministic fallback.
- Human approval gate before every live incident commit.
- Atomic PostgreSQL RPC for live state mutation.
- Exact database-returned task counts and IDs in the commit result.
- Automatic incident postmortem capture in the knowledge layer.
- Notion bridge for events and knowledge records.
- Supabase Realtime refresh across operational surfaces.
- Dependency Fabric with edge mutation.
- Dedicated Audit Trail surface.
- Role-oriented Operations, Teams and Resources surfaces.
- No browser localStorage as the source of truth.

## Stack

Next.js 14 · React 18 · TypeScript · Tailwind · Supabase/Postgres/Auth · Notion API · optional OpenAI Responses API.

## Setup

1. Install Node.js.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Run the existing `supabase/schema.sql` for a fresh database.
5. For an existing project, run the earlier migrations already supplied with the project, then run **`supabase/v10_final_command_os.sql`**.
6. Fill the Supabase environment values.
7. Optional: configure Notion with `NOTION_API_KEY` and `NOTION_PARENT_PAGE_ID`.
8. Optional: configure `OPENAI_API_KEY` and `OPENAI_MODEL` for the AI incident briefing. Without it, the deterministic briefing remains functional.
9. Run `npm run dev`.

## Verification

```bash
npm run typecheck
npm run build
```

## Judge demo

Start at `/simulation` and run the venue incident. Then show the second incident class to demonstrate that NEXUS is an operations engine rather than a single hard-coded scenario.

The final workflow is:

**REAL DATA → TRACE → IMPACT → SIMULATE → INTELLIGENCE → HUMAN APPROVAL → ATOMIC COMMIT → AUDIT → KNOWLEDGE → NOTION**

See `docs/FINAL_EDITION.md` for the full demo script.
