---
status: FAIL
feature: accessibility-and-performance-hardening
version: v1
commit: 51271077b1676ad9c1ba4b2b7a6301b786739c4a
branch: feature/backlog-wave-1
base: main
reviewedBy: kenule500
reviewedAt: 2026-11-09T14:10:00.000Z
coverage: 90
evidence: .sdrive/governance/accessibility-and-performance-hardening/v1/test-evidence.json
---

# Review Report: Accessibility and Performance Hardening (v1)

## 1. Audit Summary
- **Status:** FAIL
- **Date:** 2026-11-09
- **Reviewer:** kenule500 (independent: yes — no assignee is recorded)
- **Version:** v1
- **Commit:** 5127107
- **Branch / base:** feature/backlog-wave-1 / main
- **Round:** 1

The accessibility half of this feature is done and proven. The performance half is
not: it was measured, and it fails both hardware-independent budgets by a wide margin.

What passes: 24 accessibility tests, axe-clean component surfaces, a deterministic
contrast test, skip link and landmark structure, keyboard-operable cards, labelled
and announced async flows, `verify` PASS (18 matched, 0 missing), and Lighthouse
accessibility at **96** on both reference pages (target ≥ 95).

What fails: Lighthouse performance **28–37** against ≥ 95, total blocking time
**5.0–6.6 s** against 200 ms, and **2,592 KB** of first-load JavaScript against a
180 KB budget. The bundle size is a code fact, not a measurement artifact, and it
explains the TBT.

## 2. Evidence
- **Test evidence:** `test-evidence.json` — exit `0`, 24 passed / 0 failed, commit `5127107` = HEAD.
- **Test report:** `.sdrive/reports/tests/test-report-accessibility-and-performance-hardening-v1-2026-11-08.md` — 10 ACs, 8 covered by tests, 80% by that document's stricter count.
- **Performance report:** `.sdrive/reports/performance/performance-report-accessibility-and-performance-hardening-v1-2026-11-08.md` — 3 runs per URL, medians recorded, verdicts per NFR.
- **Verification:** `verification.json` — status `pass`, 18 matched / 0 missing / 0 renamed / 0 extra, 2 withdrawn (superseded/deferred).
- **Audit chain:** `sdrive audit:verify` → `ok: true`.
- **CI:** not configured — no workflow exists.

## 3. Criteria Check
- [x] **Spec Convergence:** all 10 ACs have an implementation; 8 are exercised by tests.
- [x] **Task Completion:** 19/19 tasks `completed: true`.
- [x] **Traceability:** 18 rows, 15 carrying test IDs; NFR rows updated with measured status.
- [ ] **Coverage:** FAIL — 9 of 10 ACs have a linked test (90%); AC-009 has none, and AC-008's performance half is measured as failing.
- [x] **Test Report:** exists with the version in its filename and is newer than `spec.md`.
- [x] **Test Evidence:** exit `0`, zero failures, 24 tests, `commit === HEAD`.
- [x] **Change Scope:** one feature on the shared branch, no other feature's commits; the raw Lighthouse traces were removed from the repo and git-ignored.
- [x] **Test Quality:** no `.only`, `xit`, or skips; every test name carries its AC ID.
- [x] **Code Quality:** `tsc --noEmit` exit 0; `eslint` 0 errors.
- [x] **Security:** production audit clean (`npm audit --omit=dev` → 0 vulnerabilities); secret scan clean — the only pattern matches were case-insensitive false positives inside generated Lighthouse JSON, now removed from the repo.
- [x] **Testing:** 24/24 feature tests; 181/181 repository-wide.
- [ ] **Documentation:** FAIL — `README.md` and `CHANGELOG.md` were not updated for this feature.
- [ ] **NFR Evidence:** FAIL — NFR-002 performance and NFR-003 are measured and unmet; NFR-004 (CLS 0.002) passes.
- [ ] **Definition of Done:** FAIL — inherits the NFR and documentation failures.
- [x] **Spec-to-Code Verification:** `sdrive verify` → `pass`.
- [ ] **CI:** not verified — no workflow exists (recorded, not claimed).
- [x] **Permission:** `kenule500` (admin) is allowed.
- [x] **Reviewer Independence:** no assignee recorded.

## 4. Change Scope
- **Files changed:** the feature replaces 17 source files and adds 5 primitives, 5 test files, `.lighthouserc.json`, and three dev dependencies.
- **Commits:** 9 on `feature/backlog-wave-1` for this feature.
- **Other-feature commits:** none.
- **Working tree:** clean at bind; the review artifacts are deliberately left uncommitted to keep `review.json.commit` equal to HEAD.

## 5. Issues Found (If any)
| Severity | Issue | Location | AC | Fix Required | Fix with |
|----------|-------|----------|----|--------------|----------|
| High | Lighthouse performance 28–37 against ≥ 95; TBT 5.0–6.6 s against 200 ms | `.sdrive/reports/performance/…-2026-11-08.md` | AC-008 | Yes | `/sdrive:performance` — slice `country-state-city`, fence admin modules out of public chunks, defer Clerk's UI on public routes |
| High | First-load JS 2,592 KB across 23 scripts against a 180 KB budget | same report | AC-009 | Yes | `/sdrive:performance` (bundle work above), then re-measure |
| Medium | AC-009 has no automated or measured coverage; the 180 KB budget is asserted only in config | `traceability.json` | AC-009 | Yes | Add a bundle-measurement check, or record an explicit waiver after the bundle work |
| Medium | README and CHANGELOG not updated for this feature | `README.md`, `CHANGELOG.md` | — | Yes | Document the a11y primitives, the `a11y` and `lighthouse` scripts, and the new dev dependencies |
| Info | Lighthouse LCP on `/` is 41 s because no Convex deployment is reachable; not a product signal | environment | — | No | Re-measure against a live deployment |
| Info | CI is not configured, so the axe and Lighthouse gates do not run automatically | repository | — | No | Wire both scripts into a workflow |

## 6. Recommendations
- The accessibility work is sound and should not be re-litigated; keep it.
- Treat the bundle as the real defect: 2.6 MB of script for a public page is the cause of the TBT, and no amount of animation or image tuning will move it.
- Re-measure only after the bundle work, on a machine with a reachable backend, and record medians of five runs rather than three.

## 7. Security & Performance
| Area | Status | Reason / measurement |
|------|--------|----------------------|
| Security — secrets, dependencies, CON-51x | pass | `npm audit --omit=dev` → 0 vulnerabilities. Secret scan clean; four pattern matches were base64 noise inside generated Lighthouse JSON, and that directory is no longer committed. CON-515 and CON-517 are honoured: text is rendered as text, no `dangerouslySetInnerHTML` added. |
| Performance — NFRs, SEO | fail | NFR-002: performance 28–37 (target ≥ 95), a11y 96 (target met), LCP 5.8–6.4 s on `/explore`, TBT 5.0–6.6 s. NFR-003: 2,592 KB JS (target ≤ 180 KB). NFR-004: CLS 0.002 (pass). SEO is not applicable: no public marketing surface was added. |

## 8. Handoff
- **If FAIL:** run `/sdrive:performance accessibility-and-performance-hardening` for the bundle work, update the docs, then `sdrive test` and re-run this command.
- **Round cap:** round 1 of 3.
