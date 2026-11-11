---
status: FAIL
feature: lifecycle-emails
version: v1
commit: 1401acc5c830e304db7b4b4ba4a0fba02caba022
branch: feature/backlog-wave-3
base: main
reviewedBy: kenule500
reviewedAt: 2026-11-11T12:30:00.000Z
coverage: 100
evidence: .sdrive/governance/lifecycle-emails/v1/test-evidence.json
---

# Review Report: Lifecycle Emails (v1)

## 1. Audit Summary
- **Status:** FAIL — one acceptance criterion is only half delivered
- **Date:** 2026-11-11
- **Reviewer:** kenule500 (independent: yes)
- **Version:** v1
- **Commit:** 1401acc
- **Branch / base:** feature/backlog-wave-3 / main
- **Round:** 1

The email engine is solid: four templates, claim-then-send idempotency, a bounded
retry budget, sweeps that respect cancellation and the opt-out, and 16 tests that
prove each of those rather than asserting them. Delivery correctness — the hard part
of this feature — is done.

**AC-007 is only half met.** The per-registration delivery data exists, is queryable
(`listLifecycleDeliveries`) and is tested, but the admin cannot yet *see* it: there is
no per-registration view, only the health panel's counts and failure list. An
acceptance criterion about what the admin can see cannot be satisfied by a query
nobody renders.

## 2. Evidence
- **Test evidence:** 16 passed / 0 failed, commit `1401acc` = HEAD.
- **Test report:** `.sdrive/reports/tests/test-report-lifecycle-emails-v1-2026-11-11.md` — records the AC-007 limitation explicitly.
- **Verification:** `sdrive verify` → 19 matched, **0 missing**, status WARN.
- **Full suite:** 62 files, 221 tests.
- **Security:** production audit clean; no new endpoint exposed to the client.

## 3. Criteria Check
- [x] **Spec Convergence:** 7 of 8 ACs fully implemented; AC-007 data-only.
- [x] **Task Completion:** 11/11 tasks complete.
- [x] **Traceability:** 13 rows, all carrying test IDs.
- [x] **Coverage:** 100% by the tool; AC-007 is covered at the data layer, not the UI layer.
- [x] **Test Report:** present, and it states the AC-007 limitation rather than hiding it.
- [x] **Test Evidence:** `commit === HEAD`, 16 passing.
- [x] **Change Scope:** one feature on the shared branch; no sibling feature's commits.
- [x] **Test Quality:** the retry bound is measured by driving the real mutations ten times; escaping is tested with a hostile payload.
- [x] **Code Quality:** `tsc` 0; `eslint` 0 errors; production build compiled.
- [x] **Security:** production audit clean; templates escape every interpolation; one recipient per send; provider credentials stay server-side.
- [x] **Testing:** 16/16 feature, 221/221 repository.
- [x] **Documentation:** test report and plan match the implementation.
- [ ] **NFR Evidence:** NFR-001/NFR-003/NFR-004 are tested. AC-001's "within 60 seconds" is **not** verified — the test proves scheduling, not delivery timing, because no provider exists in the test environment.
- [ ] **Definition of Done:** FAIL — AC-007 unmet, AC-001 timing unverified.
- [x] **Spec-to-Code Verification:** 0 missing.
- [ ] **CI:** not verified.
- [x] **Permission:** admin allowed.
- [x] **Reviewer Independence:** no assignee.

## 4. Issues Found (If any)
| Severity | Issue | Location | AC | Fix Required | Fix with |
|----------|-------|----------|----|--------------|----------|
| Medium | No per-registration delivery view: the data and query exist, but the admin sees only aggregate counts and failures. | `app/admin/health/page.tsx` | AC-007 | Yes | `/sdrive:apply lifecycle-emails` — render `listLifecycleDeliveries` for a registration, or add a delivery section keyed by registration |
| Low | AC-001's 60-second promise is unverified; only the scheduling is proven. | `convex/registrations.ts` | AC-001 | No | Verify against the Mailtrap sandbox, or narrow the criterion to "scheduled at registration" |
| Info | No provider is configured in tests, so the send path is exercised only up to the dispatch boundary. | test environment | — | No | Sandbox check when a Mailtrap key is available |
| Info | CI is not configured. | repository | — | No | Wire the gates into a workflow |

## 5. Recommendations
- Add the per-registration view. It is a small screen over an existing query, not new plumbing.
- Consider narrowing AC-001 to what is actually guaranteed synchronously: "a confirmation is scheduled at registration", with delivery timing left to the provider. That would make the promise honest instead of untestable.

## 6. Security & Performance
| Area | Status | Reason / measurement |
|------|--------|----------------------|
| Security | pass | Production audit clean; escaped interpolation; one recipient per send; no credential exposure; the new mutations are internal apart from the preference setter, which is scoped to the caller. |
| Performance | pass | Confirmation is scheduled, never awaited (NFR-002); sweeps are bounded per run (100) and keyed on an index. |

## 7. Handoff
- **If FAIL:** add the per-registration delivery view, then `sdrive test` and re-review.
- **Round cap:** round 1 of 3.
