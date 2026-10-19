# Ivent

Status: Approved · 2026-10-18 · Source: onboarding interview

## Vision

Ivent is the simplest way for organizers anywhere to publish an event, fill it, and
check attendees in with a QR ticket — without spreadsheets or manual door lists.

## Problem

Organizers run events on spreadsheets, WhatsApp groups, and paper lists.
General-purpose event tools are either heavyweight, payment-first, or built for
large conferences. The result: publishing takes too long, capacity is guesswork,
and the door becomes a bottleneck.

## Goals

- Publish a shareable event page in under 10 minutes.
- Make registration effortless and capacity-safe.
- Check attendees in with a phone camera in seconds.
- Give organizers a live view of registrations, check-ins, and estimated revenue.
- Make attendee discovery good enough to fill events.
- Stay free to start; Pro for volume and customization.

## Non-Goals

- Online payments and refunds — payments stay offline at the venue for now.
- Native mobile apps.
- Sponsor marketplace, seating charts, live streaming.
- Multi-tier ticketing.
- Complex team roles in v1.

## Target Users

| Segment | Description | Need |
| --- | --- | --- |
| Organizers (primary) | Solo, community, school, and professional event organizers | Publish quickly, fill the room, and run the door without spreadsheets |
| Attendees (secondary) | Local event-goers | Discover relevant events, register in seconds, hold a QR ticket |
| Admins (internal) | Trust, safety, and operations | Moderate events and users, audit actions, see platform health |

## Core Flows

1. Organizer signs up → creates an event (manual or AI draft) → publishes a shareable page.
2. Attendees discover via explore/category/location/search → register → receive a QR ticket.
3. Organizer watches registrations → checks attendees in by QR → exports the list.
4. Admin moderates, audits, and supports.

## Success Measures

- Time to first published event.
- Fill rate (registrations ÷ capacity).
- Check-in rate and door throughput.
- Repeat organizer rate over 90 days.

## Confirmed Guidance

- **Organizer-first:** the organizer workflow is the product; attendee discovery is
  a distribution channel, not the headline.
- **Global market:** Nigeria is not the only target.
- **Target segments to grow into:** communities/associations, schools, and
  professional organizers/agencies.
- **Payments remain offline** for now; the dashboard's revenue figure stays an
  estimate.
- **Current implementation is Nigeria-first** (`NG` state/city pickers, naira
  pricing, Lagos/Abuja seed data). Treat that as an implementation gap against the
  global scope, not as the product boundary.

## Existing Architecture

- Next.js 16 App Router, React 19, TypeScript 5.
- Convex for data, files, scheduled jobs, and rate limiting.
- Clerk for authentication and the Pro entitlement.
- Tailwind CSS v4 with shared Base UI/shadcn primitives.
- Resend for email; Cerebras for AI event drafts.

## Open Questions

- Currency and localization scope for a global market.
- Should organizers be able to edit, cancel, or reschedule a published event?
- Waitlists for full events?
- Reminder and confirmation emails beyond admin invites?
- Team roles / multi-user organizer accounts?
- What exactly does Pro include, and at what price?
- Do organizers get public profiles?

---

## Previous draft (derived)

**Status:** Draft (derived from the code scan; README is template boilerplate)

> The README is scaffold boilerplate, not a description of this product.
> README.md looks like the file create-next-app writes (create-next-app,
> getting-started section, run-the-dev-server step). Taking its opening paragraph
> as the vision would describe the framework, not the app — "This is a Next.js
> project bootstrapped with create-next-app" is true of thousands of unrelated
> repositories. So this brief deliberately had no Vision section.

> This was a draft, not a product plan. The onboarding scan wrote it from what was
> already in the repository. Nobody reviewed it and nothing in it was confirmed.
> It is preserved here for provenance; the approved plan above supersedes it.

**Code-derived description (not confirmed at the time)**

The code implements an event discovery and management platform. Organizers
create events (manually or from an AI draft), manage them from a per-event
dashboard, scan QR tickets at the door, and export attendee lists. Attendees
browse featured, nearby, popular, and category/location feeds, register for
events, and keep QR tickets in "My Tickets". A separate admin console moderates
users, events, registrations, and invitations, records an audit trail, and shows
analytics. Clerk provides authentication; Convex holds data, files, and the
scheduled invite-expiry job.

**Existing Architecture (as scanned)**

- TypeScript
- Clerk
- Convex
- Next.js
- React
- Resend
- Zod
- Tailwind CSS

**Open Questions (as scanned)**

- What is this product, in one sentence? The scaffolded README never says.
- Who are the target users? Nothing in the repository names them.
- What is this product for, and what is deliberately out of scope?
