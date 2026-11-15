# Test Report: Event Platform Expansion (v1)

## 1. Summary
- **Date:** 2026-11-15
- **Feature:** event-platform-expansion
- **Version:** v1
- **Total ACs:** 34
- **Tested ACs:** 34
- **Coverage:** 100%
- **Tests Passed:** 34/34

> **Feature verdict: GREEN.** The feature suite exits `0` with 34 passing tests and every
> one of AC-001…AC-034 exercised. `sdrive verify` reports `warn` with 0 missing.
>
> **Branch verdict: RED.** The repo-wide suite is 226/257. All 31 remaining failures sit in
> *other* features' suites, and — correcting the record kept in the 2026-11-14 report — they
> are **not pre-existing**. Every failing file passes at the branch point
> (`47794a6`); this branch introduced the breakage. §4 has the evidence and the split
> between mechanical fixture drift and one behavioural change.

## 2. AC → Test Mapping
| AC ID | Test ID | File | Status |
|-------|---------|------|--------|
| AC-001 | TEST-054 | test/event-platform-expansion/share-card.test.tsx | ✅ Pass |
| AC-002 | TEST-055 | test/event-platform-expansion/share-card.test.tsx | ✅ Pass |
| AC-003 | TEST-056 | test/event-platform-expansion/share-card.test.tsx | ✅ Pass |
| AC-004 | TEST-057 | test/event-platform-expansion/sponsors.test.tsx | ✅ Pass |
| AC-005 | TEST-058 | test/event-platform-expansion/sponsors-server.test.ts | ✅ Pass |
| AC-006 | TEST-059 | test/event-platform-expansion/sponsors-server.test.ts | ✅ Pass |
| AC-007 | TEST-060 | test/event-platform-expansion/door-mode.test.ts | ✅ Pass |
| AC-008 | TEST-061 | test/event-platform-expansion/door-mode.test.ts | ✅ Pass |
| AC-009 | TEST-062 | test/event-platform-expansion/door-mode.test.ts | ✅ Pass |
| AC-010 | TEST-063 | test/event-platform-expansion/offline-door.test.tsx | ✅ Pass |
| AC-011 | TEST-064 | test/event-platform-expansion/offline-door.test.tsx | ✅ Pass |
| AC-012 | TEST-065 | test/event-platform-expansion/offline-sync.test.ts | ✅ Pass |
| AC-013 | TEST-066 | test/event-platform-expansion/offline-door.test.tsx | ✅ Pass |
| AC-014 | TEST-067 | test/event-platform-expansion/offline-shell.test.ts | ✅ Pass |
| AC-015 | TEST-068 | test/event-platform-expansion/wallet.test.ts | ✅ Pass |
| AC-016 | TEST-069 | test/event-platform-expansion/wallet.test.ts | ✅ Pass |
| AC-017 | TEST-070 | test/event-platform-expansion/wallet.test.ts | ✅ Pass |
| AC-018 | TEST-071 | test/event-platform-expansion/wallet.test.ts | ✅ Pass |
| AC-019 | TEST-072 | test/event-platform-expansion/wallet-ui.test.tsx | ✅ Pass |
| AC-020 | TEST-073 | test/event-platform-expansion/questions-ui.test.tsx | ✅ Pass |
| AC-021 | TEST-074 | test/event-platform-expansion/questions-server.test.ts | ✅ Pass |
| AC-022 | TEST-075 | test/event-platform-expansion/questions-server.test.ts | ✅ Pass |
| AC-023 | TEST-076 | test/event-platform-expansion/questions-ui.test.tsx | ✅ Pass |
| AC-024 | TEST-077 | test/event-platform-expansion/questions-ui.test.tsx | ✅ Pass |
| AC-025 | TEST-078 | test/event-platform-expansion/questions-server.test.ts | ✅ Pass |
| AC-026 | TEST-079 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-027 | TEST-080 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-028 | TEST-081 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-029 | TEST-082 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-030 | TEST-083 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-031 | TEST-084 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |
| AC-032 | TEST-085 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |
| AC-033 | TEST-086 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |
| AC-034 | TEST-087 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |

## 3. Failures

No test in `test/event-platform-expansion/` fails. The 31 failures below belong to other
features and are recorded here because they share this branch.

| Test | Reason | Blocking |
|------|--------|----------|
| — | No feature-scoped failure. AC-001…AC-034 all pass. | No |

### 3.1 Cross-feature failures introduced by this branch

| File | Failed | Root cause | Class |
|------|--------|------------|-------|
| test/accessibility-and-performance-hardening/announcements.test.tsx | 2 | Renders `RegisterModal` without `LocaleProvider` | Fixture drift |
| test/ai-event-creation/review-before-saving.test.tsx | 1 | Renders `CreateEventPage` without `LocaleProvider` | Fixture drift |
| test/event-discovery-and-registration/my-tickets.test.tsx | 2 | Renders `MyTicketsPage` without `LocaleProvider` | Fixture drift |
| test/event-management-and-check-in/create-event-form.test.tsx | 3 | Renders `CreateEventPage` without `LocaleProvider` | Fixture drift |
| test/event-management-and-check-in/event-dashboard.test.tsx | 5 | Renders `EventDashboardPage` without `LocaleProvider` | Fixture drift |
| test/registration-ux-polish/register-modal-pending.test.tsx | 3 | Renders `RegisterModal` without `LocaleProvider` | Fixture drift |
| test/registration-ux-polish/optimistic-cancel.test.tsx | 2 | Renders `MyTicketsPage` without `LocaleProvider` | Fixture drift |
| test/event-discovery-and-registration/event-detail.test.tsx | 8 | Renders `<EventDetailPage />` with no `params`; `EventPageProps.params` is now required | Fixture drift |
| test/admin-dashboard-update/settings-page.test.tsx | 2 | `api` mock omits `platform.getSettings`, which the page now queries | Fixture drift |
| test/admin-dashboard-update/platform.test.ts | 1 | `getPublicStatus` now also returns `defaultLocale`; assertion is exact-match | Fixture drift |
| test/event-management-and-check-in/check-in.test.ts | 2 | **Behavioural:** QR rejection text changed from `Invalid or cancelled QR code` to `Invalid QR code`, with cancellation split into its own `outcome: "cancelled"` result | Needs owner sign-off |

## 4. Notes

### 4.1 Correction to the previous report
The 2026-11-14 report recorded these 31 failures as "pre-existing, owned elsewhere". That is
wrong. `git merge-base main HEAD` is `47794a6`; in a clean worktree at that commit all 11
failing files pass (17 + 21 = 38 tests, exit `0`). Each failure also reproduces when its file
is run in isolation on this branch, so none of it is cross-file test pollution. The branch is
what broke them.

### 4.2 Why they broke
Production changes on this branch are all intentional and correct for the feature:

- Every page under `app/` that renders translated copy now calls `useI18n()`, which throws
  outside a provider. `app/layout.tsx` supplies `LocaleProvider`, so the app is fine — but
  the older suites mount pages directly, with no provider.
- `getPublicStatus` now also returns `defaultLocale` (AC-026/AC-023 surface).
- The registration page signature grew a required `params` prop.
- `app/admin/settings/page.tsx` now queries `platform.getSettings`.
- QR rejection was split into invalid vs. cancelled outcomes.

So ten files need mechanical fixture updates — wrap the render in `LocaleProvider`, add the
missing mock key, pass `params`, widen the exact-match assertion. The eleventh
(`check-in.test.ts`) asserts behaviour that was deliberately changed and needs the owning
feature to confirm the new contract rather than a silent rewrite.

### 4.3 Test-file changes made in this run
Two defects in this feature's own test files were fixed (test-only, no production code touched):

- `share-card.test.tsx:180` — replaced `Record<string, any>` with a declared `JsonLdEvent`
  type. This was the repository's only ESLint **error**; `npx eslint` now exits `0` with
  20 warnings and 0 errors, so CON-204 passes. It also cleared the `tsc` error that the
  `any` masked.
- `questions-server.test.ts:4` — dropped an unused `Id` import (ESLint warning).

### 4.4 Verification
- Feature suite: `node .sdrive/reports/tests/run-feature-evidence.js event-platform-expansion`
  → exit `0`, 34 passed, 0 failed, 0 skipped.
- `npx sdrive verify event-platform-expansion` → exit `0`, `warn`,
  `{matched: 90, missing: 0, renamed: 0, extra: 85, withdrawn: 0}`. The 85 extras are
  repo-wide endpoints and spec anchors unrelated to this feature; 0 missing means every
  AC still resolves to a test.
- `node .sdrive/scripts/validate-governance.js` → all governance files valid.
- `npx tsc --noEmit` → still exits non-zero, but only on the 8 pre-existing
  `event-detail.test.tsx` `EventPageProps.params` errors counted in §3.1; no new type errors.
- `npx eslint` → exit `0`, 20 warnings, 0 errors.

### 4.5 Deferred manual checks
`T7.3` (responsive, keyboard, and French layout pass) and `T7.4` (HTTPS/HSTS and PWA
deployment prerequisites) remain `[deferred]`. Both need a running deployment and a human at
a browser; neither can be discharged by an automated suite.
