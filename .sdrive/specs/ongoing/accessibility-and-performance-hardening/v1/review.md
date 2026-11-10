---
status: FAIL
feature: accessibility-and-performance-hardening
version: v1
commit: ba468532
branch: feature/backlog-wave-1
base: main
reviewedBy: kenule500
reviewedAt: 2026-11-10T11:15:00.000Z
coverage: 90
evidence: .sdrive/governance/accessibility-and-performance-hardening/v1/test-evidence.json
---

# Review Report: Accessibility and Performance Hardening (v1)

## 1. Audit Summary
- **Status:** FAIL
- **Date:** 2026-11-10
- **Reviewer:** kenule500 (independent: yes — no assignee is recorded)
- **Version:** v1
- **Commit:** ba46853
- **Branch / base:** feature/backlog-wave-1 / main
- **Round:** 2 of 3

Round 2 confirms the accessibility work and records genuine progress on the bundle,
but the performance NFRs are still unmet, and one of them is now provably
unattainable as written.

**Progress since round 1:**
- First-load JavaScript **2,592 KB → 331 KB** (−87%). The root cause was an 8.2 MB
  chunk carrying the worldwide `country-state-city` dataset, preloaded on every page
  because the onboarding modal was mounted while closed.
- Total blocking time **5.0–6.6 s → 1.9–2.9 s**.
- Documentation finding cleared: README and CHANGELOG now describe the primitives,
  both gates, and the measured budget position.

**Still failing:** Lighthouse performance 28–59 against ≥ 95; first-load JS 331 KB
against 180 KB; AC-009 has no automated coverage.

## 2. Evidence
- **Test evidence:** `test-evidence.json` — exit `0`, 24 passed / 0 failed, commit `ba46853` = HEAD.
- **Test report:** `.sdrive/reports/tests/test-report-accessibility-and-performance-hardening-v1-2026-11-08.md`.
- **Performance report:** `.sdrive/reports/performance/performance-report-accessibility-and-performance-hardening-v1-2026-11-08.md` — round-2 section records the 2,592 → 331 KB result and the Clerk finding.
- **Verification:** `verification.json` — `pass`, 0 missing.
- **Audit chain:** `sdrive audit:verify` → `ok: true`.
- **Full suite:** 54 files, 183 tests passed.

## 3. Criteria Check
- [x] **Spec Convergence:** all 10 ACs implemented.
- [x] **Task Completion:** 19/19 tasks complete.
- [x] **Traceability:** 18 rows, 15 with test IDs.
- [ ] **Coverage:** FAIL — 9/10 (90%); AC-009 has no test.
- [x] **Test Report:** current and versioned.
- [x] **Test Evidence:** `commit === HEAD`, 24 passing.
- [x] **Change Scope:** one feature on the shared branch; raw Lighthouse traces no longer committed.
- [x] **Test Quality:** no skips; AC IDs in every name.
- [x] **Code Quality:** `tsc` 0; `eslint` 0 errors.
- [x] **Security:** `npm audit --omit=dev` → 0 vulnerabilities; secret scan clean.
- [x] **Testing:** 24/24 feature, 183/183 repository.
- [x] **Documentation:** PASS — README and CHANGELOG updated (round-1 F-004 cleared).
- [ ] **NFR Evidence:** FAIL — NFR-002 performance and NFR-003 unmet; NFR-004 (CLS 0.002) passes.
- [ ] **Definition of Done:** FAIL — inherits coverage and NFR failures.
- [x] **Spec-to-Code Verification:** `pass`.
- [ ] **CI:** not verified — no workflow exists.
- [x] **Permission:** admin allowed.
- [x] **Reviewer Independence:** no assignee recorded.

## 4. Issues Found (If any)
| Severity | Issue | AC | Fix Required | Fix with |
|----------|-------|----|--------------|----------|
| High | Lighthouse performance 28–59 against ≥ 95. Improved from 28–52, but still far from target; TBT 1.9–2.9 s vs 200 ms. | AC-008 | Yes | `/sdrive:performance` — defer Clerk's UI on public routes |
| High | First-load JS 331 KB against 180 KB. Clerk's own bundles are ~343 KB, so **NFR-003 is unattainable as written** while Clerk's UI loads on public pages. | AC-009 | Yes | `/sdrive:update-propose accessibility-and-performance-hardening` — revise NFR-003 with Clerk's footprint accounted for, or approve the Clerk deferral |
| Medium | AC-009 has no automated or measured coverage; the budget is asserted only in `.lighthouserc.json`. | AC-009 | Yes | Add a bundle-measurement check after the budget decision |
| Info | LCP on `/` remains 41 s because no Convex deployment is reachable. | — | No | Re-measure against a live deployment |
| Info | CI is not configured. | — | No | Wire `a11y` and `lighthouse` into a workflow |

## 5. Recommendations
- Do not re-open the accessibility work: 96/100 on both reference pages, axe-clean components, 24 passing tests. It is done.
- Treat NFR-003 as a spec defect, not an implementation defect. A 180 KB budget that a mandatory auth vendor alone exceeds cannot be met by optimisation; it needs a decision — revise the number or move Clerk's UI off the public path.
- If Clerk is deferred, re-measure before drawing conclusions: the remaining application code is already small.

## 6. Security & Performance
| Area | Status | Reason / measurement |
|------|--------|----------------------|
| Security | pass | 0 production vulnerabilities; clean secret scan; no `dangerouslySetInnerHTML`; announced text rendered as text. |
| Performance | fail | NFR-002: performance 28–59 (target ≥ 95), a11y 96 (met), TBT 1.9–2.9 s (target ≤ 200 ms), LCP 3.0 s best run. NFR-003: 331 KB (target ≤ 180 KB). NFR-004: CLS 0.002 (pass). |

## 7. Handoff
- **If FAIL:** decide the NFR-003 question first (revise the budget or defer Clerk), then `/sdrive:performance`, then `sdrive test` and a round-3 review.
- **Round cap:** round 2 of 3. A third failure on the same NFR escalates to a human, per the review rules.
