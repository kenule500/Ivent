# Tasks: Lifecycle Emails (v1)

## P0 — Data and templates
- [ ] **T1.1** Extend the schema for lifecycle delivery — FR-001, FR-005 / AC-001, AC-004
- [ ] **T1.2** Build the template registry and escaping renderer — FR-001, FR-009 / AC-001, AC-003, AC-008

## P1 — Dispatch
- [ ] **T2.1** Build the idempotent dispatch action — FR-002, FR-005, FR-006, FR-009 / AC-001, AC-004, AC-005, AC-008
- [ ] **T2.2** Bound and record retries — FR-006 / AC-005

## P2 — Triggers
- [ ] **T3.1** Schedule the confirmation at registration — FR-002 / AC-001
- [ ] **T3.2** Add the reminder sweep — FR-003, FR-005 / AC-002, AC-004
- [ ] **T3.3** Add the follow-up sweep — FR-004, FR-005 / AC-003, AC-004, AC-006

## P3 — Preferences and visibility
- [ ] **T4.1** Add the attendee email preference — FR-007, NFR-001 / AC-006
- [ ] **T4.2** Show lifecycle delivery in admin — FR-008 / AC-007

## P4 — Verification
- [ ] **T5.1** Prove the one-recipient and escaping rules — FR-009, NFR-003 / AC-008
- [ ] **T5.2** Prove idempotency and bounded retries — FR-005, FR-006, NFR-004 / AC-004, AC-005
