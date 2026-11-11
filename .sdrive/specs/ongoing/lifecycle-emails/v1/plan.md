# Plan: Lifecycle Emails (v1)

## Architecture Summary

Four lifecycle templates live in one server-side registry that renders subject plus
HTML/text from a fully escaped context. Dispatch is an **idempotent record-then-send**
action: the key (`registrationId + template`) is written before the provider call, so a
repeated cron sweep or a retry finds the row and returns early. Two cron sweeps enqueue
reminders and follow-ups; the registration mutation only *schedules* the confirmation, so
provider latency and outages never reach the mutation. One preference check in the
dispatch path suppresses optional email, while the confirmation is flagged transactional
and bypasses it.

## Components

| Component | Action | Requirements |
|-----------|--------|--------------|
| `convex/lifecycleTemplates.ts` | create | FR-001, FR-009 |
| `convex/lifecycleDispatch.ts` | create | FR-002, FR-005, FR-006 |
| `convex/emailLog.ts` | modify | FR-008 |
| `convex/schema.ts` | modify | FR-001, FR-005 |
| `convex/crons.ts` | modify | FR-003, FR-004 |
| `convex/registrations.ts` | modify | FR-002, FR-007 |
| `app/(main)/my-tickets/page.tsx` | modify | FR-007 |
| `app/admin/health/page.tsx` | modify | FR-008 |

## Data Model

- **`emailEvents`** — `template` extended with `registration_confirmation`, `reminder_24h`,
  `post_event_thankyou`, `feedback_request`; new `registrationId`, `idempotencyKey`,
  `attempts`. Existing rows stay valid.
- **`registrations`** — optional `emailOptOut` (default false).

Flow: registration → schedule dispatch → dispatch writes the key row → provider call →
row updated to `sent` or `failed` with the reason. The sweeps only select registrations
with **no row** for the template, so repeats are no-ops. Cancellation stops future
reminders because the sweeps filter on `confirmed`.

## Key Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-001 | Record the idempotency key before sending | A crash between send and record would otherwise duplicate; a crash after record is caught by the existing row |
| D-002 | Confirmation is transactional, everything else optional | An opt-out must never mean "no record of my registration" |
| D-003 | Schedule, never await, in the mutation | Provider latency must not become registration latency |
| D-004 | One preference check in dispatch, not per template | Per-template checks drift; the transactional flag is the only exception |

## Testing Strategy

- **Unit:** template rendering escapes values and contains only its own context; key builder is stable.
- **Integration (Convex test harness):** repeated sweep sends once; cancelled registration gets no reminder; failing send stops at the attempt limit and stays `failed`; opted-out attendee receives no reminder but keeps the confirmation.
- **Manual:** sandbox inbox check (`MAILTRAP_USE_SANDBOX`) for all four templates.

## Risks

| Risk | Mitigation |
|------|------------|
| Cron restart double-sends | Key written before dispatch; sweeps select only unkeyed registrations |
| Provider outage blocks registration | Schedule-only; failures recorded, never thrown |
| Opt-out honoured inconsistently | Single preference check plus a transactional flag |
