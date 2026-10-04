# NEXUS//03 — Final Demo Runbook

## 0. Database setup
1. Run `supabase/v13_final_demo_access.sql` once in Supabase SQL Editor.
2. If you want a clean database, run `supabase/RESET_DEMO_DATA.sql`.
3. Do **not** rerun the historical seed migrations for the clean demo.

## 1. Build sanity check
```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run dev
```
If `typecheck` is unavailable, use `npx tsc --noEmit`.

## 2. Create clean base data
Create resources first:
- Main Auditorium — venue — reserved — 1 — North Block
- HDMI Capture Kit — equipment — available — 2 — Tech Store
- Volunteer Check-in Desk — utility — ready — 1 — Main Auditorium
- Innovation Arena — venue — available — 1 — Innovation Arena

Create teams:
- Technical Operations — technical — 4 members — 100% — AV, streaming, power
- Volunteer Operations — volunteers — 12 members — 92% — dispatch, crowd, logistics
- Participant Communications — marketing — 3 members — 100% — comms, registration

Create event:
- NEXUS CodeRush 2026
- Hackathon
- Main Auditorium
- 18 Oct 2026, 09:00
- 184 participants / 240 capacity

Create tasks:
- Inventory HDMI capture kits — Technical Operations — high — todo
- Confirm speaker arrival windows — Technical Operations — high — todo
- Reroute robotics volunteers — Volunteer Operations — high — todo
- Notify participants: venue changed to Main Auditorium — Participant Communications — high — todo
- Confirm Main Auditorium availability — Technical Operations — critical — todo

## 3. Dependency graph
Create edges for the event:
- Confirm Main Auditorium availability → Inventory HDMI capture kits
- Confirm Main Auditorium availability → Reroute robotics volunteers
- Confirm Main Auditorium availability → Confirm speaker arrival windows
- Confirm Main Auditorium availability → Notify participants: venue changed to Main Auditorium

## 4. Boss-fight demo
1. Open the event.
2. Open Simulation.
3. Select `Venue unavailable`.
4. Proposed venue: `Innovation Arena`.
5. Run impact simulation.
6. Show the blast radius and execution plan.
7. Explain: **ENGINE PROPOSES · HUMAN AUTHORIZES · POSTGRES COMMITS**.
8. Click `Approve & execute change`.
9. Show `INCIDENT RESOLVED`, `LIVE STATE COMMITTED`, `OPS RUN: AUDITED`, `KNOWLEDGE: CAPTURED`.
10. Open Knowledge and then the Notion page.

## 5. Intelligence test text
Use this exact announcement:

> KBC CodeRush 2026 is a hackathon on 2026-10-18. The event starts at 09:00 at Main Auditorium. Volunteers must report by 08:00. Speakers should arrive at 14:00. Registration closes on 2026-10-15. Bring your laptop and ID card.

Expected extraction:
- Type: Hackathon
- Date: 2026-10-18
- Event time: 09:00
- Venue: Main Auditorium
- Volunteer deployment: 08:00
- Speaker arrival: 14:00
- Registration deadline: 2026-10-15
- Actions include registration, materials, volunteer and speaker logistics.

## 6. Failure policy
The final build deliberately does **not** silently replace database errors with demo records on Events or Tasks. If Postgres fails, the UI shows a database error so a broken connection cannot masquerade as a working system.
