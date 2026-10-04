# NEXUS//03 v2 architecture

```text
Browser
  │
  ├── Next.js App Router / UI
  │       ├── Command Deck
  │       ├── Events
  │       ├── Operations
  │       ├── Simulation
  │       └── Knowledge Graph
  │
  ▼
Next.js Route Handlers
  │
  ├── /api/events          → Postgres CRUD
  ├── /api/tasks           → Postgres task mutation
  ├── /api/simulation      → dependency traversal / risk model
  ├── /api/ai/brief        → database context → optional OpenAI Responses API
  └── /api/events/sync-notion → Postgres event → Notion page
  │
  ├───────────────┐
  ▼               ▼
Supabase       Notion
Postgres       Knowledge layer
Auth + RLS
```

## Data model

`events` is the operational root. `tasks`, `resources`, `teams` and `knowledge_sources` attach context to the event. `dependencies` stores directed relationships and powers the simulation engine. `audit_log` provides a future-ready trail for operator actions.

## Source boundary

- Verified records: stored in Postgres and labeled as records/sources.
- Simulation: computed from dependency edges and explicitly marked preview-only.
- AI output: generated only from supplied operational context and labeled as generated.

## Failure mode

Without Supabase environment variables the UI falls back to demonstration data so the visual prototype remains runnable. Once Supabase variables are present, the API routes switch to persistent database mode. Notion and OpenAI are optional integrations and return explicit configuration errors rather than silently pretending they are connected.
