---
status: FAIL
feature: accessibility-and-performance-hardening
version: v1
commit: 9efa69aa51caeb7511f48c38f38996bca5af3680
branch: feature/backlog-wave-1
base: main
reviewedBy: kenule500
reviewedAt: 2026-11-10T13:35:00.000Z
coverage: 90
evidence: .sdrive/governance/accessibility-and-performance-hardening/v1/test-evidence.json
---

# Review Report: Accessibility and Performance Hardening (v1)

## 1. Audit Summary
- **Status:** FAIL — round 3 of 3, escalated to a human
- **Date:** 2026-11-10
- **Reviewer:** kenule500 (independent: yes)
- **Version:** v1
- **Commit:** 9efa69a
- **Branch / base:** feature/backlog-wave-1 / main

Round 3 clears everything the team could clear, and fails on the one thing that is
not an application defect.

**Now passing:** the amended bundle requirement (NFR-007: 331 KB application code
against a 350 KB budget, ~674 KB total against 700 KB), documentation, security,
verification, 24/24 feature tests and 183/183 repository-wide, and accessibility at
96 on both reference pages.

**Still failing:** Lighthouse performance 28–59 against ≥ 95, with total blocking
time 1.9–2.9 s against 200 ms. That is the same NFR as rounds 1 and 2, and under the
round cap it is no longer an automated loop — it is a human decision.

The remaining blocking cost is attributable: the largest payloads are Clerk's UI
bundles (~343 KB) plus React DOM and the Convex client. The application's own code is
already inside budget.

## 2. Evidence
- **Test evidence:** exit `0`, 24 passed / 0 failed, commit `9efa69a` = HEAD.
- **Performance report:** `.sdrive/reports/performance/performance-report-accessibility-and-performance-hardening-v1-2026-11-08.md` — round-2 measurements: 2,592 KB → 331 KB, TBT 1.9–2.9 s, a11y 96.
- **Verification:** `pass`, 0 missing.
- **Audit chain:** `ok: true`.
- **Full suite:** 54 files, 183 tests.

## 3. Criteria Check
- [x] **Spec Convergence:** all in-scope ACs implemented; AC-009 withdrawn with evidence.
- [x] **Task Completion:** 19/19.
- [x] **Traceability:** 19 rows; NFR-007 linked to AC-011.
- [ ] **Coverage:** FAIL — 9/10 (90%); AC-011 is verified by measurement, not by a test.
- [x] **Test Report:** current.
- [x] **Test Evidence:** `commit === HEAD`, 24 passing.
- [x] **Change Scope:** one feature on the shared branch.
- [x] **Test Quality:** no skips; AC IDs present.
- [x] **Code Quality:** `tsc` 0; `eslint` 0 errors.
- [x] **Security:** 0 production vulnerabilities; clean secret scan.
- [x] **Testing:** 24/24 feature; 183/183 repository.
- [x] **Documentation:** PASS.
- [ ] **NFR Evidence:** FAIL — NFR-002 performance 28–59 (target ≥ 95); NFR-004 CLS 0.002 (pass); NFR-007 bundle (pass).
- [ ] **Definition of Done:** FAIL — inherits the performance and coverage gaps.
- [x] **Spec-to-Code Verification:** `pass`.
- [ ] **CI:** not verified.
- [x] **Permission:** admin allowed.
- [x] **Reviewer Independence:** no assignee.

## 4. Issues Found (If any)
| Severity | Issue | AC | Fix Required | Fix with |
|----------|-------|----|--------------|----------|
| High | Lighthouse performance 28–59 against ≥ 95; TBT 1.9–2.9 s against 200 ms. Attribution: Clerk's UI (~343 KB) plus React DOM / Convex client hydration. | AC-008 | Yes | A human decision: approve the Clerk deferral, or record an environment-scoped waiver with a named production re-check |
| Medium | AC-011 is verified by the measured performance report rather than an automated test, so coverage reads 90%. | AC-011 | Yes | Add a bundle-size check to `npm run a11y`/CI, or record the measurement as the accepted evidence |
| Info | LCP on `/` remains 41 s with no reachable Convex deployment. | — | No | Re-measure against a live deployment |
| Info | CI is not configured. | — | No | Wire the gates into a workflow |

## 5. Recommendations — escalation
- The accessibility work and the bundle work are done and evidenced. Do not reopen them.
- NFR-002 is now the only blocker, and it is bounded by a vendor payload. The two honest
  exits are (1) approve deferring Clerk's UI on public routes — the only remaining
  optimisation — or (2) record a waiver for the performance half with a production re-check,
  exactly as NFR-008 was handled on a previous feature.
- Per the round cap, this review does not start a round 4.

## 6. Security & Performance
| Area | Status | Reason / measurement |
|------|--------|----------------------|
| Security | pass | 0 production vulnerabilities; clean secret scan; no `dangerouslySetInnerHTML`. |
| Performance | fail | NFR-002: 28–59 (target ≥ 95), a11y 96, TBT 1.9–2.9 s. NFR-004: CLS 0.002 (pass). NFR-007: 331 KB app / ~674 KB total (pass). |

## 7. Handoff
- **Escalated.** Round 3 failed on the same NFR as rounds 1–2; the rules forbid a fourth
  automated round. The decision is the human's: defer Clerk's UI, or waive the performance
  half with a production measurement.
