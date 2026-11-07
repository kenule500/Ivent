# Accessibility Report: Admin Dashboard Update (v1)

**Task:** T7.3 — Record NFR-009 accessibility evidence or a waiver
**Date:** 2026-11-02
**Feature version:** v1
**NFR:** NFR-009 — "Every new screen MUST meet WCAG 2.1 AA: visible focus, 4.5:1 text contrast, labelled controls, keyboard-complete palette and dialogs, chart data-table alternatives, and status messages announced without relying on colour."
**Verdict:** **EVIDENCE RECORDED** — automated + component checks pass; two items are
explicitly lower-confidence (contrast, full-page scans) and are stated as such.

## 1. Executive Summary

- An **axe-core 4.12.1** scan of the real shared admin components (rendered with the
  app's own code, not mock-ups) found **0 violation groups** against the WCAG 2.1 A + AA
  rule tags.
- A **negative control** was included and correctly produced violations
  (`button-name`, `image-alt`), proving the harness actually evaluates; a clean result
  from a harness that cannot fail would be worthless.
- The feature's own test suite asserts keyboard and ARIA behaviour directly
  (56 accessibility-related assertions across 8 files) — see §4.
- One NFR-009 clause — **4.5:1 contrast** — cannot be computed by axe in jsdom
  (no layout engine), so it is verified by design system + manual statement, not by
  this scan (§6).

## 2. Method

- **Tool:** custom harness — `.sdrive/reports/accessibility/benchmarks/nfr-009-axe.mjs`.
  It bundles the real components with esbuild, server-renders each to static HTML with
  `react-dom/server`, mounts the HTML in jsdom, injects `axe.source`, and runs
  `axe.run` with `runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21a","wcag21aa"] }`.
- **Components scanned (7 cases, all real source):**
  `PageHeader` (title/description/breadcrumb), `PanelState` (empty; error-with-retry),
  `DataTableAlt` (chart table alternative), `TrendCard` (positive delta; new/zero
  baseline), `ChartCard` (with its `<details>` data-table disclosure).
- **Negative control (mandatory):** a fragment with an alt-less `<img>` and an
  empty `<button>` → axe reported `button-name`, `image-alt`. The harness is live.
- **Raw data:** `benchmarks/nfr-009-raw.json`.

## 3. Results

| Component | axe violation groups (WCAG 2.1 A+AA) |
|-----------|--------------------------------------|
| PageHeader (dashboard) | 0 |
| PanelState (empty) | 0 |
| PanelState (error with retry) | 0 |
| DataTableAlt (chart alternative) | 0 |
| TrendCard (positive delta) | 0 |
| TrendCard (new / zero baseline) | 0 |
| ChartCard (with data-table alternative) | 0 |
| **Negative control** | **2 (expected): `button-name`, `image-alt`** |

## 4. Criterion-by-criterion Evidence (from source + tests)

The suite in `test/admin-dashboard-update/` asserts the NFR's clauses mechanically.
Highlights (test names carry their AC ID, per CON-405):

- **Labelled controls / palette keyboard completeness (AC-003):**
  `command-palette.test.tsx` asserts the input is a labelled `combobox` with
  `aria-autocomplete="list"` and `aria-expanded`, that `ArrowDown` moves
  `aria-activedescendant` between `role="option"` nodes, that `Enter` opens the
  highlighted destination, and that `Escape` closes the dialog.
- **Chart data-table alternatives (AC-015):** `chart-card.test.tsx` asserts the
  `<details>`/`<summary>` disclosure and finds the alternative via
  `getByRole("table", { name: "…" })`, `columnheader`, and `cell` — i.e. the same
  numbers are reachable by role, not just visually.
- **Status announced without colour (AC-005/AC-011):** `TrendCard` renders a text +
  arrow delta (not colour alone) and renders "new" for a zero baseline; the axe scan
  of both the positive and new/zero variants is clean.
- **Loading/empty/error via semantics (AC-007/AC-032):** `PanelState` empty and
  error states are exposed to axe with a real retry control; the suite additionally
  asserts `getByRole("status")` for loading.
- **Navigation marked for assistive tech (AC-001):** `AdminSidebar` sets
  `aria-current="page"`; `page-header.tsx` sets `aria-current="page"` on the last
  breadcrumb; the axe scan of `PageHeader` is clean.

**Source-level statutory checks (grep, repo-wide):**
`prefers-reduced-motion` honoured globally (`app/globals.css`, `@media` block,
`transition/animation-duration: 0.01ms`); icon-only admin buttons carry
`aria-label` (23 occurrences across `components/admin`, `AdminSidebar`, `app/admin`);
`aria-current` present in `page-header.tsx`, `AdminSidebar.tsx`, `pagination.tsx`,
`feedback/page.tsx`; no `dangerouslySetInnerHTML` in the feature (NFR-005).

## 5. What This Evidence Does and Does Not Prove

**Proves (automated, reproducible):** the seven shared components are free of
axe-detectable WCAG 2.1 A/AA violations; the palette, dialogs, and chart table
behave as asserted by the passing feature suite.

**Does not prove (and is not claimed):**

- **Full-page scans.** The chart components wrap Recharts, which needs a layout
  engine (`ResponsiveContainer` measured 0×0 in jsdom); the scan therefore covers
  the surrounding card/table semantics, not the SVG internals. Per-page scans of
  every route remain a manual/CI-browser step.
- **Manual keyboard and screen-reader walkthrough** of the live app — the suite's
  `user-event` keyboard assertions are a proxy, not a screen-reader session.
- **Low-vision/zoom** behaviour and real-device 360px rendering (jsdom has no layout).
  The shared header is written to wrap at 360px (`page-header.tsx` comment + `min-w-0`
  classes) and `CON-304`/`NFR-010` require it, but this scan cannot measure pixels.

## 6. Contrast (4.5:1) — Verified by Design System, Not by This Scan

axe cannot compute contrast in jsdom (no rendered colours). Contrast is therefore
recorded as **met by token choice**: every new surface uses the shared
`components/ui/` primitives and semantic tokens (`text-foreground`,
`text-muted-foreground`, `bg-background`, `border`) on the single dark-first palette
(CON-301, CON-302), whose foreground/background token pairs are the ones the whole
product already ships. A browser-based axe run (real layout) should confirm this in
CI; until then the 4.5:1 clause rests on the design system, and this report says so
rather than claiming a measured pass.

## 7. Waiver / Residual Risk

No waiver is requested for NFR-009: the automated and suite evidence above supports
the clause, with the two lower-confidence items (contrast measurement, full-page
scans) named as **residual, to be closed by a browser-based axe/CI run** rather than
waived. No `/sdrive:performance`-style environment blocker applies — axe-core was
available and was run.

## 8. Reproduce

```
node .sdrive/reports/accessibility/benchmarks/nfr-009-axe.mjs
```
Expected: negative control → 2 groups; all 7 components → 0 groups; exit 0.
Raw JSON: `.sdrive/reports/accessibility/benchmarks/nfr-009-raw.json`.
