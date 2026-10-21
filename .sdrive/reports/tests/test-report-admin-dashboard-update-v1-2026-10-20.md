# Test Report: Admin Dashboard Update (v1)

## 1. Summary
- **Date:** 2026-10-20
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
| AC-005 | TEST-005 | test/admin-dashboard-update/command-center.test.ts; test/admin-console-and-governance/dashboard-page.test.tsx | ✅ Pass |
| AC-006 | TEST-006 | test/admin-dashboard-update/command-center.test.ts; test/admin-console-and-governance/dashboard-page.test.tsx | ✅ Pass |
| AC-007 | TEST-007 | test/admin-dashboard-update/command-center.test.ts; test/admin-console-and-governance/dashboard-page.test.tsx | ✅ Pass |
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
| test/event-discovery-and-registration/event-detail.test.tsx — AC-006: the organizer sees Manage Event | No `Manage Event` button is rendered. Reproduced unchanged on a clean `main` worktree. | No — pre-existing |
| test/event-discovery-and-registration/explore.test.tsx — AC-002: each section shows its own empty state | Two section empty-state queries return `null`. Reproduced unchanged on a clean `main` worktree. | No — pre-existing |
| test/ai-event-creation/ai-creator.test.tsx — AC-005: a server error keeps the dialog open, shows an error toast, and does not populate the form | Error toast is not called. Reproduced unchanged on a clean `main` worktree. | No — pre-existing |
| test/event-management-and-check-in/check-in.test.ts — AC-007: failed scans also count toward the brute-force limit | 7th scan returns `Invalid or cancelled QR code` instead of the rate-limit error. Reproduced unchanged on a clean `main` worktree. | No — pre-existing |

## 4. Notes
- Feature suite: **18 files passed, 43 tests passed** (included in the full run below).
- Full suite: `npm run test` → **142 passed, 4 failed, 146 total**, exit code `1`. The 4 failures are the same 4 that fail on the clean `main` baseline (`23 passed, 4 failed` across the same suites), so none is introduced by this feature.
- Regression fixes were test-only: the legacy dashboard component test now targets the redesigned command center, the registrations test mock now supplies `api.exports.generate` plus `convex/react` `useMutation`, and the export-button test now waits for the button to re-enable after its success toast. No production code changed during the test phase.
- `npx tsc --noEmit` → exit code `0`; `npm run lint` → exit code `0` with 0 errors and 17 pre-existing warnings.
- Governance validation passed: `spec.json`, `plan.json`, `tasks.json`, and `traceability.json` are valid; all 61 traceability rows now carry 34 unique `TEST-###` IDs. The repository wrapper currently resolves the project-local Ajv 6, so the validator was run with a temporary Ajv 8 resolution against `C:\Users\KENULE-NWINEE\node_modules`; no repository file was modified.
- `sdrive verify admin-dashboard-update` exits `7` with `Status: FAIL`. Its detector reports the Convex functions and schema fields as “Missing” and treats unrelated components as “Renamed”, because it only recognises Express/FastAPI/`pages/api` routes. The generated `verification.json` is not treated as evidence and is not committed.
- Raw evidence: `.sdrive/reports/tests/raw/admin-dashboard-update-v1-2026-10-20.log` (full suite), `...-feature.log` (feature suite), and `...-baseline-main.log` (clean `main` baseline).
