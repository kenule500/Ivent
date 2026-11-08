# Test Report: Accessibility and Performance Hardening (v1)

## 1. Summary
- **Date:** 2026-11-08
- **Feature:** accessibility-and-performance-hardening
- **Version:** v1
- **Total ACs:** 10
- **Tested ACs:** 8
- **Coverage:** 80%
- **Tests Passed:** 24/24

## 2. AC → Test Mapping
| AC ID | Test ID | File | Status |
|-------|---------|------|--------|
| AC-001 | TEST-035 | test/accessibility-and-performance-hardening/primitives.test.tsx, keyboard.test.tsx | ✅ Pass |
| AC-002 | TEST-036 | test/accessibility-and-performance-hardening/keyboard.test.tsx | ✅ Pass |
| AC-003 | TEST-037 | test/accessibility-and-performance-hardening/primitives.test.tsx, keyboard.test.tsx | ✅ Pass |
| AC-004 | TEST-038 | test/accessibility-and-performance-hardening/announcements.test.tsx | ✅ Pass |
| AC-005 | TEST-039 | test/accessibility-and-performance-hardening/primitives.test.tsx, announcements.test.tsx | ✅ Pass |
| AC-006 | TEST-040 | test/accessibility-and-performance-hardening/contrast.test.ts | ✅ Pass |
| AC-007 | TEST-041 | test/accessibility-and-performance-hardening/primitives.test.tsx | ✅ Pass |
| AC-010 | TEST-042 | test/accessibility-and-performance-hardening/axe.test.tsx | ✅ Pass |

**Not unit-tested: AC-008 and AC-009.** Both describe a measured property of the
production build (Lighthouse mobile ≥ 95, LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms,
first-load JS ≤ 180 KB gzip). They cannot be asserted in jsdom — there is no
layout engine, no network, and Next 16 does not emit per-route First Load JS in
its build table. They are covered by `.lighthouserc.json` (mobile preset, three
runs, budgets asserted) and must be recorded by a real measurement run, which is
`/sdrive:performance`'s job. Until that report exists, coverage is 80% by
design, not by omission.

## 3. Failures
| Test | Reason | Blocking |
|------|--------|----------|
| — | None. 24/24 pass. | No |

## 4. Notes
- **Framework:** Vitest 3.2.7 (jsdom for component tests, node for the token maths). Evidence records `exitCode: 0`, 24 passed / 0 failed / 0 skipped, and the AC IDs found in the run: AC-001–AC-007 and AC-010.
- **axe scope:** the suite runs axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) over the primitives, an interactive `EventCard`, and a live-region page shell. The `color-contrast` rule is disabled because jsdom cannot compute rendered colours; AC-006 covers contrast deterministically by parsing the real `globals.css` tokens and asserting the WCAG ratios in both themes. A full five-page sweep needs Clerk and Convex at runtime and belongs to the e2e/Lighthouse job.
- **Dialog close-on-Escape** is implemented by `@base-ui/react` and is exercised by the library's own tests; in jsdom the dismiss handler does not fire from a synthetic key event, so the suite asserts what it can verify deterministically — that the dialog is named by its title and owns focus on open.
- **Coverage basis:** 10 in-scope acceptance criteria, none withdrawn; 15 of 18 traceability rows now carry a test ID.
