# Test Report: Admin Dashboard Update (v1)

## 1. Summary
- **Date:** 2026-10-31
- **Feature:** admin-dashboard-update
- **Version:** v1
- **Total ACs:** 34
- **Tested ACs:** 34
- **Coverage:** 100%
- **Tests Passed:** 43/43

## 2. AC → Test Mapping
| AC ID | Test ID | File | Status |
|-------|---------|------|--------|
| AC-001 | TEST-001 | test/admin-dashboard-update/navigation.test.tsx | ✅ Pass |
| AC-002 | TEST-002 | test/admin-dashboard-update/navigation.test.tsx | ✅ Pass |
| AC-003 | TEST-003 | test/admin-dashboard-update/command-palette.test.tsx | ✅ Pass |
| AC-004 | TEST-004 | test/admin-dashboard-update/command-palette.test.tsx | ✅ Pass |
| AC-005 | TEST-005 | test/admin-dashboard-update/command-center.test.ts | ✅ Pass |
| AC-006 | TEST-006 | test/admin-dashboard-update/command-center.test.ts | ✅ Pass |
| AC-007 | TEST-007 | test/admin-dashboard-update/command-center.test.ts | ✅ Pass |
| AC-008 | TEST-008 | test/admin-dashboard-update/analytics-filters.test.ts | ✅ Pass |
| AC-009 | TEST-009 | test/admin-dashboard-update/analytics-filters.test.ts; test/admin-dashboard-update/analytics-workspace.test.ts | ✅ Pass |
| AC-010 | TEST-010 | test/admin-dashboard-update/analytics-filters.test.ts | ✅ Pass |
| AC-011 | TEST-011 | test/admin-dashboard-update/analytics-workspace.test.ts | ✅ Pass |
| AC-012 | TEST-012 | test/admin-dashboard-update/analytics-filters.test.ts; test/admin-dashboard-update/analytics-workspace.test.ts | ✅ Pass |
| AC-013 | TEST-013 | test/admin-dashboard-update/analytics-workspace.test.ts | ✅ Pass |
| AC-014 | TEST-014 | test/admin-dashboard-update/analytics-workspace.test.ts | ✅ Pass |
| AC-015 | TEST-015 | test/admin-dashboard-update/chart-card.test.tsx | ✅ Pass |
| AC-016 | TEST-016 | test/admin-dashboard-update/exports.test.ts | ✅ Pass |
| AC-017 | TEST-017 | test/admin-dashboard-update/exports.test.ts | ✅ Pass |
| AC-018 | TEST-018 | test/admin-dashboard-update/export-button.test.tsx | ✅ Pass |
| AC-019 | TEST-019 | test/admin-dashboard-update/reports.test.ts | ✅ Pass |
| AC-020 | TEST-020 | test/admin-dashboard-update/reports.test.ts; test/admin-dashboard-update/reports-page.test.tsx | ✅ Pass |
| AC-021 | TEST-021 | test/admin-dashboard-update/platform.test.ts | ✅ Pass |
| AC-022 | TEST-022 | test/admin-dashboard-update/platform.test.ts | ✅ Pass |
| AC-023 | TEST-023 | test/admin-dashboard-update/platform.test.ts; test/admin-dashboard-update/maintenance.test.tsx | ✅ Pass |
| AC-024 | TEST-024 | test/admin-dashboard-update/announcements.test.ts | ✅ Pass |
| AC-025 | TEST-025 | test/admin-dashboard-update/announcements.test.ts | ✅ Pass |
| AC-026 | TEST-026 | test/admin-dashboard-update/announcements.test.ts | ✅ Pass |
| AC-027 | TEST-027 | test/admin-dashboard-update/feedback.test.ts | ✅ Pass |
| AC-028 | TEST-028 | test/admin-dashboard-update/feedback.test.ts | ✅ Pass |
| AC-029 | TEST-029 | test/admin-dashboard-update/feedback.test.ts | ✅ Pass |
| AC-030 | TEST-030 | test/admin-dashboard-update/health.test.ts | ✅ Pass |
| AC-031 | TEST-031 | test/admin-dashboard-update/health.test.ts | ✅ Pass |
| AC-032 | TEST-032 | test/admin-dashboard-update/health-panel.test.tsx | ✅ Pass |
| AC-033 | TEST-033 | test/admin-dashboard-update/settings-projection.test.ts; test/admin-dashboard-update/settings-page.test.tsx | ✅ Pass |
| AC-034 | TEST-034 | test/admin-dashboard-update/settings-projection.test.ts; test/admin-dashboard-update/settings-page.test.tsx | ✅ Pass |

## 3. Failures
| Test | Reason | Blocking |
|------|--------|----------|
| None inside `test/admin-dashboard-update/` | The feature suite ran 43/43 green with exit code `0`. | No |
| test/ai-event-creation/ai-creator.test.tsx — AC-005: a server error keeps the dialog open, shows an error toast, and does not populate the form | `expected "spy" to be called at least once` — the error toast is not raised. Outside this feature. | No — pre-existing |
| test/event-discovery-and-registration/event-detail.test.tsx — AC-006: the organizer sees Manage Event | `Unable to find an accessible element with the role "button" and name /manage/i`. Outside this feature. | No — pre-existing |
| test/event-discovery-and-registration/explore.test.tsx — AC-002: each section shows its own empty state | `expect(received).toBeInTheDocument()` fails on the per-section empty state. Outside this feature. | No — pre-existing |
| test/event-management-and-check-in/check-in.test.ts — AC-007: failed scans also count toward the brute-force limit | The 7th scan returns `Invalid or cancelled QR code` instead of the rate-limit error. Outside this feature. | No — pre-existing |

## 4. Notes
- **Framework:** Vitest 3.2.7 (`package.json` → `"test": "vitest run"`, config `vitest.config.ts`, `environment: "node"`, `include: ["test/**/*.test.{ts,tsx}"]`). Tests live in `test/admin-dashboard-update/` in 18 files using the `.test.ts` / `.test.tsx` suffix, which satisfies CON-404, CON-405 (AC ID in every test name) and CON-406 (per-feature folder).
- **Scope of this pass:** every AC already had a test, so no test file was added or changed. The 2026-10-31 run re-proved the existing suite and refreshed the machine-readable evidence.
- **Feature suite:** `npx vitest run test/admin-dashboard-update --reporter=dot` → **18 files passed, 43 tests passed**, exit code `0`.
- **Evidence run:** `sdrive test admin-dashboard-update --cmd "node .sdrive/reports/tests/run-feature-evidence.js admin-dashboard-update"` → exit `0`, `43 passed / 0 failed / 0 skipped`, `86 749 ms`, commit `56ee610f4068c2efe50c1e8f8ff5d1a37d3fcf4a`, branch `feature/admin-dashboard-update`, `outputHash sha256:d1cf8aca96c518fcfe84f0828c5ae20f19f4781b9fdd07d4ac07a96b5ca09f79`. It wrote `.sdrive/governance/admin-dashboard-update/v1/test-evidence.json`.
- **Evidence improvement:** `.sdrive/reports/tests/run-feature-evidence.js` now also prints the `AC-###` IDs harvested from the Vitest JSON report, so `test-evidence.json` records `acIds` (AC-001 … AC-034) instead of an empty array. The run is therefore verifiable at criterion level, not only by assertion count. `testIds` stays empty because test titles carry AC IDs, not `TEST-###` IDs; the AC→`TEST-###` binding lives in `traceability.json`.
- **Full suite:** `npx vitest run --reporter=dot` → **48 files (44 passed, 4 failed), 146 tests (142 passed, 4 failed)**, exit code `1`. The same four tests failed on the 2026-10-20 baseline, none of them belongs to this feature, and this pass changed no production code, so they are pre-existing and non-blocking.
- **Traceability:** `.sdrive/governance/admin-dashboard-update/v1/traceability.json` already held 61 rows, all `complete`, covering every AC with 34 unique `TEST-###` IDs. It was re-checked against the run and needed no change.
- **Validators:** `node .sdrive/scripts/validate-governance.js` → exit `0`, `admin-dashboard-update/v1/{spec,plan,tasks,traceability,test-evidence,review}.json` all valid. `sdrive verify admin-dashboard-update` → exit `7`, `Status: FAIL` (`Matched: 41`, `Missing: 146`, `Renamed: 2`). The verifier does not scan `convex/` functions, schema fields, or `components/`, so it reports implemented code as missing — the same false negative already logged in `review.json` (`spec-to-code-verification`). The generated `verification.json` is therefore not kept in the working tree: the implementation gate reads that file and would block on the false negative.
- **Raw evidence:** `.sdrive/reports/tests/raw/admin-dashboard-update-vitest.json` (feature run, JSON reporter) and `.sdrive/reports/tests/raw/admin-dashboard-update-v1-2026-10-31-full.log` (full suite).
- **No production code was modified during this test phase.**

