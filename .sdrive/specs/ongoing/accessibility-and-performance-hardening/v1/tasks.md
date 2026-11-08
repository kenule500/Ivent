# Tasks: Accessibility and Performance Hardening (v1)

Legend: each task lists the requirements and acceptance criteria it closes. Tasks are production work only; test authoring and execution belong to `/sdrive:test`.

## M0 — Shared primitives

- [ ] **T1.1** Build the FocusTrap primitive.
  - Linked: FR-003, AC-002
  - Create `components/a11y/focus-trap.tsx`: save the invoking element, focus the first focusable node inside, cycle Tab/Shift+Tab, close on Escape, restore focus on unmount, fall back to `main` if the trigger is gone.
- [ ] **T1.2** Build VisuallyHidden and SkipLink.
  - Linked: FR-005, FR-001, AC-003, AC-001
  - Create `components/a11y/visually-hidden.tsx` (clip-based hidden text) and `components/a11y/skip-link.tsx` (first focusable element targeting `#main`).
- [ ] **T1.3** Build the LiveRegion provider and hook.
  - Linked: FR-008, AC-005
  - Create `components/a11y/live-region.tsx` with `announce(message, politeness)` backed by a polite and an assertive region; mount once in the root layout.
- [ ] **T1.4** Add focus helpers.
  - Linked: FR-003, FR-007, AC-002, AC-004
  - Create `lib/a11y/focus.ts` with `rememberFocus`, `restoreFocus`, and `focusFirstInvalid(container)`.

## M1 — Reference pages

- [ ] **T2.1** Add landmarks and the skip link to the root layout.
  - Linked: FR-005, FR-006, AC-003
  - Modify `app/layout.tsx`: skip link once, `header`/`main#main`/`footer` landmarks, one `h1` per page.
- [ ] **T2.2** Make the home page keyboard operable.
  - Linked: FR-001, FR-002, FR-010, AC-001, AC-007
  - Modify `app/page.tsx` and `components/event-card.tsx`: keyboard-operable cards, visible focus ring, manual carousel with announced position under reduced motion.
- [ ] **T2.3** Harden the event page semantics and hero shell.
  - Linked: FR-006, FR-009, FR-012, AC-003, AC-006, AC-009
  - Modify `app/events/[slug]/page.tsx`: single `h1`, heading order, contrast and focus fixes, hero box reserved with `next/image` dimensions and priority.
- [ ] **T2.4** Label the registration form and connect its errors.
  - Linked: FR-007, FR-001, AC-004, AC-001
  - Modify `app/events/[slug]/register/page.tsx`: programmatic labels, `aria-describedby` for hints and errors, `aria-invalid`, focus to the first invalid field.
- [ ] **T2.5** Announce ticket readiness.
  - Linked: FR-008, AC-005
  - Announce readiness once through the live region; no focus move, no re-announcement on re-render.
- [ ] **T2.6** Announce feedback submission outcomes.
  - Linked: FR-008, FR-007, AC-005, AC-004
  - Announce success and failure, keep focus in place, adopt the shared label and error pattern.
- [ ] **T2.7** Make dropdown menus keyboard operable.
  - Linked: FR-004, AC-002
  - Modify `components/ui/select.tsx`: arrow-key movement, Home/End, Escape, announced active option.

## M2 — Motion and contrast

- [ ] **T3.1** Honour reduced motion and standardise the focus ring.
  - Linked: FR-010, FR-002, AC-007, AC-001
  - Modify `app/globals.css`: `prefers-reduced-motion` block disabling autoplay, transitions, and parallax; `:focus-visible` ring of 2px at 3:1.
- [ ] **T3.2** Correct failing contrast tokens.
  - Linked: FR-009, AC-006
  - Adjust only failing tokens, record before/after ratios, ensure no state is colour-only.

## M3 — Event page performance

- [ ] **T4.1** Serve the hero image through `next/image`.
  - Linked: FR-012, NFR-004, AC-009, AC-008
  - Explicit dimensions and priority; verify CLS on the throttled profile.
- [ ] **T4.2** Stabilise font loading.
  - Linked: NFR-004, AC-009
  - `display: swap` with metric-compatible fallbacks so the swap does not shift layout.
- [ ] **T4.3** Trim the event page's first-load JavaScript.
  - Linked: NFR-003, NFR-002, AC-009, AC-008
  - Move interactive islands behind client boundaries and dynamic imports; first-load JS at or below 180 KB gzip.

## M4 — Automated gates

- [ ] **T5.1** Add the axe-core reference-page suite.
  - Linked: FR-011, NFR-001, AC-010
  - Render the five reference pages and assert zero WCAG 2.1 A/AA violations.
- [ ] **T5.2** Add the Lighthouse budget.
  - Linked: FR-012, NFR-002, AC-010, AC-008
  - `.lighthouserc.json`: performance and accessibility at least 95, LCP at most 2500 ms, CLS at most 0.1, TBT at most 200 ms on the pinned mobile profile.
- [ ] **T5.3** Wire the scripts and development dependencies.
  - Linked: NFR-005, AC-010
  - Add `axe-core`, `vitest-axe`, and `@lhci/cli` as dev dependencies plus `a11y` and `lighthouse` scripts.
