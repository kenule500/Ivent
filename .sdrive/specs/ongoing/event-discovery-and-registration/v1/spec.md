---
title: Event Discovery and Registration
status: completed
version: v1
created: 2026-10-18
updated: 2026-10-18
retroactive: true
---

# Event Discovery and Registration

> **Retroactive document.** This specification was written after the fact from the
> implementation that already exists in the repository. It records current
> behaviour; it is not a new product decision and has not been through the normal
> spec/plan approval gates.

## Overview

- **Problem Statement**: Attendees need to find events worth attending and register
  for them without friction, while the registration must produce a ticket that can
  be verified at the door.
- **Proposed Solution**: Public discovery surfaces (featured, nearby, popular,
  category and location routes, title search), a public event page by slug, a
  Clerk-authenticated registration flow that issues a QR ticket, and a My Tickets
  page for viewing or cancelling registrations.
- **Target Audience**: Event attendees in Nigeria, both signed-out visitors who
  browse and signed-in attendees who register and manage tickets.
- **Assumptions**:
  - Paid tickets are settled offline at the venue; no payment processor is wired in.
  - The product is Nigeria-first: country defaults to `NG` and prices display in naira.
  - Currency, tax, and refund policy are not modelled.
- **Out of Scope**:
  - Online payments, refunds, and invoicing.
  - Waitlists for full events.
  - Recurring or multi-session events.

## User Stories

### US-001: Browse featured, nearby, and popular events
As an attendee, I want one explore page that shows featured, nearby, popular events, and category counts, so that I can find something worth attending without knowing what to search for.

**Acceptance Criteria:**
- AC-001: Given upcoming events exist, when I open `/explore`, then I see a featured carousel (up to 4 events), events near my saved city/state (default Port Harcourt, Rivers), popular events nationwide (up to 6), and a category grid with per-category counts.
- AC-002: Given data is loading or empty, when I open `/explore`, then each section shows its own loading or empty state and the page still renders the remaining sections.

### US-002: Browse by category or location
As an attendee, I want to open a category or city page with pagination, so that I can narrow the catalogue to what interests me.

**Acceptance Criteria:**
- AC-003: Given I select a category or "view all" near me, when the `/explore/[slug]` route loads, then it resolves the slug as either a category id or a `city-state` location slug and shows up to 10 upcoming events with previous/next pagination.
- AC-004: Given a slug matches neither a category nor a valid location, then the page renders the not-found route instead of an empty list.

### US-003: Inspect an event before registering
As an attendee, I want a public event page with the full details and the correct call to action, so that I can decide whether to attend.

**Acceptance Criteria:**
- AC-005: Given a valid event slug, when I open `/events/[slug]`, then I see the title, description, date and time, location, organizer, price, and registration count vs capacity; an unknown slug renders not found.
- AC-006: Given the event state, then the sidebar CTA is "View Ticket" when I am registered, disabled "Event Ended" when the event is past, disabled "Event Full" when at capacity, "Manage Event" for the organizer, and "Register for Event" otherwise.

### US-004: Register and receive a QR ticket
As a signed-in attendee, I want to register with my name and email and receive a QR ticket, so that I can prove my registration at the door.

**Acceptance Criteria:**
- AC-007: Given I am signed out, when I press "Register for Event", then I am told to sign in and no registration is created.
- AC-008: Given I am signed in and submit a non-empty name and email, then a confirmed registration is stored with a unique `EVT-...` QR code and the event's registration count increases by one.
- AC-009: Given the event is full, then registration is rejected; given I am already confirmed, then a duplicate is rejected; given my earlier registration was cancelled, then registering again reactivates it and increments the count.

### US-005: Manage my tickets
As an attendee, I want to see my upcoming and past tickets and cancel one, so that my plans stay current.

**Acceptance Criteria:**
- AC-010: Given I have registrations, when I open `/my-tickets`, then upcoming confirmed tickets and past/cancelled tickets are listed separately and selecting a ticket shows its QR code and ticket ID.
- AC-011: Given I own a confirmed registration, when I cancel it, then its status becomes cancelled and the event count decreases; another user's registration cannot be cancelled.

### US-006: Personalise my event feed
As a new attendee, I want to choose my city and interests, so that the surfaces I use show relevant events.

**Acceptance Criteria:**
- AC-012: Given I visit an attendee page for the first time, then onboarding asks me to pick at least three interests and a Nigerian state and city, and completion persists `hasCompletedOnboarding`, `location`, and `interests` on my user record.

### US-007: Search events by title
As an attendee, I want to type an event title and see matching upcoming events, so that I can jump straight to an event.

**Acceptance Criteria:**
- AC-013: Given a query of at least two characters, then the search returns at most five upcoming events whose titles match; shorter or blank queries return an empty list.

## Requirements

### Functional Requirements
- FR-001: The explore page MUST aggregate featured events, events near the attendee's saved location, popular events, and per-category counts. (AC-001, AC-002)
- FR-002: The explore routes MUST resolve both category ids and location slugs and MUST paginate results at ten per page. (AC-003, AC-004)
- FR-003: The public event page MUST resolve an event by slug and expose its full details. (AC-005)
- FR-004: The public event page MUST select its call to action from registration, past, capacity, organizer, and default states. (AC-006)
- FR-005: Registration MUST require an authenticated Clerk user. (AC-007)
- FR-006: Registration MUST store the attendee name/email, issue a unique QR code, and increment the event registration count. (AC-008)
- FR-007: Registration MUST reject full events and confirmed duplicates, and MUST reactivate a cancelled registration. (AC-009)
- FR-008: My Tickets MUST list upcoming and past/cancelled registrations and display each QR ticket. (AC-010)
- FR-009: An attendee MUST be able to cancel only their own confirmed registration. (AC-011)
- FR-010: Attendee onboarding MUST capture at least three interests plus a state and city and persist them. (AC-012)
- FR-011: Event search MUST match titles for queries of at least two characters and return only upcoming events. (AC-013)

### Non-Functional Requirements
- NFR-001: Discovery and ticket surfaces MUST remain usable at a 360px viewport and MUST expose loading and empty states. (AC-002)
- NFR-002: Ownership and role checks MUST be enforced in Convex functions, not only in the client. (AC-011)
- NFR-003: Registration input MUST be validated for required name and email before the mutation runs. (AC-008)
- NFR-004: The feature MUST pass ESLint, TypeScript checking, and SpecDrive governance validation before it is considered complete. (AC-002)

## UI/UX & Data Requirements

- **UI/UX**: Dark-first layouts; 1/2/3/4-column responsive grids; carousel for featured events; dialog for registration and QR display; sonner toasts for success and failure; disabled CTAs for full/past events.
- **Data**: `events` (slug, title, description, dates, location, capacity, ticket type/price, registration count, cover image), `registrations` (event, user, attendee name/email, QR, status, checked-in flags), `users` (location, interests, onboarding flag).

## Edge Cases & Error States

- EC-001: Event is at capacity → registration rejected with "Event is full"; CTA is disabled.
- EC-002: User already has a confirmed registration → duplicate rejected; page shows "View Ticket".
- EC-003: User previously cancelled → a new registration reactivates the existing row and increments the count.
- EC-004: Event has ended → registration CTA disabled and "Event Ended" shown.
- EC-005: Unknown event slug → not-found page.
- EC-006: Signed-out visitor presses register → sign-in prompt, no mutation.
- EC-007: No events exist → each section shows its empty state and the page offers "Create Event".

## Dependencies & Risks

- Clerk (authentication), Convex (database and functions), Next.js/React, react-qr-code, embla-carousel, date-fns, country-state-city, Tailwind CSS.
- RISK-001: Concurrent registrations could oversell capacity; the mutation re-reads the event and re-checks inside the transaction.
- RISK-002: QR codes are visible ticket identifiers; check-in is rate-limited to make guessing impractical.
- RISK-003: Search only covers the event title, so category/location must be used for broader discovery.

## Verification Status (2026-10-18)

- SpecDrive governance validation: **passes** for spec, plan, tasks, and traceability.
- `npx tsc --noEmit`: **passes** (exit 0).
- `npm run lint`: **passes** with 0 errors and 14 warnings after the follow-up
  fix in this session (ignore `.sdrive/**` and `convex/_generated/**` in the flat
  config, and defer the carousel's initial select to the next frame). NFR-004 is
  recorded as `complete`.
