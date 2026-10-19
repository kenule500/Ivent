# Technical Plan: Event Management and Check-In

> Retroactive plan reconstructed from the existing implementation.

## Approach

Organizer surfaces are Next.js client pages. Creation is a `react-hook-form` form
validated by Zod and submitted to `events.createEvent`, which owns the free/Pro
rules, slug generation, and rate limiting. Images upload directly to Convex
storage. The event dashboard reads `dashboard.getEventDashboard` and
`registrations.getEventRegistrations`; check-in scans a QR value with
`html5-qrcode` and calls `registrations.checkInAttendee`.

## Components

| Component | Action | Responsibility |
| --- | --- | --- |
| `app/(main)/create-event/page.tsx` | reuse | Multi-field form, date/time combining, Pro prompts, submission. |
| `components/ImagePicker.tsx` | reuse | Upload a file to Convex storage or pick a URL. |
| `components/upgrade-modal.tsx` | reuse | Clerk checkout prompt for Pro limits. |
| `app/(main)/my-events/page.tsx` | reuse | Organizer event list and delete action. |
| `app/(main)/my-events/[eventId]/page.tsx` | reuse | Dashboard, tabs, search, CSV, scanner entry point. |
| `app/(main)/my-events/_components/qr-scanner-modal.tsx` | reuse | Camera scanner that emits a QR value. |
| `app/(main)/my-events/_components/attendee-card.tsx` | reuse | Attendee row presentation. |
| `components/event-card.tsx` | reuse | Event card with manage/delete actions. |
| `convex/events.ts` | reuse | Create, upload URL, by-slug, my events, delete. |
| `convex/dashboard.ts` | reuse | Event statistics and organizer check. |
| `convex/registrations.ts` | reuse | Attendee list, check-in, registration rules. |
| `convex/rateLimiter.ts` | reuse | Create-event and check-in token buckets. |

## Data Model

- `events`: unchanged. `slug` is `<title-slug>-<Date.now()>` so it is unique even
  when titles repeat. `registrationCount` is maintained by registration mutations.
- `users.freeEventsCreated`: incremented by `events.createEvent`; decremented by
  `events.deleteEvent` only for free-ticket events.
- `registrations.checkedIn` / `checkedInAt`: written once by `checkInAttendee`.

## Flow

1. `/create-event` validates locally, blocks free over-limit submissions, uploads
   the cover image, then calls `createEvent` (rate limit: 3/minute).
2. `/my-events` queries `events.getMyEvents` and offers delete, which calls
   `events.deleteEvent` (cascade + storage cleanup).
3. `/my-events/[eventId]` loads stats and registrations, lets the organizer filter
   and export, and opens the QR scanner.
4. The scanner decodes a QR value and calls `checkInAttendee`
   (rate limit: 10/minute); the mutation resolves the registration, requires the
   organizer, and records the check-in.

## Security

- NFR-001: `getEventDashboard`, `getEventRegistrations`, and `checkInAttendee`
  compare `event.organizerId` with `ctx.user._id`; `deleteEvent` does the same.
- Free/Pro checks run in the mutation as well as the form, so a crafted client
  call cannot bypass the limit.

## Performance

- My Events is indexed by `by_organizer`.
- Registration lists are indexed by `by_event`; the UI filters client-side.
- Rate limits protect create and check-in from abuse.

## Dependencies

react-hook-form, zod, @hookform/resolvers, html5-qrcode, date-fns,
country-state-city, Convex, Clerk. All are already installed.

## Risks

- The free-event counter and the delete reclaim rule are not symmetric; resolve
  before changing the plan.
- Revenue is an estimate because payments are offline.
