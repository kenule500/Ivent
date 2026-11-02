---
status: FAIL
feature: admin-dashboard-update
version: v1
commit: 5c3ef49b321975967e76bbec64eec58f9e6293e0
branch: feature/admin-dashboard-update
base: main
reviewedBy: AI Review Agent (Codebuff) for kenule500
reviewedAt: 2026-11-02T07:42:00.000Z
coverage: 100
evidence: .sdrive/governance/admin-dashboard-update/v1/test-evidence.json
---

# Review Report: Admin Dashboard Update (v1)

## 1. Audit Summary
- **Status:** FAIL
- **Date:** 2026-11-02
- **Reviewer:** AI Review Agent (Codebuff) for kenule500 (independent: yes — no assignee is recorded on the feature, so there is no self-approval conflict)
- **Version:** v1
- **Commit:** 5c3ef49b321975967e76bbec64eec58f9e6293e0
- **Branch / base:** feature/admin-dashboard-update / main
- **Round:** 2 of 3

This round clears most of round 1's findings. Test evidence now exists and is
bound to `HEAD`, NFR-008 and NFR-009 are recorded, the schema change has
migration and rollback notes, and README/CHANGELOG are real documents instead of
the create-next-app template. Two blockers remain, both of them older than this
feature's own code: `sdrive verify` still reports the Convex blind spot, and the
production dependency tree still carries a critical advisory.

## 2. Evidence
- **Test evidence:** `.sdrive/governance/admin-dashboard-update/v1/test-evidence.json` — exit `0`, 43 passed / 0 failed / 0 skipped, commit `5c3ef49`, `outputHash sha256:d1cf8aca96c518fcfe84f0828c5ae20f19f4781b9fdd07d4ac07a96b5ca09f79`. `commit === HEAD` holds for the tested commit; see Issue 3.
- **Test report:** `.sdrive/reports/tests/test-report-admin-dashboard-update-v1-2026-11-02.md` — newer than `spec.md` and `plan.md`.
- **Verification:** `.sdrive/governance/admin-dashboard-update/v1/verification.json` — status `FAIL` (left untracked; see Issue 1).
- **Audit chain:** `.sdrive/audit-log.json` — 9 hashed events verified, chain intact.
- **CI:** CI not verified — the repository has no `.github/workflows/` directory.
- **Machine checks:** `sdrive check --json` → `ok: true`; `sdrive validate --json` → `ok: true, 0 blockers`; `sdrive audit:verify --json` → `ok: true, 9 hashed events verified`; `sdrive verify <feature> --json` → `ok: false, code 7`.

## 3. Criteria Check
- [x] **Spec Convergence:** 34/34 ACs implemented; the feature suite exercises every AC.
- [x] **Task Completion:** 57/57 tasks in `tasks.json` carry `completed: true`; every P1–P7 checkbox in `tasks.md` is `[x]`.
- [x] **Traceability:** 61/61 rows `complete`, 34 unique `TEST-###` IDs, every AC linked.
- [x] **Coverage:** 100% (34/34 ACs tested, 43/43 feature tests passing).
- [x] **Test Report:** exists with the version in its filename and is newer than `spec.md` and `plan.md`.
- [x] **Test Evidence:** exists, `exitCode: 0`, 0 failures, `summary.total = 43`, commit matches `HEAD`.
- [ ] **Change Scope:** FAIL — the working tree is dirty (50 entries) and 43 changed files are not referenced by `plan.json`. See Issue 3.
- [x] **Test Quality:** no `.only`, `xit`, skips or empty assertions in `test/admin-dashboard-update/`; every test name carries its AC ID. Red-before-green is not required by this project's config.
- [x] **Code Quality:** `npx tsc --noEmit` → exit `0`; `npx eslint .` → exit `0`, 0 errors, 17 warnings.
- [ ] **Security:** FAIL — critical advisory in the production tree; no `/sdrive:secure` report or waiver. See Issue 2.
- [ ] **Testing:** FAIL (non-blocking for this feature) — feature suite 43/43 green, but the full suite is 142/146; the 4 failures are pre-existing on `main` and belong to other features. See Issue 5.
- [x] **Documentation:** `README.md` (+136) and `CHANGELOG.md` (+71) are updated on this branch, and migration/rollback notes exist for the schema change.
- [x] **NFR Evidence:** NFR-009 recorded as measured (axe-core 4.12.1, 7 components, 0 violations, negative control validated); NFR-008 recorded as an environment-scoped waiver with static query-plan evidence and a named production check.
- [ ] **Definition of Done:** FAIL — inherits the Security and Change Scope failures above.
- [ ] **Spec-to-Code Verification:** FAIL — `sdrive verify` returns `FAIL`. See Issue 1.
- [ ] **CI:** not verified — no workflow configured (recorded, not a pass).
- [x] **Permission:** `kenule500` (admin) is allowed to review.
- [x] **Reviewer Independence:** no assignee is recorded, so no self-approval conflict.

## 4. Change Scope
- **Files changed:** 142 against `main` (88 outside `.sdrive/`, 54 under it)
- **Planned files changed:** 45 of the 88 non-`.sdrive` files are referenced by `plan.json`
- **Unplanned files:** 43 (e.g. `.gitignore`, `CHANGELOG.md`, `README.md`, `app/globals.css`, `components/admin/analytics-charts.tsx`, `convex/_generated/*`). Most are generated Convex artefacts, docs, or ordinary supporting modules a plan does not enumerate; none is foreign to the feature.
- **Other-feature commits:** none — all 15 commits on `main..HEAD` belong to this feature.
- **Working tree:** **dirty** (50 entries): 12 uncommitted SpecDrive CLI tooling-sync files, `.perch/`, `.sdrive/.backups/`, and the untracked `.sdrive/governance/admin-dashboard-update/v1/verification.json`.

## 5. Issues Found (If any)
| Severity | Issue | Location | AC | Fix Required | Fix with |
|----------|-------|----------|----|--------------|----------|
| High | `sdrive verify` returns `FAIL`: the verifier scans only `components/`, `app/` and `lib/`, so all `convex/` functions and schema fields are reported as missing (146 missing, 41 matched, 2 renamed, 26 extra). Every blocker is a `convex/` or `components/admin/` path. This is the shared blocker `T6.1` from `admin-console-and-governance`, unchanged by this branch. | all of `convex/` | — | Yes | `/sdrive:apply` in `admin-console-and-governance` to teach verification about `convex/` |
| High | Production dependency advisory: 1 critical / 2 high with `--omit=dev` (`shell-quote` critical — command injection via a line terminator in a token; `image-size` and `browserslist` high). No security report or waiver exists. | `package-lock.json` | — | Yes | `/sdrive:secure admin-dashboard-update` |
| Medium | Working tree is dirty (50 entries) at review time. The other blocking checks (permission, branch, evidence binding) pass, but the rule requires a clean tree, so this cannot be signed off as-is. | repo root | — | Yes | Commit or ignore the untracked tooling/backup paths before a round-3 attempt |
| Medium | The test-evidence binding is self-invalidating: the run records `HEAD`, but committing `test-evidence.json` makes `HEAD` a new commit, so `commit === HEAD` holds only in the working tree. A review run from a fresh clone would fail Criterion 6 even though nothing is wrong. | `test-evidence.json` | — | No | No fix needed for round 3; recorded so the failure mode is not mistaken for a defect |
| Low | Full suite is 142/146; `test/ai-event-creation/ai-creator.test.tsx`, `test/event-discovery-and-registration/event-detail.test.tsx`, `test/event-discovery-and-registration/explore.test.tsx` and `test/event-management-and-check-in/check-in.test.ts` fail. All 4 also fail on `main` (baseline log, 2026-10-20), so they are not this feature's regression. | 4 other-feature test files | — | No | Track in the owning features |
| Low | `dangerouslySetInnerHTML` is used in `components/ui/chart.tsx:94`, which CON-517 says must be reviewed. It is pre-existing on `main`, unchanged by this branch, and interpolates developer-authored chart config — not user input — so it is recorded, not failed. | `components/ui/chart.tsx:94` | — | No | — |
| Low | The constitution's test rules CON-401/402/403 still read `[to be confirmed]` although Vitest 3.2.7, a `test` script and `test/` all exist. Stale governance text. | `.sdrive/constitution.md` | — | No | Refresh with the Constitution agent |

## 6. Recommendations
- Fix the Convex blind spot first; it blocks every feature on this branch, not just this one, and it is the only finding that has survived two review rounds unchanged.
- Upgrade `shell-quote` from the transitive graph before merge; the tree already reports the fix as available.
- Clean the framework-sync drift (12 files) or commit it deliberately, so the next review starts from a clean tree.
- Consider running review rounds from the integration commit rather than the evidence commit so Criterion 6 is satisfied in a fresh clone.

## 7. Security & Performance
| Area | Status | Reason / measurement |
|------|--------|----------------------|
| Security — secrets, dependencies, CON-51x baseline | fail | Secret scan clean (0 hits across the tree and the diff). Dependencies fail: 1 critical + 2 high with `--omit=dev`, 3 critical + 6 high overall, with no report or waiver. CON-51x: CON-511 pass (Clerk identity resolved via `ctx.auth.getUserIdentity` in `convex/helpers.ts` and used across 6 Convex modules); CON-512 pass (`requireAdmin`/`requireSuperAdmin` enforce roles in Convex at `convex/helpers.ts:14,40`); CON-514 pass (`consumeRateLimit` in `convex/helpers.ts` plus `convex/rateLimiter.ts` wired into admin, analytics, announcements, exports, feedback); CON-515 pass (Zod in forms, Convex argument validators); CON-517 pass with the `chart.tsx` observation above; CON-519 pass (`.env*` git-ignored). CON-513, CON-516 and CON-518 are declared NOT APPLICABLE in the constitution. |
| Performance — NFRs, SEO | pass with a recorded limitation | NFR-008: environment-scoped waiver — no Convex deployment is reachable here, and `convex-test` provably emulates index ranges as full-table JS scans (`scan-or-index-probe.mjs`: 378 ms @73k rows → 2122 ms @584k rows at a fixed 6,200-row result), so its timings measure the emulator, not Convex. The query-plan half of NFR-008 is verified statically and holds. Production p95 must be confirmed on a real backend. NFR-009: measured — axe-core 4.12.1 over 7 real admin components, 0 violation groups, negative control correctly produced `button-name` and `image-alt`. No SEO surface is declared, so SEO is not applicable. |

## 8. Handoff
- **If FAIL:** run the command named in the `Fix with` column for each finding, then `sdrive test admin-dashboard-update`, then `/sdrive:review admin-dashboard-update` again (round 3 of 3). The review does not modify code — a fix moves `HEAD` and invalidates this verdict.
- **Round cap:** this is round 2. If round 3 fails on the same finding, stop and hand it to a human.
