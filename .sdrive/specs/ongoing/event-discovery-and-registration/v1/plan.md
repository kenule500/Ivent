# Technical Plan: Event Discovery and Registration

> Retroactive plan reconstructed from the existing implementation.

## Approach

The attendee journey is delivered with Next.js App Router client pages that read
from Convex through the `useConvexQuery`/`useConvexMutation` hooks. Convex owns
all discovery queries, registration state, and QR generation. Clerk supplies the
identity that `secureQuery`/`secureMutation` resolve into a `users` row.

## Components

| Component | Action | Responsibility |
| --- | --- | --- |
| `app/(public)/explore/page.tsx` | reuse | Aggregates featured, nearby, popular events and category counts. |
| `app/(public)/explore/[slug]/page.tsx` | reuse | Resolves category or location slugs; paginates at 10. |
| `app/(public)/events/[slug]/page.tsx` | reuse | Public event detail and CTA state machine. |
| `app/(public)/events/[slug]/_components/register-modal.tsx` | reuse | Registration form and success state. |
| `app/(main)/my-tickets/page.tsx` | reuse | Upcoming/past tickets, QR dialog, cancellation. |
| `components/onboarding-modal.tsx` | reuse | Interests and Nigerian location capture. |
| `convex/explore.ts` | reuse | Featured, location, category, popular, and count queries. |
| `convex/search.ts` | reuse | Title search over the `search_title` index. |
| `convex/registrations.ts` | reuse | Register, check, list, cancel, organizer attendee list, check-in. |
| `convex/users.ts` | reuse | Current user, store, complete onboarding. |
| `lib/data.ts` | reuse | The 12 event categories. |
| `lib/location-utils.ts` | reuse | Build and parse `city-state` location slugs. |

## Data Model

- `events`: `slug` (unique, timestamp-suffixed), `title`, `description`,
  `category`, `startDate`, `endDate`, `locationType`, `city`, `state`, `country`,
  `capacity`, `ticketType`, `ticketPrice`, `registrationCount`, `coverImage`,
  `themeColor`. No change is required for this feature.
- `registrations`: `eventId`, `userId`, `attendeeName`, `attendeeEmail`,
  `qrCode`, `checkedIn`, `checkedInAt`, `status` (`confirmed|cancelled`),
  `registeredAt`. Unique per `(eventId, userId)` via `by_event_user`.
- `users`: `location {city,state,country}`, `interests[]`,
  `hasCompletedOnboarding`. No change is required.

## Flow

1. `/explore` issues five queries: featured, by location, popular, category
   counts, current user.
2. Selecting an event routes to `/events/[slug]`; the page queries
   `events.getEventBySlug` and `registrations.checkRegistration`.
3. Register opens the modal; `registrations.registerForEvent` authenticates the
   user, validates capacity/duplicates, writes the registration and QR, and
   increments `registrationCount`.
4. `/my-tickets` queries `registrations.getMyRegistrations`, splits upcoming vs
   past, renders `react-qr-code`, and calls `cancelRegistration` after confirm.
5. First-time attendees on `/explore`, `/events`, `/my-tickets`, or `/profile`
   get the onboarding modal, which calls `users.completeOnboarding`.

## Security

- NFR-002: every mutation resolves the user from the Clerk token; ownership is
  checked server-side (cancel, organizer attendee list).
- NFR-003: name and email are required before the mutation; Convex arg validators
  constrain the payload shape.

## Performance

- Discovery queries are bounded (`take(100)`/`take(200)`) before sorting.
- Location/category filters run on a bounded upcoming-events window.
- Pagination limits each route response to ten records.

## Dependencies

Clerk, Convex, Next.js, React, react-qr-code, embla-carousel-react, date-fns,
country-state-city, Tailwind CSS. All are already installed.

## Risks

- Capacity is enforced in the mutation, which is the single writer for a
  registration; the client-side check is advisory only.
- Search is title-only by design until a broader index is specified.
