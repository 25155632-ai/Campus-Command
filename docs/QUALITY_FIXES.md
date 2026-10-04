# NEXUS//03 Quality Fixes

This edition includes the QA fixes found during the command-center verification pass.

## Included

- Knowledge sidebar label and clickable persistent knowledge records.
- Dedicated knowledge detail route.
- Notion sync now verifies the Postgres `notion_page_id` write instead of silently returning success.
- Knowledge detail and Notion content render escaped `\\n` as real line breaks.
- Intelligence parser now separates event time from volunteer deployment and speaker-arrival times and correctly extracts registration deadlines and venues.
- Intelligence API reports persistence errors instead of claiming preview/success ambiguously.
- Autopilot uses the real KBC CodeRush task blast radius for the Hall B demo trigger instead of a string that cannot exist in the dependency graph.
- Autopilot proposals are persisted to `ops_runs` and human approve/discard decisions are audited.
- `v11_quality_fixes.sql` aligns the demo RLS policies with the anonymous command-center client.

## Database step

After the existing v10 migration, run:

`supabase/v11_quality_fixes.sql`

Do not put `.env.local` or Notion secrets in source control.
