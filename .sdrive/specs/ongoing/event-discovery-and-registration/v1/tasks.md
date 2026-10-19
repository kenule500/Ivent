# Execution Tasks: Event Discovery and Registration

> Retroactive record: every task documents work already present in the codebase
> or a gate check performed on 2026-10-18, so all tasks are marked complete.

## P1 — Discovery surfaces

- [x] **T1.1** Build the explore aggregation page.
  - Linked: FR-001, NFR-001, AC-001, AC-002
  - Featured carousel, nearby events, popular events, category counts, and
    per-section loading/empty states.
- [x] **T1.2** Add category and location explore routes.
  - Linked: FR-002, AC-003, AC-004
  - Resolve a slug as category id or `city-state`; paginate at 10; not-found on
    an unknown slug.
- [x] **T1.3** Build the public event page with CTA states.
  - Linked: FR-003, FR-004, AC-005, AC-006
  - Detail layout, share action, and registered/past/full/organizer/default CTA.
- [x] **T1.4** Add title search.
  - Linked: FR-011, AC-013
  - Minimum two characters, upcoming only, five results.

## P2 — Registration and tickets

- [x] **T2.1** Gate registration behind sign-in.
  - Linked: FR-005, NFR-003, AC-007, AC-008
  - Signed-out users get a message; signed-in users get the name/email modal.
- [x] **T2.2** Implement the registration mutation.
  - Linked: FR-006, FR-007, NFR-002, AC-008, AC-009
  - Capacity check, duplicate check, cancelled reactivation, QR generation, and
    count increment.
- [x] **T2.3** Build My Tickets with QR display.
  - Linked: FR-008, AC-010
  - Upcoming vs past split; QR dialog with ticket ID.
- [x] **T2.4** Add attendee cancellation.
  - Linked: FR-009, NFR-002, AC-011
  - Ownership check in the mutation; status change and count decrement.

## P3 — Personalisation

- [x] **T3.1** Implement attendee onboarding.
  - Linked: FR-010, AC-012
  - At least three interests, Nigerian state and city, persistence, and the
    attendee-page trigger.

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

- [x] **T5.1** Add per-section empty states to Explore.
  - Linked: FR-001, NFR-001, AC-002
  - Render an empty state for the featured carousel and the Events Near Events section when their lists are empty, without hiding the rest of the page.
- [x] **T5.2** Use the resolved Convex user id for the organizer CTA.
  - Linked: FR-004, AC-006
  - Compare event.organizerId with the current user Convex _id rather than the Clerk user.id so organizers see Manage Event.
