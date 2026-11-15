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
> **Branch verdict: GREEN.** The repo-wide suite is now **257/257** with exit `0`. The
> 31 cross-feature regressions recorded by the review (F1/F2) are repaired in this run;
> §4 documents each root cause and the test-side fix.

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

No test in `test/event-platform-expansion/` fails, and no test in the repo-wide suite
fails. Both runs exit `0`.

| Test | Reason | Blocking |
|------|--------|----------|
| — | No failure in either the feature suite or the full suite. | No |

### 3.1 Cross-feature regressions repaired in this run (review remediation T8.1)

| File | Was | Root cause | Fix |
|------|-----|------------|-----|
| test/accessibility-and-performance-hardening/announcements.test.tsx | 2 | `RegisterModal` calls `useI18n()` at render | Wrap in `LocaleProvider`; `FeedbackPage` left bare (no `useI18n`) |
| test/ai-event-creation/review-before-saving.test.tsx | 1 | `CreateEventPage` calls `useI18n()` | Wrap in `LocaleProvider` |
| test/event-discovery-and-registration/my-tickets.test.tsx | 2 | `useI18n()` **and** `useAction(api.wallet.issueWalletPass)` at `page.tsx:49` absent from the `convex/react` mock | Wrap + add `useAction` stub and the `wallet.issueWalletPass` api key |
| test/event-management-and-check-in/create-event-form.test.tsx | 3 | `CreateEventPage` calls `useI18n()` | Wrap in `LocaleProvider` |
| test/event-management-and-check-in/event-dashboard.test.tsx | 5 | `EventSettingsPanel` calls `useMutation` from an unmocked `convex/react` at `event-settings-panel.tsx:59` | Add a `convex/react` mock and the `events`/`door` api keys the panels read |
| test/registration-ux-polish/optimistic-cancel.test.tsx | 2 | `useI18n()` **and** missing `useAction` export | Wrap + add `useAction` stub |
| test/registration-ux-polish/register-modal-pending.test.tsx | 3 | `useI18n()`; the submit button label became the translated `Register for Event` | Wrap + query `/register for event/i` |
| test/event-discovery-and-registration/event-detail.test.tsx | 8 | The route segment became an async Server Component; the interactive UI moved to `event-detail.tsx`. Also the paid price is now formatted through the event's own currency | Retarget the import at the client component; assert the `Intl`-formatted amount and currency marker |
| test/admin-dashboard-update/settings-page.test.tsx | 2 | `api` mock omitted `platform.getSettings` (`page.tsx:43`) | Add the key to the api mock |
| test/admin-dashboard-update/platform.test.ts | 1 | `getPublicStatus` now also returns `defaultLocale`; assertion was exact-match | Widen to the new contract |
| test/event-management-and-check-in/check-in.test.ts | 2 | QR rejection text changed to `Invalid QR code`, with cancellation split into its own `outcome: "cancelled"` result | Assert the new contract; `/invalid qr code/i` and `/cancelled/i` |

## 4. Notes

### 4.1 Every failure was test-side
Production code was not touched by this run. Each root cause in §3.1 is a fixture that
predates an intentional production change on this branch: `LocaleProvider` adoption in
`app/layout.tsx`, the `useAction`/`useMutation` calls the wallet and settings work added,
the Server Component split of the event route, the currency-aware price formatter, and the
`defaultLocale` and QR-outcome contract changes.

Assertions were tightened, not weakened. The review's "do not weaken assertions" instruction
is honoured: `check-in.test.ts` now pins the *new* messages rather than dropping the
expectations, and `event-detail.test.tsx` asserts the formatted price including its currency
marker instead of the old raw `₦5000` concatenation.

### 4.2 Correction carried forward from the bracketed run
The 2026-11-14 report recorded the 31 failures as "pre-existing, owned elsewhere". That was
wrong: `git merge-base main HEAD` is `47794a6`, and every failing file passes at that commit.
The failures were genuine regressions from this branch and are now fixed at source.

### 4.3 Verification
- Feature suite: `node .sdrive/reports/tests/run-feature-evidence.js event-platform-expansion`
  → exit `0`, 34 passed, 0 failed, 0 skipped. Recorded to `test-evidence.json` with
  `commit` equal to the current `HEAD`, `exitCode: 0`, `summary {passed: 34, total: 34}`.
- Full suite: `npx vitest run` → exit `0`, **257 passed, 0 failed**, 204 files
  (`.sdrive/reports/tests/raw/review-full-suite.json`, `success: true`).
- `npx tsc --noEmit` → exit `0`. The 8 `TS2741` errors are gone with the `event-detail`
  retarget.
- `npm run lint` → exit `0`, 20 warnings, 0 errors (CON-204 passes; warning count unchanged).
- `node .sdrive/scripts/validate-governance.js` → all governance files valid.
- `npx sdrive verify event-platform-expansion` → exit `0`, `warn`,
  `{matched: 90, missing: 0, renamed: 0, extra: 85, withdrawn: 0}`. The 85 extras are
  repo-wide endpoints and spec anchors unrelated to this feature; 0 missing means every
  AC still resolves to a test.

### 4.4 Deferred manual checks
`T7.3` (responsive, keyboard, and French layout pass) and `T7.4` (HTTPS/HSTS and PWA
deployment prerequisites) remain `[deferred]`. Both need a running deployment and a human at
a browser; neither can be discharged by an automated suite.
