# NEXUS//03 FINAL EDITION — Setup

## Existing project (recommended)

1. Keep your existing `.env.local` exactly as-is.
2. Replace your project folder with this ZIP's project.
3. Run `npm install`.
4. In Supabase SQL Editor, paste the full contents of `supabase/v10_final_command_os.sql` and press **Run**.
5. Then run the full contents of `supabase/v11_quality_fixes.sql` once. This enables the anonymous demo client to persist knowledge/autopilot governance records.
6. Run `npm run typecheck`.
7. Run `npm run dev`.
8. Open `/simulation`.

## Fresh Supabase project

Run `supabase/schema.sql` first, then `supabase/v10_final_command_os.sql`.

## Optional Notion

Set:

```env
NOTION_API_KEY=
NOTION_PARENT_PAGE_ID=
```

Share the parent page with the Notion integration.

## Optional AI

Set:

```env
OPENAI_API_KEY=
OPENAI_MODEL=
```

If no AI key is configured, the incident briefing uses the deterministic database-backed fallback.

## Demo verification

- Run venue incident and confirm `Innovation Arena → Hall B` (or your current venue → selected venue).
- Confirm task count is returned by PostgreSQL.
- Open `/audit` and confirm `incident.commit`.
- Open `/knowledge` and confirm the incident postmortem was captured.
- Try `Volunteer shortage`, `Network outage`, `Resource failure` and `Task delay`.
