---
title: Event Management and Check-In
status: completed
version: v1
created: 2026-10-18
updated: 2026-10-18
retroactive: true
---

# Event Management and Check-In

> **Retroactive document.** Written after the fact from the existing
> implementation. It records current behaviour, not a new product decision.

## Overview

- **Problem Statement**: Organizers need to publish an event, watch registrations
  arrive, admit attendees at the door, and remove an event without leaving orphan
  records behind.
- **Proposed Solution**: A validated create-event form with Convex-hosted cover
  images and Clerk-billing Pro gating, a My Events list, a per-event dashboard
  with attendance statistics, an in-browser QR scanner for check-in, attendee
  search/tabs, CSV export, and cascading deletion.
- **Target Audience**: Event organizers using the web app, from free accounts
  limited to one event to Pro accounts with unlimited events and custom colors.
- **Assumptions**:
  - Pro entitlement is read from Clerk billing (`has({ plan: "pro" })`).
  - Paid tickets are collected offline; "revenue" is an estimate, not settled money.
  - Check-in happens on the organizer's device at the venue.
- **Out of Scope**:
  - Editing an event after creation (only create/delete exist today).
  - Refunds, payment reconciliation, and tax.
  - Offline check-in or printed attendee lists.

## User Stories

### US-001: Create a validated event
As an organizer, I want a validated create-event form, so that I cannot publish an incomplete or nonsensical event.

**Acceptance Criteria:**
- AC-001: Given the form, then the title must be at least 5 characters, the description at least 20, a category and city are required, capacity is at least 1, times match `HH:MM`, the venue is a URL when provided, and the end date/time must be after the start.
- AC-002: Given a valid submission, then the event is stored with a unique slug (`<title-slug>-<timestamp>`), the organizer id/name, zero registrations, and the mutation is limited to three creations per minute.

### US-002: Understand free and Pro limits
As a free organizer, I want clear upgrade prompts, so that I understand what Pro unlocks.

**Acceptance Criteria:**
- AC-003: Given a free account that already created one event, then a second creation opens the upgrade dialog and is blocked; given a free account, then any theme color other than the default opens the upgrade dialog; a Pro account bypasses both checks.

### US-003: Attach a cover image
As an organizer, I want to attach a cover image, so that the event page looks complete.

**Acceptance Criteria:**
- AC-004: Given I pick an image, then it is uploaded through a Convex storage upload URL and the stored value is either a Convex storage id, an HTTPS URL, or a data URL, and the event page resolves it to a displayable URL.

### US-004: Manage and delete my events
As an organizer, I want a list of my events and a safe delete, so that I can maintain my catalogue.

**Acceptance Criteria:**
- AC-005: Given I open `/my-events`, then only my events are listed; deleting one requires confirmation, removes its registrations, deletes a stored cover image when applicable, and reclaims a free-event credit for free-ticket events.

### US-005: Read attendance statistics
As an organizer, I want a dashboard for one event, so that I can judge how it is going.

**Acceptance Criteria:**
- AC-006: Given I open `/my-events/[eventId]` as the organizer, then I see confirmed registrations, checked-in count, pending count, capacity, check-in rate, estimated revenue for paid events, hours until the event, and whether it is today or past; a non-organizer is rejected.

### US-006: Check attendees in by QR
As an organizer, I want to scan a ticket QR code, so that I can admit attendees quickly and prevent reuse.

**Acceptance Criteria:**
- AC-007: Given a valid confirmed ticket for my event, then scanning it marks it checked in; an unknown or cancelled code is rejected, a second scan reports "already checked in", a non-organizer is rejected, and check-ins are limited to ten per minute per organizer.

### US-007: Export the attendee list
As an organizer, I want to export attendees, so that I have an offline record for the door.

**Acceptance Criteria:**
- AC-008: Given an event with registrations, then export downloads a CSV containing name, email, registration time, checked-in flag, check-in time, and QR code; with no registrations it reports that there is nothing to export.

### US-008: Search and filter attendees
As an organizer, I want to search and filter attendees, so that I can find one person quickly.

**Acceptance Criteria:**
- AC-009: Given the attendee list, then tabs separate all, checked-in, and pending registrations, and the search box matches attendee name, email, or QR code.

## Requirements

### Functional Requirements
- FR-001: The create-event form MUST enforce the documented validation rules. (AC-001)
- FR-002: A valid submission MUST persist the event with a unique slug and zero registrations, under a per-organizer rate limit. (AC-002)
- FR-003: Free accounts MUST be blocked from a second event and from non-default theme colors, with Pro bypassing both. (AC-003)
- FR-004: Cover images MUST be uploaded to Convex storage and resolved to a displayable URL. (AC-004)
- FR-005: My Events MUST list only the organizer's events and MUST cascade deletion through registrations and stored images. (AC-005)
- FR-006: The event dashboard MUST compute attendance and revenue statistics and MUST reject non-organizers. (AC-006)
- FR-007: QR check-in MUST validate the ticket, require the event organizer, reject invalid or cancelled tickets, be idempotent, and be rate-limited. (AC-007)
- FR-008: The attendee list MUST export to CSV. (AC-008)
- FR-009: The attendee list MUST support status tabs and name/email/QR search. (AC-009)

### Non-Functional Requirements
- NFR-001: Organizer-only operations MUST be enforced in Convex, not only in the UI. (AC-006, AC-007)
- NFR-002: Event creation and check-in MUST be rate-limited per organizer. (AC-002, AC-007)
- NFR-003: Management screens MUST remain usable at a 360px viewport with loading and empty states. (AC-005, AC-009)
- NFR-004: The feature MUST pass ESLint, TypeScript checking, and SpecDrive governance validation. (AC-002)

## UI/UX & Data Requirements

- **UI/UX**: Multi-field form with calendar/time pickers; image picker dialog; upgrade dialog for Pro limits; event cards with actions; dashboard tabs, stat cards, search, scanner modal, and destructive confirmation dialogs.
- **Data**: `events` gains no new fields; `users.freeEventsCreated` tracks free usage; `registrations.checkedIn`/`checkedInAt` drive attendance; `auditLogs` is not written by organizer actions (only admin actions are audited).

## Edge Cases & Error States

- EC-001: The free account has already created one event → upgrade dialog, no insert.
- EC-002: A free account selects a custom theme color → upgrade dialog, colour not applied.
- EC-003: End date/time is not after start → submission blocked with a toast.
- EC-004: The scanned QR is unknown or cancelled → error message, no check-in.
- EC-005: The ticket was already checked in → "Already checked in", no double write.
- EC-006: A non-organizer opens or scans → authorization error.
- EC-007: Deleting an event removes its registrations and stored image.
- EC-008: Exporting with zero registrations → "No registrations to export".

## Dependencies & Risks

- react-hook-form + zod + @hookform/resolvers (form validation), html5-qrcode (scanner), date-fns, country-state-city, Convex, Clerk billing, Tailwind.
- RISK-001: `freeEventsCreated` is incremented for every created event but only reclaimed when a free-ticket event is deleted; the intended rule needs confirmation.
- RISK-002: Revenue in the dashboard is estimated from confirmed tickets, while money is collected offline.
- RISK-003: A leaked QR screenshot can be checked in once before the real attendee arrives; the idempotent check-in does not prove possession.

## Verification Status (2026-10-18)

- SpecDrive governance validation: **passes** for spec, plan, tasks, and traceability.
- `npx tsc --noEmit`: **passes** (exit 0).
- `npm run lint`: **passes** with 0 errors and 14 warnings after the follow-up
  fix in this session (ignore `.sdrive/**` and `convex/_generated/**` in the flat
  config, and defer the carousel's initial select to the next frame). NFR-004 is
  recorded as `complete`.
