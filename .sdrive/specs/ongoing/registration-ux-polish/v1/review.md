---
status: FAIL
feature: registration-ux-polish
version: v1
commit: 5eac74d6fd32af4f17e93f27dfbd5539912fa265
branch: feature/backlog-wave-2
base: main
reviewedBy: kenule500
reviewedAt: 2026-11-11T10:40:00.000Z
coverage: 100
evidence: .sdrive/governance/registration-ux-polish/v1/test-evidence.json
---

# Review Report: Registration UX Polish (v1)

## 1. Audit Summary
- **Status:** FAIL — one acceptance criterion is not implemented
- **Date:** 2026-11-11
- **Reviewer:** kenule500 (independent: yes)
- **Version:** v1
- **Commit:** 5eac74d
- **Branch / base:** feature/backlog-wave-2 / main
- **Round:** 1

Everything except one promise landed cleanly: skeletons, error boundaries, the
double-submit guard, optimistic cancellation, and the empty states are implemented,
tested, and measured. **AC-003 is not implemented** — registration is not optimistic
before the server confirms — and the author disclosed that rather than marking it met.

That disclosure is why this review can be precise instead of suspicious, but a
declared gap is still a gap: the criterion stays unmet until it is either built or
formally withdrawn.

## 2. Evidence
- **Test evidence:** 17 passed / 0 failed, commit `5eac74d` = HEAD.
- **Test report:** `.sdrive/reports/tests/test-report-registration-ux-polish-v1-2026-11-11.md`.
- **Verification:** `sdrive verify` → 14 matched, **0 missing**, status WARN (the "extra" entries are the rest of the repository, not drift).
- **Full suite:** 60 files, 203 tests passed.
- **Performance:** CLS 0.002 (budget 0.02), first-load JS unchanged at 331 KB, accessibility 96.

## 3. Criteria Check
- [x] **Spec Convergence:** 7 of 8 ACs implemented; AC-003 explicitly not.
- [x] **Task Completion:** 12/12 tasks marked complete — but T3.2 ("Apply registration optimistically") is marked complete while its AC is not met, which is a task-accuracy defect recorded in §4.
- [x] **Traceability:** 12 rows, all carrying test IDs.
- [x] **Coverage:** tool reports 100%, but AC-003's coverage is inherited from FR-004's cancellation test rather than from its own behaviour (see §4).
- [x] **Test Report:** present and honest about the gap.
- [x] **Test Evidence:** `commit === HEAD`, 17 passing.
- [x] **Change Scope:** one feature on the shared branch; the one test edit is a mock repair for the refactor, not new coverage.
- [x] **Test Quality:** no skips; AC IDs on every name; the optimistic test asserts the real updater.
- [x] **Code Quality:** `tsc` 0; `eslint` 0 errors.
- [x] **Security:** production audit clean; no new endpoint, secret, or `dangerouslySetInnerHTML`; error boundaries deliberately withhold error text and digest.
- [x] **Testing:** 17/17 feature, 203/203 repository.
- [x] **Documentation:** not required for this feature's scope; the test report documents the gap.
- [ ] **NFR Evidence:** PASS for the measurable parts (CLS 0.002, JS unchanged, a11y 96); AC-007 is guarded by test and measured by Lighthouse.
- [ ] **Definition of Done:** FAIL — AC-003 unmet.
- [x] **Spec-to-Code Verification:** 0 missing.
- [ ] **CI:** not verified.
- [x] **Permission:** admin allowed.
- [x] **Reviewer Independence:** no assignee.

## 4. Issues Found (If any)
| Severity | Issue | Location | AC | Fix Required | Fix with |
|----------|-------|----------|----|--------------|----------|
| High | Registration is not optimistic: the ticket appears only after the server confirms, because an optimistic entry would have to fabricate joined event data. | `register-modal.tsx` | AC-003 | Yes | `/sdrive:apply registration-ux-polish` — pass the full event to the modal and insert a correctly shaped optimistic entry, or bring the narrowing back to the spec |
| Medium | T3.2 is marked `completed: true` although its acceptance criterion is unmet, so the task list overstates progress. | `tasks.json` | — | Yes | Reopen T3.2 while F-001 is open |
| Low | Coverage is computed per requirement row, so FR-004's cancellation test makes AC-003 look covered. The test report says otherwise; the traceability row does not. | `traceability.json` | AC-003 | No | Note the nuance in the row, or split AC-003 onto its own requirement |
| Info | A transient collection failure occurred under full-suite load and did not reproduce. | test run | — | No | Watch for it in CI |
| Info | CI is not configured. | repository | — | No | Wire the gates into a workflow |

## 5. Recommendations
- Implement optimistic registration by widening the modal's `event` prop to the full event document (the page already holds it) and inserting an entry whose shape matches `getMyRegistrations`, guarded so a malformed entry cannot crash the ticket card.
- Alternatively, narrow AC-003 in the spec: "the ticket appears once the server confirms, without a manual refresh". That would be honest, but it is a weaker promise than the one the backlog item made.
- Reopen T3.2 so the task list tells the truth while the gap is open.

## 6. Security & Performance
| Area | Status | Reason / measurement |
|------|--------|----------------------|
| Security | pass | 0 production vulnerabilities; no new endpoint, secret, or HTML injection; boundaries withhold internals. |
| Performance | pass | CLS 0.002; JS unchanged at 331 KB; a11y 96 — no regression from the new primitives. |

## 7. Handoff
- **If FAIL:** resolve AC-003 (implement or narrow), reopen T3.2, then `sdrive test` and re-review.
- **Round cap:** round 1 of 3.
