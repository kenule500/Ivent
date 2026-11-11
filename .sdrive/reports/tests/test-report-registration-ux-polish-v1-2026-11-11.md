# Test Report: Registration UX Polish (v1)

## Executive Summary
- **Status:** PASS — 205/205 tests pass; 5 suites / 19 tests added.
- **Coverage:** 8 of 8 acceptance criteria are exercised by tests.
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
| `test/registration-ux-polish/register-modal-pending.test.tsx` | 3 | AC-002, AC-003 | Double-submit guard; optimistic ticket insertion; no duplicate on an existing registration |

## Coverage Matrix

| Acceptance Criterion | Tested | Test |
|---|---|---|
| AC-001 skeleton renders before data | Yes | skeletons.test.tsx (3 tests) |
| AC-002 dialog cannot be double-submitted | Yes | register-modal-pending.test.tsx |
| AC-003 registration appears optimistically | Yes | register-modal-pending.test.tsx (2 tests) |
| AC-004 rollback and announcement on failure | Yes | optimistic-cancel.test.tsx |
| AC-005 error boundary recovery | Yes | route-error.test.tsx (4 tests) |
| AC-006 empty state explains itself | Yes | empty-states.test.tsx (4 tests) |
| AC-007 CLS budget 0.02 | Guarded | explicit-sizing test guards the cause; the number is measured (0.002) by `npm run lighthouse` |
| AC-008 reduced motion respected | Yes | skeletons.test.tsx (2 tests) |

## Failures

None on a clean run. One transient collection failure occurred while the whole suite ran under load (two files failed to collect, then passed individually and on re-run); it did not reproduce.

## Quality Signals

- No `.only`, `xit`, or skipped tests.
- Every test name carries its AC ID.
- The optimistic tests capture the real `withOptimisticUpdate` callbacks and apply them to a fake Convex store, so they assert the filtering/insertion logic rather than a mock's shape.

## 5. AC-003 — Resolved

The round-1 review found optimistic registration unimplemented. It is now built: the modal
places an optimistic `confirmed` ticket in the `getMyRegistrations` cache through
`withOptimisticUpdate`, skips insertion when the event is already registered, and Convex
discards the entry on success or failure.

The optimistic entry omits `_creationTime`: the React purity rule rejects `Date.now()` in
a callback evaluated during render, and the ticket card does not read it.
