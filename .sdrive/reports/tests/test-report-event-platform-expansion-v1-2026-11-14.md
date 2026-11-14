# Test Report: Event Platform Expansion (v1)

## 1. Summary
- **Date:** 2026-11-14
- **Feature:** event-platform-expansion
- **Version:** v1
- **Total ACs:** 34
- **Tested ACs:** 34
- **Coverage:** 100%
- **Tests Passed:** 26/34

## 2. AC → Test Mapping
| AC ID | Test ID | File | Status |
|-------|---------|------|--------|
| AC-001 | TEST-054 | test/event-platform-expansion/share-card.test.tsx | ✅ Pass |
| AC-002 | TEST-055 | test/event-platform-expansion/share-card.test.tsx | ❌ Fail |
| AC-003 | TEST-056 | test/event-platform-expansion/share-card.test.tsx | ✅ Pass |
| AC-004 | TEST-057 | test/event-platform-expansion/sponsors.test.tsx | ✅ Pass |
| AC-005 | TEST-058 | test/event-platform-expansion/sponsors-server.test.ts | ❌ Fail |
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
| AC-021 | TEST-074 | test/event-platform-expansion/questions-server.test.ts | ❌ Fail |
| AC-022 | TEST-075 | test/event-platform-expansion/questions-server.test.ts | ❌ Fail |
| AC-023 | TEST-076 | test/event-platform-expansion/questions-ui.test.tsx | ✅ Pass |
| AC-024 | TEST-077 | test/event-platform-expansion/questions-ui.test.tsx | ❌ Fail |
| AC-025 | TEST-078 | test/event-platform-expansion/questions-server.test.ts | ✅ Pass |
| AC-026 | TEST-079 | test/event-platform-expansion/localization.test.ts | ❌ Fail |
| AC-027 | TEST-080 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-028 | TEST-081 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-029 | TEST-082 | test/event-platform-expansion/localization.test.ts | ❌ Fail |
| AC-030 | TEST-083 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-031 | TEST-084 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |
| AC-032 | TEST-085 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |
| AC-033 | TEST-086 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |
| AC-034 | TEST-087 | test/event-platform-expansion/localization-ui.test.tsx | ❌ Fail |

## 3. Failures
| Test | Reason | Blocking |
|------|--------|----------|
| AC-002 / TEST-055 | The generated 1200x630 Open Graph card renders the title, date, location, and cover, but omits the organizer name. `app/(public)/events/[slug]/opengraph-image.tsx` never renders `organizerName`. | Yes |
| AC-005 / TEST-058 | A sponsor website of `javascript:alert(1)` is stripped to `undefined` and the mutation succeeds instead of rejecting the save. `safeWebsiteUrl()` is used as a sanitizer, not a validator. | Yes |
| AC-021 / TEST-074 | Editing a question that already has answers creates version 2 but does not archive version 1. The active list contains only the edited definition; no archived definition remains for historical answers. | Yes |
| AC-022 / TEST-075 | The registration CSV omits columns for archived questions. `convex/exports.ts` skips archived definitions, so an archived `Dietary` question has no header or value column. | Yes |
| AC-024 / TEST-077 | An invalid answer triggers the global alert and server rejection, but the field itself has no `aria-invalid` or field-level accessible error. The input value is preserved. | Yes |
| AC-026 / TEST-079 | Platform settings accept `GHS` instead of rejecting it. `supportedCurrencies()` returns every `Intl` currency rather than only NGN, USD, GBP, and EUR. | Yes |
| AC-029 / TEST-082 | Date and time output uses the event timezone but does not show the timezone explicitly. Observed `May 13, 2027, 12:30 AM` and `12:30 AM – 1:30 AM` with no `Africa/Lagos`, `GMT+1`, or `WAT` label. | Yes |
| AC-034 / TEST-087 | An unsupported currency is rendered literally instead of falling back. `formatEventPrice("paid", 5000, { locale: "de", currency: "XYZ" })` returns `XYZ 5,000.00` instead of the USD fallback. The locale notice and unsupported-currency normalization for other call sites work. | Yes |

## 4. Notes

### Feature suite verdict
The event-platform-expansion suite is **red**: 26 passed, 8 failed, 0 skipped, 34 total. The failing tests are implementation gaps against the approved acceptance criteria. No production code was changed while testing.

### Full repository suite
The full suite (`npx vitest run --reporter=dot`) also exits 1: **218 passed, 39 failed, 0 skipped, 257 total** across 75 files. Eight failures are the feature AC failures above; 31 are outside this feature and indicate regressions or stale tests that must be triaged before review:

| File | Failures | Likely cause |
|------|----------|--------------|
| test/accessibility-and-performance-hardening/announcements.test.tsx | 2 | Components now call `useI18n()` but old tests render them without `LocaleProvider`. |
| test/registration-ux-polish/register-modal-pending.test.tsx | 3 | Same missing `LocaleProvider` in existing tests. |
| test/ai-event-creation/review-before-saving.test.tsx | 1 | Same missing `LocaleProvider` in existing tests. |
| test/event-management-and-check-in/create-event-form.test.tsx | 3 | Same missing `LocaleProvider` in existing tests. |
| test/event-management-and-check-in/event-dashboard.test.tsx | 5 | Same missing `LocaleProvider` in existing tests. |
| test/event-discovery-and-registration/my-tickets.test.tsx | 2 | Same missing `LocaleProvider` in existing tests. |
| test/registration-ux-polish/optimistic-cancel.test.tsx | 2 | Same missing `LocaleProvider` in existing tests. |
| test/admin-dashboard-update/settings-page.test.tsx | 2 | Page query shape changed and the test mock does not expose `api.platform`. |
| test/event-discovery-and-registration/event-detail.test.tsx | 8 | `EventPageProps` now requires `params`; old tests render the page without route params. |
| test/admin-dashboard-update/platform.test.ts | 1 | `platform.getPublicStatus` now includes `defaultLocale`, so the old exact-equality assertion fails. |
| test/event-management-and-check-in/check-in.test.ts | 2 | Existing assertion expects `/invalid or cancelled/i`, but the new message is `Invalid QR code`. |

These are outside the approved feature test plan. They must not be dismissed as unrelated noise: the `useI18n` failures come from the localization work in this feature, and the event-detail and platform-shape failures are contract changes from this feature. They need either production fixes or deliberate test updates before `/sdrive:review`.

### Deferred and manual checks
- **T7.3** manual responsive, keyboard, and French QA at 360 px, 768 px, and 1280 px remains a human pass. AC-032's automated test is a French render, accessible-name, and locale-formatting smoke test; jsdom cannot measure overflow or clipping.
- **T7.4** production HTTPS/HSTS and service-worker confirmation requires host access. PWA prerequisites are documented but not verified against a deployment.
- **Google Wallet live issuance** requires `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_WALLET_PRIVATE_KEY`. Tests use a generated RSA key and mocked `fetch`; no real credential was read.
- **Apple Wallet** remains unavailable by decision and is not presented as an option.
- **Withdrawn Criteria:** none. The spec has 34 active ACs and no `withdrawn` flags.

### Evidence and validators
- Test evidence: `.sdrive/governance/event-platform-expansion/v1/test-evidence.json` records `exitCode: 1`, 26 passed / 8 failed / 34 total, and AC-001–AC-034.
- Raw feature run: `.sdrive/reports/tests/raw/event-platform-expansion-v1-2026-11-14.log` and `.json`.
- Full-suite log: `.sdrive/reports/tests/raw/event-platform-expansion-v1-2026-11-14-full.log`.
- `npx sdrive verify event-platform-expansion` completed with status **WARN**: 90 matched, 0 missing, 85 extra files outside the plan. The extra list is the existing codebase, not missing plan work.
- `node .sdrive/scripts/validate-governance.js` passed; `spec.json`, `plan.json`, `tasks.json`, `traceability.json`, and `test-evidence.json` are valid.
- `npx tsc --noEmit` reports only the 8 pre-existing `test/event-discovery-and-registration/event-detail.test.tsx` errors where `EventPageProps.params` is missing. The new event-platform-expansion test files typecheck cleanly after casting the IndexedDB helper boundary and the two DOM/Convex test-double edges.
- Traceability was updated only for the 26 passing ACs. The 8 failing ACs have no test IDs recorded and are not claimed as complete.
- `.sdrive/reports/tests/run-feature-evidence.js` was adjusted to print the summary and AC IDs even when Vitest exits non-zero, so a failing run still produces usable evidence. This is test tooling, not production code.
