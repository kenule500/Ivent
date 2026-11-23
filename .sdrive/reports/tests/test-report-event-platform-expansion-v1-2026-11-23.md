# Test Report: Event Platform Expansion (v1)

## 1. Summary
- **Date:** 2026-11-23
- **Feature:** event-platform-expansion
- **Version:** v1
- **Total ACs:** 34
- **Tested ACs:** 34
- **Coverage:** 100%
- **Tests Passed:** 39/39

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

## 2b. NFR-009 Axe Coverage
| Requirement | Test ID | File | Surface | Status |
|-------------|---------|------|---------|--------|
| NFR-009 | TEST-088 | test/event-platform-expansion/offline-door.test.tsx | Door console (live dashboard, attendee search) | ✅ Pass |
| NFR-009 | TEST-089 | test/event-platform-expansion/questions-ui.test.tsx | Open registration form with custom questions | ✅ Pass |
| NFR-009 | TEST-090 | test/event-platform-expansion/questions-ui.test.tsx | Organizer question builder | ✅ Pass |
| NFR-009 | TEST-091 | test/event-platform-expansion/sponsors.test.tsx | Public sponsor strip | ✅ Pass |
| NFR-009 | TEST-092 | test/event-platform-expansion/wallet-ui.test.tsx | Ticket screen with the Google Wallet control | ✅ Pass |

## 3. Failures
None.

## 4. Notes
- **Framework:** Vitest 3.2.7 with jsdom. The feature suite is `test/event-platform-expansion/` (13 files, 39 tests). Full-repo suite at this tree: **262/262 passed, 75/75 files**; `tsc --noEmit` exit 0; `npm run lint` exit 0 with 0 errors and 20 pre-existing warnings; `npm run build` exit 0.
- **Earlier red run:** the first NFR-009 axe run (same date) failed `TEST-089` with `aria-command-name` on Base UI dialog focus guards. Commit `541c503` upgraded `@base-ui/react` 1.5.0 → 1.9.0, whose `FocusGuard` gates `role="button"` on real VoiceOver+WebKit rather than `navigator.vendor`, so jsdom now gets the `aria-hidden` guard and axe passes. The before/after evidence is in `.sdrive/reports/debug/debug-report-event-platform-expansion-v1-2026-11-23.md`.
- **Axe configuration:** `test/event-platform-expansion/helpers/axe.ts` runs `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa`. `color-contrast` is disabled because jsdom has no layout engine; public-page contrast is covered by Lighthouse, and auth-gated contrast still needs a browser pass (T7.3).
- **Door console:** the live dashboard is scanned, including the attendee search. The scanner dialog is mocked to `null` in that file; it uses the same Base UI `Dialog` as the register modal, which is now clean in jsdom.
- **Safari/VoiceOver limitation:** Base UI 1.9.0 still sets `role="button"` on the focus guard for real VoiceOver+WebKit and does not give it an accessible name. That is upstream behavior; it needs a real VoiceOver pass (T7.3) and, if the guard is announced, an upstream follow-up. The jsdom axe suite cannot exercise that path.
- **Evidence:** `test-evidence.json` recorded at commit `541c503` — 39 passed, 0 failed, 0 skipped, 34 ACs exercised. Committing this evidence and report moves HEAD one commit past the recorded commit; if `/sdrive:review` enforces `test-evidence.commit === HEAD`, it will flag the one-commit lag. That needs the documented parent-commit/tree-hash exception decision.
- **NFR-009** is set to `complete` in `traceability.json`. T7.3 (real browser/VoiceOver/keyboard/French pass) and T7.4 (deployed HTTPS/HSTS/PWA) remain open manual tasks.
- **`npm run a11y`** still points at the non-existent `test/a11y`; the real axe suite is `test/accessibility-and-performance-hardening/axe.test.tsx`. That package-script fix is still handed off.
