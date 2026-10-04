# NEXUS//03 v3 — Beast Mode Architecture

```text
                     ┌─────────────────────────┐
                     │       COMMAND DECK      │
                     │ live state + operator UX│
                     └────────────┬────────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
          ▼                       ▼                        ▼
     EVENT REGISTRY        OPERATIONS ROOM         INTELLIGENCE
          │                       │                        │
          └──────────────┬────────┴──────────────┬─────────┘
                         ▼                       ▼
                 SUPABASE / POSTGRES       OPENAI RESPONSES
                         │                       │
          ┌──────────────┼──────────────┐        │
          ▼              ▼              ▼        │
      DEPENDENCIES     AUDIT        KNOWLEDGE ◄──┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                 IMPACT / RISK ENGINE
                         │
                ┌────────┴────────┐
                ▼                 ▼
          WHAT-IF REPORT      ACTION QUEUE
                │                 │
                └────────┬────────┘
                         ▼
                    NOTION SYNC
```

## Design principles

- A change is previewed before it is applied.
- AI-generated or extracted information is unverified until an operator confirms it.
- Relationships are first-class records, not decorative lines.
- Every meaningful mutation can be audited.
- The system continues to demo without external AI by using deterministic fallbacks.
- Secrets remain server-side.


## v4 — Autonomous Operations Layer

v4 adds a human-gated orchestration loop: trace dependencies → calculate impact → draft actions → request approval → commit state → audit the decision. The system deliberately does not auto-apply high-risk changes. `ops_policies` defines role-specific action boundaries and `ops_runs` stores the proposed/approved/committed plan.

### Demo story
1. Open **Autopilot**.
2. Run the Hall B impact trace.
3. Show the blast radius and proposed actions.
4. Explain the human gate.
5. Approve the plan.
6. Commit the chosen action through the real database integration.
7. Show the audit trail / Notion knowledge update.

This turns the dependency graph into an operational control loop rather than a visualization-only feature.
