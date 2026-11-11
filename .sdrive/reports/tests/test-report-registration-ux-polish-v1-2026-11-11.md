# Test Report: Registration UX Polish (v1)

## Executive Summary
- **Status:** PASS WITH ONE RECORDED GAP — 203/203 tests pass, 5 suites / 17 tests added.
- **Coverage:** 7 of 8 acceptance criteria are exercised by tests. **AC-003 (optimistic registration before server confirmation) is not implemented and has no test** — see §5.
- **Command:** `npx vitest run`
- **Date:** 2026-11-11

## Test Environment
- **Framework:** Vitest 3.2.7, jsdom, React Testing Library, user-event
- **Coverage tool:** not configured (no coverage threshold in this project)
- **Test files:** 60 total, 5 added by this feature

## Test Suites

| Suite | Tests | ACs covered | Notes |
|-------|-------|-------------|-------|
| `test/registration-ux-polish/skeletons.test.tsx` | 6 | AC-001, AC-007, AC-008 | Primitives, both route loading files, explicit sizing, reduced-motion classes |
| `test/registration-ux-polish/empty-states.test.tsx` | 4 | AC-006 | Reason text, link action, button action, decorative icon hidden |
| `test/registration-ux-polish/route-error.test.tsx` | 4 | AC-005 | Retry wiring, home link, both boundaries, no error text or digest leaked |
| `test/registration-ux-polish/optimistic-cancel.test.tsx` | 2 | AC-004 | Optimistic cache removal, rejected cancellation announced |
| `test/registration-ux-polish/register-modal-pending.test.tsx` | 1 | AC-002 | Progress state disables the control; second tap does not resubmit |

## Coverage Matrix

| Acceptance Criterion | Tested | Test |
|---|---|---|
| AC-001 skeleton renders before data | Yes | skeletons.test.tsx (3 tests) |
| AC-002 dialog cannot be double-submitted | Yes | register-modal-pending.test.tsx |
| AC-003 registration appears optimistically | **No** | not implemented — see §5 |
| AC-004 rollback and announcement on failure | Yes | optimistic-cancel.test.tsx |
| AC-005 error boundary recovery | Yes | route-error.test.tsx (4 tests) |
| AC-006 empty state explains itself | Yes | empty-states.test.tsx (4 tests) |
| AC-007 CLS budget 0.02 | Partially | explicit-sizing test guards the cause; the number is measured (0.002) by `npm run lighthouse` |
| AC-008 reduced motion respected | Yes | skeletons.test.tsx (2 tests) |

## Failures

None on a clean run. One transient collection failure occurred while the whole suite ran under load (two files failed to collect, then passed individually and on re-run); it did not reproduce.

## Quality Signals

- No `.only`, `xit`, or skipped tests.
- Every test name carries its AC ID.
- The optimistic-cancel test asserts the updater Convex actually runs: it captures `withOptimisticUpdate`'s callback and applies it to a fake local store, so the assertion covers the real filtering logic rather than a mock's shape.

## 5. Recorded Gap — AC-003

Optimistic **cancellation** is implemented and tested. Optimistic **registration** is not: the registration dialog would need to fabricate a joined `event` object (date, location, image, organiser) to insert into the `getMyRegistrations` cache, and a malformed entry there renders a broken ticket card. The implemented behaviour is the dialog's pending state plus Convex's reactive query, so the ticket is present when the attendee arrives without a manual refresh — but it is **not** present before the server confirms.

The review should treat AC-003 as unmet rather than inferred from AC-004's coverage.
