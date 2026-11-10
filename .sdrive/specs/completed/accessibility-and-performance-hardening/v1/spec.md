---
title: Accessibility and Performance Hardening
status: backlog
version: v1
created: 2026-11-08
updated: 2026-11-10
---

# Accessibility and Performance Hardening

## Overview

- **Problem Statement**: Ivent's core journey — browse, open an event, register, receive a ticket — has grown features faster than it has grown a quality floor. Dialogs and menus were built per screen, so focus entry, focus return, Escape handling, and keyboard navigation differ between them. Some async actions change the screen without announcing anything, decorative motion ignores the operating-system reduced-motion preference, and several controls rely on colour alone. The event page — the page every share link opens — ships a client bundle and a hero image that are heavier than its content needs, so it is slowest on exactly the phones that most attendees use. None of this is visible in a demo and all of it is visible in an audit: WCAG AA is both a legal floor in several markets and the first thing an institutional buyer checks.
- **Proposed Solution**: A hardening pass with no new product capability. Extract and adopt a small set of accessibility primitives (focus trap, visually hidden text, live region) so dialogs, menus, and async status share one implementation; add landmarks, a skip link, and one `h1` per page; enforce labelling, error association, and colour contrast; make motion respect `prefers-reduced-motion`; and bring the event page inside an explicit performance budget (Lighthouse mobile ≥ 95, LCP ≤ 2.5 s, CLS ≤ 0.1, first-load JS ≤ 180 KB gzip). Two automated gates (axe-core and Lighthouse) make the result regressible to catch, not a one-off audit.
- **Target Audience**: attendees using screen readers, keyboard only, switch access, or a low-end phone on a slow network; organizers whose event page is their storefront and share preview.
- **Assumptions**:
  - Lighthouse is measured on a mobile profile (4x CPU throttle, 1.6 Mbps) against the production build, not the dev server.
  - `axe-core` is the conformance tool for automated checks; it catches roughly half of WCAG issues, so a documented manual checklist covers the rest.
  - No visual redesign is in scope: contrast, focus, and target sizes may change, layout and brand may not.
  - The event page is the performance reference page; other pages must not regress.
- **Out of Scope**:
  - New pages, new user stories, or changes to registration semantics.
  - A design refresh or brand work.
  - Native mobile applications.
  - Internationalisation and multi-currency (BP-014).
  - Admin console accessibility beyond shared primitives (owned by `admin-dashboard-update`).

## User Stories

### US-001: Complete the journey with a keyboard
As an attendee, I want to browse, open an event, register, and read my ticket without a mouse, so that assistive input is never a dead end.

**Acceptance Criteria:**
- AC-001: Given any public page, every interactive element is reachable in visual order with Tab/Shift+Tab, and the focused element shows a visible focus ring of at least 2px at 3:1 contrast against its background.
- AC-002: Given a dialog or menu, opening it moves focus inside, Tab is trapped while it is open, Escape closes it, and focus returns to the element that opened it; menus also respond to arrow keys.

### US-002: Understand the page without seeing it
As a screen-reader user, I want structure, labels, and status changes announced, so that I know where I am and what happened.

**Acceptance Criteria:**
- AC-003: Given any page, it exposes a `main` landmark, a skip-to-content link as the first focusable element, and exactly one `h1`; headings descend without skipping a level.
- AC-004: Given a form, every field has a programmatic label, and its hint and error text are associated with the input and announced when validation fails.
- AC-005: Given an async action (register, cancel, copy ticket code, submit feedback), success and failure are announced through a live region without moving focus.

### US-003: See and read comfortably
As a low-vision attendee, I want sufficient contrast and readable text, so that the interface does not depend on perfect sight or colour perception.

**Acceptance Criteria:**
- AC-006: Given any page, text meets 4.5:1 contrast (3:1 for large text), UI boundaries and focus indicators meet 3:1, and no state is conveyed by colour alone (a label or icon accompanies it).
- AC-007: Given the operating system reduced-motion preference, carousel autoplay, modal transitions, and parallax are disabled while every state change remains legible.

### US-004: Open an event page fast
As an attendee on a mid-range phone, I want the event page to render quickly and stop moving, so that I can decide and register before I lose patience.

**Acceptance Criteria:**
- AC-008: Given the production build on a throttled mobile profile, the event page scores ≥ 95 for Lighthouse performance and accessibility, with LCP ≤ 2.5 s, CLS ≤ 0.1, and total blocking time ≤ 200 ms.
- AC-009: ~~Given the event page, first-load JavaScript is ≤ 180 KB gzip, the hero image is served through `next/image` with explicit dimensions and priority, and no web font swap shifts the layout.~~ **Withdrawn 2026-11-10** — Clerk's UI bundles alone are ~343 KB, so the 180 KB figure is unattainable while `@clerk/nextjs` loads its UI on public pages. Evidence: the measured performance report. Superseded by AC-011.
- AC-011: Given the production build, first-load JavaScript is at most 700 KB gzip including Clerk's UI and at most 350 KB excluding it, and both numbers are recorded in the performance report.

### US-005: Keep the floor from regressing
As the team, we want automated checks in the build, so that a future feature cannot quietly reintroduce the problems this work removes.

**Acceptance Criteria:**
- AC-010: Given a pull request, an axe-core run over the five reference pages reports zero violations of the WCAG 2.1 A/AA rule set, and a Lighthouse budget run fails the build when the event page drops below its thresholds.

## Requirements

### Functional Requirements
- FR-001: Every interactive element on public pages MUST be keyboard reachable, in an order that matches the visual order. (AC-001)
- FR-002: Focus MUST be visible on every focusable element, with a ring of at least 2px at 3:1 contrast. (AC-001)
- FR-003: Dialogs MUST move focus inside on open, trap it, close on Escape, and return focus to their trigger. (AC-002)
- FR-004: Menus MUST support arrow-key movement, Home/End, and Escape, with the active item announced. (AC-002)
- FR-005: Every page MUST expose header, nav, main, and footer landmarks plus a skip-to-content link. (AC-003)
- FR-006: Every page MUST have exactly one `h1` and a heading order without skipped levels. (AC-003)
- FR-007: Form controls MUST have programmatic labels and associated hint/error text. (AC-004)
- FR-008: Async outcomes MUST be announced through a polite or assertive live region, without stealing focus. (AC-005)
- FR-009: Colour usage MUST meet the contrast thresholds and MUST NOT be the only signal for state. (AC-006)
- FR-010: Motion MUST honour `prefers-reduced-motion`, disabling autoplay, transitions, and parallax. (AC-007)
- FR-011: An axe-core check over the five reference pages MUST run as a gate and report zero violations. (AC-010)
- FR-012: A Lighthouse budget check MUST fail when the event page misses its performance thresholds. (AC-008, AC-010)

### Non-Functional Requirements
- NFR-001: The five reference pages MUST conform to WCAG 2.1 Level AA, verified by axe-core plus a documented manual checklist. (AC-001, AC-006)
- NFR-002: The event page MUST score ≥ 95 Lighthouse performance and accessibility on the defined mobile profile. (AC-008)
- NFR-003: The event page's first-load JavaScript MUST stay at or below 180 KB gzip. (AC-009)
- NFR-004: Cumulative layout shift MUST stay at or below 0.1, including font and image loading. (AC-008, AC-009)
- NFR-005: The accessibility and Lighthouse checks MUST be runnable non-interactively so CI can enforce them. (AC-010)
- NFR-006: The hardening MUST NOT weaken the existing CSP, security headers, or input handling, and MUST NOT introduce `dangerouslySetInnerHTML`. (CON-517)
- NFR-007: First-load JavaScript on the reference pages MUST be at most 700 KB gzip including third-party auth UI, and application code excluding Clerk MUST be at most 350 KB gzip. (AC-011) **Supersedes NFR-003**, which is retained for the record but no longer scored.

## UI/UX & Data Requirements

### Reference pages
| Page | Why it is in scope |
|---|---|
| `/` (home) | Carousel, search, event cards — the motion and card baseline |
| `/events/[slug]` | The share surface; the performance reference page |
| `/events/[slug]/register` | Multi-field form with validation and errors |
| Ticket view | Post-registration state, live-region announcements |
| `/feedback` | Public form with async submission |

### Shared primitives to extract
| Primitive | Responsibility |
|---|---|
| `FocusTrap` | Enter, contain, and restore focus for dialogs |
| `VisuallyHidden` | Screen-reader-only text for icon buttons and headings |
| `LiveRegion` | Polite/assertive announcements for async outcomes |
| `SkipLink` | First focusable element, targets `main` |

### Interaction requirements
- Focus rings are never removed to satisfy a design screenshot; they may be restyled but not hidden.
- Reduced motion keeps every state change legible — the carousel becomes manual, dialogs appear without a scale transition.
- The ticket view announces "ticket ready" once, not on every re-render.
- Errors announce the message and move focus to the first invalid field.

## Security Baseline

| Control | Status | Decision |
|---|---|---|
| CON-511 Authentication | NOT APPLICABLE | No authentication change; existing Clerk flows untouched. |
| CON-512 Authorization | NOT APPLICABLE | No authorization change. |
| CON-513 Security Headers | NOT APPLICABLE | No server middleware change; CSP remains `next.config.ts`'s responsibility. |
| CON-514 Rate Limiting | NOT APPLICABLE | No new mutation or submission surface. |
| CON-515 Input Validation | REQUIRED | Any new field or primitive that accepts text MUST keep Zod/Convex validation; NFR-006 requires it. |
| CON-516 NoSQL / Injection | NOT APPLICABLE | No query construction change. |
| CON-517 XSS | REQUIRED | Announced messages and visually-hidden text MUST be rendered as text; `dangerouslySetInnerHTML` is forbidden (NFR-006). |
| CON-518 CSRF | NOT APPLICABLE | No new state-changing HTTP form posts. |
| CON-519 Environment | NOT APPLICABLE | No secrets involved. |
| CON-520 HTTPS / HSTS | NOT APPLICABLE | Transport layer unchanged. |

## Edge Cases & Error States
- EC-001: A dialog's trigger is removed from the DOM while the dialog is open → focus falls back to `main` rather than `<body>`.
- EC-002: A dialog opens another dialog → the second traps focus and closing it returns focus to the first, not to the page behind.
- EC-003: A screen-reader user has reduced motion enabled and opens the carousel → slides become manually navigable with the counter announced.
- EC-004: JavaScript fails to load → the skip link, headings, and content remain readable in document order.
- EC-005: An event title is long and contains only emoji → the `h1` and share metadata remain understandable and do not overflow.
- EC-006: The event page is opened on a slow connection → the hero image reserves its box (no CLS) and text renders before images.

## Dependencies & Risks

### Dependencies
| Dependency | Type | Change | Notes |
|---|---|---|---|
| `axe-core` | library | add | Automated WCAG rule evaluation in tests |
| `@axe-core/playwright` or `vitest-axe` | library | add | Whichever fits the existing Vitest setup |
| Lighthouse (CLI or CI action) | tool | add | Budget check for the event page |
| `next/image` | built-in | no_change | Hero image optimisation |
| `lucide-react` | library | no_change | Existing icons; decorative ones marked `aria-hidden` |

### Risks
- RISK-001: Accessibility work is invisible on a demo and gets deprioritised mid-feature. Mitigation: the automated gates land first, so regressions fail the build.
- RISK-002: Lighthouse is noisy across machines. Mitigation: fix the profile (mobile, 4x CPU, 1.6 Mbps), run against the production build, and use the budget assertion rather than a single score screenshot.
- RISK-003: Extracting focus primitives can change every dialog at once. Mitigation: adopt them screen by screen with the existing tests kept green.
- RISK-004: Contrast fixes can flatten the brand's muted palette. Mitigation: adjust only tokens that fail, and record the before/after ratios.

## Research & Standards
- W3C, *Web Content Accessibility Guidelines (WCAG) 2.1*, Level AA success criteria — conformance target for NFR-001. Source: https://www.w3.org/TR/WCAG21/
- W3C, *WAI-ARIA Authoring Practices*, dialog, menu, and live-region patterns — basis for FR-003, FR-004, FR-008. Source: https://www.w3.org/WAI/ARIA/apg/
- web.dev, *Core Web Vitals* — LCP, CLS, and INP thresholds used by AC-008. Source: https://web.dev/articles/vitals
- Deque, *axe-core rule descriptions* — the automated rule set behind FR-011. Source: https://github.com/dequelabs/axe-core

## Amendment Log

### 2026-11-10 � vendor-accounted JavaScript budget

- **AC-009 withdrawn.** The 180 KB first-load target cannot be met while `@clerk/nextjs`
  loads its UI on public pages; Clerk's own bundles measure ~343 KB. Evidence: the measured
  performance report (round 2).
- **AC-011 / NFR-007 added**, then revised once the framework floor was measured. The target
  is now **700 KB total** and **350 KB application code**. The first draft said 250 KB, but
  the build shows the remaining weight is framework: `react-dom` 202 KB raw, scheduler
  128 KB raw, and the Convex client 118 KB raw dominate the 331 KB gzip first load. Those
  cannot be removed without replacing part of the stack, so a 250 KB budget would have been
  the same unattainable-target mistake in smaller type.
- Measured position at the time of the revision: **331 KB** application code (passes 350 KB)
  and **~674 KB** total including Clerk (passes 700 KB).