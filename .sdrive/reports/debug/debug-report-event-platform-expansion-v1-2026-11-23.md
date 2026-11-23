# Debug Report: Event Platform Expansion (v1)

## 1. Executive Summary
- **Date:** 2026-11-23
- **Auditor:** AI Debug Agent
- **Feature Version:** v1
- **Overall Status:** Fixed
- **Defects Found:** 1 — RUNTIME (accessibility/ARIA)

## 2. Reproduction
- **Symptom:** `TEST-089` (open registration form, axe) fails with `aria-command-name: ARIA commands must have an accessible name` on two Base UI dialog focus guards. The feature suite is 38/39 and the full repo suite is 261/262.
- **Steps:**
  1. `npx vitest run test/event-platform-expansion/questions-ui.test.tsx`
  2. Or `npx vitest run` for the full suite.
- **Environment:** Windows, Node 24.20.0, Vitest 3.2.7, jsdom, `@base-ui/react@1.5.0`, axe-core 4.14.0.
- **Reproduced:** Yes — the same failure reproduced in the targeted file and the full suite.

## 3. Evidence (Before)
- **Detection method:** axe-core 4.14 via `test/event-platform-expansion/helpers/axe.ts` (WCAG 2.1 A/AA; `color-contrast` disabled because jsdom has no layout engine).
- **Observed:**
  ```
  aria-command-name: ARIA commands must have an accessible name
  span[data-base-ui-focus-guard][role="button"][tabindex="0"]:nth-child(3)
  span[data-base-ui-focus-guard][role="button"][tabindex="0"]:nth-child(5)
  ```
  Rendered guard:
  ```html
  <span data-type="inside" tabindex="0" data-base-ui-focus-guard="" role="button"
        style="clip-path: inset(50%); overflow: hidden; white-space: nowrap;
               width: 1px; height: 1px; margin: -1px; position: fixed; top: 0; left: 0;"></span>
  ```
  The guard is visually hidden, focusable, exposed as a button, and has no accessible name.
- **Counts:** feature suite 38/39, full suite 261/262 (only `TEST-089` red).

## 4. Root Cause
- **Class:** RUNTIME (accessibility/ARIA).
- **Root cause:** `@base-ui/react@1.5.0`'s `FocusGuard` decides Safari with `isSafari = /apple/i.test(navigator.vendor)`. jsdom reports `navigator.vendor = "Apple Computer, Inc."`, so the guard is rendered with `role="button"`, `tabindex="0"` and no `aria-hidden`; axe correctly reports the unnamed button. Real Chrome/Firefox take the other branch (`aria-hidden="true"`). The register modal only hosts the shared Base UI `Dialog`; its own markup is not the cause.
- **Location:** `node_modules/@base-ui/react/utils/FocusGuard.js` (1.5.0), used by `components/ui/dialog.tsx`.
- **Other defects from the same cause:** every Base UI dialog renders the same guards — the door scanner modal, the cancel-registration confirmation, the question-delete confirmation and the sponsor dialogs. Only the register modal was rendered open in the axe suite, so only it reported the violation.

## 5. Fix Applied
- **Change:** Upgrade the already-declared dependency to the upstream version that uses an accurate platform check:
  ```bash
  npm install "@base-ui/react@^1.9.0"
  ```
  Result: `@base-ui/react@1.9.0`, `@base-ui/utils@0.5.0`, `use-sync-external-store@1.7.0`, `reselect@5.3.0`.
  In 1.9.0 the guard condition is `platform.screenReader.voiceOver && platform.engine.webkit`. jsdom has no VoiceOver (`voiceOver` is `os.apple`, false on Windows), so the guard is `aria-hidden` with no role and axe passes. The role is now limited to real VoiceOver + WebKit instead of every Apple-vendor browser.
- **Test timing adaptations required by the upgrade (assertions unchanged):**
  - `test/accessibility-and-performance-hardening/keyboard.test.tsx`: 1.9.0 moves focus inside the dialog in an effect, so the focus-trap assertion now waits with `waitFor` (the neighbouring test already did this).
  - `test/registration-ux-polish/register-modal-pending.test.tsx`: 1.9.0 settles the dialog faster than the old 100 ms timer, so the pending button could disappear before `findByRole` observed it. The test now uses a never-resolving promise so the pending state is deterministic; the double-submit assertion is unchanged.
- **Files touched:** `package.json`, `package-lock.json`, the two test files above, this report.
- **Scope justification:** The defect is upstream. Upgrading is the smallest fix that removes the false Safari branch without adding a workaround in the shared `Dialog`; no product code changed. The two test edits are timing-only and do not weaken their assertions.

## 6. Evidence (After)
- **Detection method:** Same axe helper and same tests.
- **Observed:**
  - `npx vitest run test/event-platform-expansion/questions-ui.test.tsx` — 5/5 passed (including TEST-089).
  - `npx vitest run` — **262/262 passed, 75/75 files**.
  - `npx tsc --noEmit` — exit 0.
  - `npm run lint` — exit 0, 0 errors, 20 pre-existing warnings.
  - `npm run build` — exit 0.
- **Comparison:** Before: 261/262 with `aria-command-name` on two guards. After: 262/262, no axe violations.

## 7. Regression Verification
- [x] Reproduction re-run and defect no longer present (`TEST-089`).
- [x] Test suite passed (262/262).
- [x] Regression test added for this defect — `TEST-089` was added by the Test agent and is now green; no new test was needed.
- **Limitations:**
  - On real Safari + VoiceOver, 1.9.0 still sets `role="button"` on the guard and does not give it an accessible name. That is upstream behavior; it needs a real VoiceOver pass (T7.3) and, if the guard is announced, an upstream follow-up. The jsdom axe suite cannot exercise that path.
  - jsdom cannot verify 4.5:1 contrast; the axe helper disables `color-contrast` by design.
  - The install hit `ENOSPC` once because the C: drive was full. Space was recovered by deleting the regenerable `.next` directory; the install then completed and the build succeeded. `.next` was removed again after the build to keep working space free.

## 8. Remaining Recommendations
- Run `/sdrive:test event-platform-expansion` to re-record `test-evidence.json` at the new HEAD and update the NFR-009 traceability row. NFR-009 was deliberately left `in_progress` here because the Test agent owns the evidence/status transition.
- A new review round still needs explicit human authorization; round 3 of 3 is exhausted.
- Complete T7.3 (real Safari/VoiceOver + browser contrast) and T7.4 (deployed HTTPS/HSTS/PWA).
- Fix `npm run a11y` — it still points at the non-existent `test/a11y`.
- The C: drive remains at ~100% with ~100 MB free; clean the npm cache or other regenerable data before the next build.
