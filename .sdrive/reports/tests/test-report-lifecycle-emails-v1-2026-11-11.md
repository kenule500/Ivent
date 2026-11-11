# Test Report: Lifecycle Emails (v1)

## Executive Summary
- **Status:** PASS — 221/221 tests pass; 2 suites / 16 tests added.
- **Coverage:** 8 of 8 acceptance criteria are exercised.
- **Command:** `npx vitest run`
- **Date:** 2026-11-11

## Test Environment
- **Framework:** Vitest 3.2.7, `convex-test` in-memory backend for the dispatch and sweep logic.
- **Coverage tool:** not configured (no coverage threshold in this project).
- **Test files:** 62 total, 2 added by this feature.

## Test Suites

| Suite | Tests | ACs covered | Notes |
|-------|-------|-------------|-------|
| `test/lifecycle-emails/templates.test.ts` | 8 | AC-001, AC-003, AC-008, NFR-001 | Rendering, escaping, single-recipient content, the transactional flag, key stability |
| `test/lifecycle-emails/dispatch.test.ts` | 8 | AC-001, AC-002, AC-004, AC-005, AC-006, AC-007, NFR-004 | Claim-once, retry cap, sweep selection, cancelled skip, opt-out skip, delivery rows |

## Coverage Matrix

| Acceptance Criterion | Tested | Test |
|---|---|---|
| AC-001 confirmation identifies event and ticket | Yes | templates (subject/body), dispatch (registration schedules) |
| AC-002 one reminder, confirmed registrants only | Yes | dispatch (sweep processes one; cancelled gets none) |
| AC-003 thank-you with feedback link | Yes | templates |
| AC-004 no duplicate across repeats | Yes | dispatch (second claim refused; sent never retried; one row) |
| AC-005 failure recorded, bounded retries | Yes | dispatch (retry until `MAX_LIFECYCLE_ATTEMPTS`, then stop, row stays failed) |
| AC-006 opt-out suppresses optional email only | Yes | dispatch action (reminder skipped with no row; confirmation still dispatches) |
| AC-007 per-registration delivery rows | Yes | dispatch (`listLifecycleDeliveries` returns one row with status and timestamp) |
| AC-008 escaped, single-recipient content | Yes | templates (hostile input escaped; no cross-recipient data; no `@` in text body) |

## Failures

None on a clean run.

## Quality Signals

- The retry test drives the real claim/settle mutations ten times and asserts exactly `MAX_LIFECYCLE_ATTEMPTS - 1` retries are granted — the bound is proven, not assumed.
- The opt-out test asserts **no** `emailEvents` row exists after a skipped reminder, which is the behaviour that matters: a suppressed email must not look like a failed one.
- Escaping is asserted with a hostile `<img onerror>` and `<script>` payload rather than a benign string.

## Recorded Limitation — AC-007 surface

The delivery data is queryable per registration and tested, but the **admin UI does not yet show a per-registration view**; the health panel surfaces lifecycle templates only through its send/failure counts and failure list. The data and query exist; the screen does not.
