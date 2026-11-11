---
id: BP-016
name: registration-ux-polish
version: v1
status: proposed
created: 2026-11-10
updated: 2026-11-10
owner: kenule500
source: .sdrive/product/backlog.json
---

# Spec: Registration UX Polish

## Overview

### Problem Statement
The registration path shows its seams. While Convex data loads, the event page and
the ticket list render nothing — a blank screen with a spinner at best. Actions wait
for a server round-trip before the interface reacts, so a slow network feels broken
and a double tap risks a duplicate submission. When a query throws, the route white-
screens with no way back except the browser. And empty states say "No tickets" without
telling the attendee whether they have none, whether the filter excluded them, or what
to do next.

### Goals
- Give every async surface on the registration path a structure-first skeleton.
- Let the interface react immediately to register/cancel, then reconcile with the server.
- Recover from render failures without losing navigation.
- Replace dead-end empty states with a reason and a next action.

### Non-Goals
- Redesigning the visual language or the event page layout; this is behaviour and states.
- Changing Convex function signatures, authorization, or pricing logic.
- Offline registration (that belongs to BP-004 door mode).
- Implementing lifecycle emails or wallet passes (BP-001, BP-003).

### Existing Surface
- `app/(public)/events/[slug]/page.tsx` and `_components/register-modal.tsx`
- `app/(main)/my-tickets/page.tsx`
- `app/(public)/explore/page.tsx` (empty results)
- `components/ui/` primitives; `components/a11y/live-region.tsx` from BP-015

### Impact
Attendees on mid-range phones and unreliable networks get a page that responds
immediately and never dead-ends. Organisers see fewer duplicate registrations caused
by impatient double taps.

## User Stories

### US-001: See the shape of the page immediately
As an attendee on a slow connection, I want the page structure to appear while data loads, so that I know the page is working and I can start reading headings.

**Acceptance Criteria:**
- AC-001: Given a cold load of an event or ticket page, a skeleton that mirrors the final layout renders within the first frame and is replaced by real content without the page jumping.
- AC-002: Given the registration dialog, the submit control shows a pending state and ignores further taps until the request settles.

### US-002: Act without waiting for the network
As an attendee, I want the ticket to appear the moment I confirm, so that I trust the registration worked.

**Acceptance Criteria:**
- AC-003: Given a confirmed registration, the ticket appears in my-tickets immediately and remains once the server confirms.
- AC-004: Given a failed registration or cancellation, the optimistic change rolls back and the reason is announced.

### US-003: Recover from a broken render
As an attendee, I want a way out when a page fails, so that one bad query does not strand me.

**Acceptance Criteria:**
- AC-005: Given a render error on an event or ticket route, an error boundary shows a recovery message with retry and a working link home, and navigation stays usable.

### US-004: Understand an empty screen
As an attendee, I want to know why a list is empty and what to do next, so that I do not assume the app is broken.

**Acceptance Criteria:**
- AC-006: Given an empty ticket list, search result set, or announcements list, the state names its cause and offers the relevant next action.
- AC-007: Given skeleton and optimistic transitions, cumulative layout shift on the affected routes stays at or below 0.02.
- AC-008: Given a user with `prefers-reduced-motion: reduce`, skeleton shimmer and transition motion are suppressed.

## Requirements

### Functional Requirements
- FR-001: A reusable skeleton primitive MUST exist under `components/ui/` and be the only shimmer implementation. (AC-001)
- FR-002: The event page and my-tickets MUST render route-level loading skeletons that match their final layout. (AC-001)
- FR-003: The registration dialog MUST disable its submit control and show progress while a request is in flight, and MUST NOT send a second request. (AC-002)
- FR-004: Registration and cancellation MUST apply optimistically through the Convex client and reconcile with the server result. (AC-003, AC-004)
- FR-005: Optimistic updates MUST roll back on error and announce the failure through the existing live region. (AC-004)
- FR-006: Event and ticket routes MUST provide error boundaries that keep the header and navigation usable and offer retry. (AC-005)
- FR-007: Empty states MUST be produced by one component that takes a reason and an optional action. (AC-006)
- FR-008: Skeleton and transition animation MUST be suppressed when the user prefers reduced motion. (AC-008)

### Non-Functional Requirements
- NFR-001: Cumulative layout shift on the affected routes MUST stay at or below 0.02. (AC-007)
- NFR-002: The skeleton and empty-state primitives MUST add at most 5 KB gzip to first-load JavaScript. (AC-001, AC-006)
- NFR-003: Skeletons MUST be hidden from assistive technology and the loading state announced once; errors MUST be announced. (AC-001, AC-004, AC-005)
- NFR-004: No Convex function signature, validator, or authorization check may change; this feature is client presentation. (AC-003, AC-004)

## UI/UX & Data Requirements

### Key Screens
- Event page: skeleton header, skeleton detail column, skeleton register panel.
- Registration dialog: idle → pending → success or error, without closing on failure.
- My tickets: optimistic card at top, confirmed badge once the server responds.
- Explore and announcements: empty state with reason and action.

### Data Model Changes
None. Existing queries and mutations are reused; optimistic updates are client-side
layers over `registrations.create` and the cancel mutation.

## Edge Cases & Error States

| Scenario | Expected Behaviour |
|---|---|
| Register while offline | Optimistic card appears, then rolls back with an announced failure and a retry action. |
| Double tap on Register | Second submission ignored; control stays disabled until settle. |
| Server rejects (sold out) | Rollback plus the specific reason, not a generic error. |
| Query throws during render | Error boundary shows recovery; retry re-mounts the subtree. |
| Zero events match a filter | Empty state explains the filter and offers to clear it. |
| Reduced motion | No shimmer; static placeholder blocks. |

## Security Baseline

- No change to authentication, authorization, or Convex validators (NFR-004).
- Error boundaries MUST NOT render raw error messages, stack traces, or internal IDs to the user.
- Optimistic UI MUST NOT bypass server authorization: the client applies the optimistic state, the server remains the authority, and a rejection rolls it back.
- No secret, token, or PII may be written into the optimistic cache.

## Dependencies & Risks

### Dependencies
- Convex optimistic update support in the installed client version.
- The `LiveRegionProvider` and `useAnnounce` hook delivered by BP-015.

### Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Optimistic state diverges from the server | Medium | High | Reconcile on settle; roll back on error; keep the optimistic layer thin. |
| Skeleton layout differs from real content, causing shift | Medium | Medium | Build skeletons from the same spacing tokens as the real components. |
| Error boundary hides a real bug | Low | Medium | Log the error to the console in development; keep the boundary at route level, not per component. |

## Out of Scope
- Offline registration and check-in (BP-004).
- Wallet passes (BP-003).
- Lifecycle emails (BP-001).
- Redesigning the event page layout (BP-005 covers marketing polish).

## Research & Standards

- React 19 error boundaries — https://react.dev/reference/react/Component#catching-rendering-errors
- Next.js 16 route-level `loading.tsx` and `error.tsx` conventions — versioned guide under `node_modules/next/dist/docs/`
- Convex optimistic updates — https://docs.convex.dev/advanced/optimistic-updates
