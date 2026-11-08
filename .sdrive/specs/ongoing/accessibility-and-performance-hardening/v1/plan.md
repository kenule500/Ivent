# Plan: Accessibility and Performance Hardening (v1)

## Goals

No new capability. Five outcomes, each measurable:

| Goal | Measure |
|---|---|
| Keyboard-complete journey | Every control reachable, visible focus, dialogs trap and restore focus |
| Screen-reader structure | Landmarks, one `h1`, labels, associated errors, live announcements |
| Perceivable UI | 4.5:1 text, 3:1 UI and focus, no colour-only state, reduced motion honoured |
| Fast event page | Lighthouse mobile ≥ 95, LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms, JS ≤ 180 KB gzip |
| Regressible floor | axe-core and Lighthouse budgets fail the build |

## Architecture

### Shared primitives (`components/a11y/`, `lib/a11y/`)

Four primitives replace the per-screen implementations:

- `FocusTrap` — saves the invoking element, moves focus to the first focusable node inside, cycles Tab/Shift+Tab, closes on Escape, and restores focus on unmount. Falls back to `main` when the trigger no longer exists (EC-001).
- `VisuallyHidden` — clip-based hidden text, used for icon-button names, carousel position, and section context.
- `LiveRegion` — a provider mounted once in the root layout exposing `announce(message, politeness)`; polite for success, assertive for failure (AC-005).
- `SkipLink` — first focusable element, targets `#main`.

`lib/a11y/focus.ts` holds the non-React helpers: `rememberFocus()`, `restoreFocus()`, and `focusFirstInvalid(container)`. Dialogs and forms call these rather than reimplementing focus math.

### Semantics and structure

`app/layout.tsx` renders the skip link, `<header>`, `<main id="main">`, and `<footer>` exactly once. Pages own their single `h1` and a heading order without gaps (AC-003). The five reference pages are the acceptance surface: home, event detail, registration, ticket, feedback.

### Forms

Registration and feedback keep their existing Zod schemas. The change is connective: every input gets an `id`, a `<label htmlFor>`, `aria-describedby` pointing at hint and error nodes, and `aria-invalid` on failure. On submit failure, focus moves to the first invalid field and the summary is announced (AC-004, AC-005).

### Motion and contrast

`app/globals.css` gains a `@media (prefers-reduced-motion: reduce)` block that disables autoplay, transitions, and parallax, and a `:focus-visible` ring token (2px, 3:1). Contrast fixes are token-level only: the muted palette is adjusted where it fails, and the before/after ratios are recorded in the feature report.

### Performance

The event page is the reference page and the budget applies to it:

- Hero image through `next/image` with explicit dimensions and `priority`, so the box is reserved before load (EC-006).
- Fonts with `display: swap` and metric-compatible fallbacks, so the swap does not shift layout.
- Interactive islands (carousel, share, registration CTA) stay behind client boundaries; anything not needed for first paint is dynamically imported.
- No new client-side data fetching on first paint: the page keeps its server-rendered data path.

### Gates

- `test/a11y/axe.test.tsx` renders the five reference pages and asserts zero violations of the WCAG 2.1 A/AA rule set.
- `.lighthouserc.json` runs Lighthouse against the production build on the pinned mobile profile and asserts the budgets.
- `package.json` gains `a11y` and `lighthouse` scripts so both are runnable non-interactively (NFR-005).

## Module changes

| File | Action | Purpose |
|---|---|---|
| `components/a11y/focus-trap.tsx` | superseded | Not built: `@base-ui/react` Dialog already traps focus, closes on Escape, and restores focus |
| `components/a11y/visually-hidden.tsx` | create | Screen-reader-only text |
| `components/a11y/live-region.tsx` | create | Announce provider + hook |
| `components/a11y/skip-link.tsx` | create | Skip to main |
| `lib/a11y/focus.ts` | create | Focus helpers |
| `lib/a11y/use-prefers-reduced-motion.ts` | create | Reactive reduced-motion hook for JS-driven motion |
| `app/layout.tsx` | modify | Landmarks + skip link |
| `app/page.tsx` | modify | Home keyboard, carousel, single `h1` |
| `app/(public)/events/[slug]/page.tsx` | modify | Event page performance shell |
| `app/(public)/events/[slug]/_components/register-modal.tsx` | modify | Labels, errors, focus |
| `components/event-card.tsx` | modify | Keyboard + accessible name |
| `components/ui/dialog.tsx` | modify | Adopt FocusTrap |
| `components/ui/select.tsx` | modify | Arrow keys and announcement |
| `app/globals.css` | modify | Focus ring, reduced motion, contrast tokens |
| `test/a11y/axe.test.tsx` | deferred | Deferred to `/sdrive:test`: test authoring is that agent's job |
| `.lighthouserc.json` | create | Lighthouse budget |

**Reuse:** the existing `components/ui/*` primitives, `next/image`, `lucide-react` icons, and the Vitest setup. No second dialog system, no new animation library, no redesign.

## Milestones

| Milestone | Content | Exit condition |
|---|---|---|
| M0 — Primitives | T1.1–T1.4 | Primitives exist with unit coverage |
| M1 — Reference pages | T2.1–T2.6 | Keyboard and screen-reader paths complete on all five pages |
| M2 — Motion and contrast | T3.1–T3.2 | Reduced motion honoured; contrast ratios recorded |
| M3 — Performance | T4.1–T4.3 | Event page inside the budget on the production build |
| M4 — Gates | T5.1–T5.3 | axe and Lighthouse fail the build on regression |

## Verification

- `npx tsc --noEmit` and `npm run lint` stay clean after every milestone.
- The existing feature suites stay green; the axe suite is the new gate.
- Lighthouse runs against `next build && next start`, never the dev server.
- The manual checklist (focus order, screen-reader flow, zoom at 200%) is recorded with the feature report, because axe covers only part of WCAG.
