# Tasks: Registration UX Polish (v1)

## P0 — Shared primitives
- [ ] **T1.1** Build the skeleton primitive (`components/ui/skeleton.tsx`) — FR-001, FR-008 / AC-001, AC-008
- [ ] **T1.2** Build the empty-state component (`components/ui/empty-state.tsx`) — FR-007 / AC-006

## P1 — Route skeletons
- [ ] **T2.1** Add the event page loading skeleton — FR-002, NFR-001 / AC-001, AC-007
- [ ] **T2.2** Add the tickets loading skeleton — FR-002, NFR-001 / AC-001, AC-007

## P2 — Interaction
- [ ] **T3.1** Give the registration dialog a pending state — FR-003 / AC-002
- [ ] **T3.2** Apply registration optimistically — FR-004, NFR-004 / AC-003
- [ ] **T3.3** Roll back and announce failures — FR-004, FR-005 / AC-004

## P3 — Resilience
- [ ] **T4.1** Add the event route error boundary — FR-006 / AC-005
- [ ] **T4.2** Add the tickets route error boundary — FR-006 / AC-005

## P4 — States and verification
- [ ] **T5.1** Wire the empty states in tickets, explore, and announcements — FR-007 / AC-006
- [ ] **T5.2** Make loading and failure accessible — NFR-003 / AC-001, AC-004, AC-005
- [ ] **T5.3** Verify CLS and the JavaScript budget — NFR-001, NFR-002 / AC-007
