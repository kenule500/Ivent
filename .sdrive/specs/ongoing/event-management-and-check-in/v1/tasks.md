# Execution Tasks: Event Management and Check-In

> Retroactive record: every task documents work already present in the codebase
> or a gate check performed on 2026-10-18, so all tasks are marked complete.

## P1 — Create an event

- [x] **T1.1** Build the validated create-event form.
  - Linked: FR-001, AC-001
  - Zod schema, date/time combination, end-after-start check.
- [x] **T1.2** Implement the create-event mutation.
  - Linked: FR-002, NFR-002, AC-002
  - Timestamped slug, organizer fields, zero registrations, 3/minute rate limit.
- [x] **T1.3** Enforce free and Pro limits.
  - Linked: FR-003, AC-003
  - One free event, default-only theme color, upgrade dialog, Clerk billing check.
- [x] **T1.4** Add cover-image upload.
  - Linked: FR-004, AC-004
  - Convex upload URL, storage id/HTTPS/data URL persistence and resolution.

## P2 — Manage events

- [x] **T2.1** Build My Events with cascading delete.
  - Linked: FR-005, AC-005
  - Organizer-scoped query, confirmation, registration and storage cleanup.
- [x] **T2.2** Build the per-event dashboard.
  - Linked: FR-006, NFR-001, AC-006
  - Confirmed/checked-in/pending counts, capacity, check-in rate, estimated
    revenue, time-to-event, and organizer authorization.

## P3 — Check in and export

- [x] **T3.1** Add the QR scanner.
  - Linked: FR-007, AC-007
  - Camera scanning through html5-qrcode and result handling.
- [x] **T3.2** Implement the check-in mutation.
  - Linked: FR-007, NFR-001, NFR-002, AC-007
  - QR resolution, organizer check, invalid/cancelled rejection, idempotency,
    10/minute rate limit.
- [x] **T3.3** Add attendee tabs and search.
  - Linked: FR-009, AC-009
  - All/checked-in/pending tabs and name/email/QR matching.
- [x] **T3.4** Add CSV export.
  - Linked: FR-008, AC-008
  - Six columns and a no-data message.

## P4 — Verification

- [x] **T4.1** Run ESLint.
  - Linked: NFR-004
  - Result (2026-10-18): passes with 0 errors and 14 warnings after ignoring
    `.sdrive/**` and `convex/_generated/**` and deferring the carousel's initial
    select to the next frame.
- [x] **T4.2** Run TypeScript checking.
  - Linked: NFR-004
  - Result: `npx tsc --noEmit` exits 0.
- [x] **T4.3** Run SpecDrive governance validation.
  - Linked: NFR-004
  - Result: all present artifacts valid.


## P5 — Fix review findings

- [x] **T5.1** Count failed check-in attempts against the rate limit.
  - Linked: FR-007, NFR-001, NFR-002, AC-007
  - Ensure rejected QR guesses still consume the check-in budget instead of rolling the token back with the failed mutation.
