---
id: BP-001
name: lifecycle-emails
version: v1
status: proposed
created: 2026-11-11
updated: 2026-11-11
owner: kenule500
source: .sdrive/product/backlog.json
---

# Spec: Lifecycle Emails

## Overview

### Problem Statement
Registration currently ends at the screen. The attendee gets a success dialog and nothing
else: no confirmation they can find later, no reminder the day before, and no follow-up
afterwards. Organisers cannot tell whether anyone was actually emailed, and the existing
`emailEvents` log only knows about invites and announcements.

### Goals
- Send a confirmation the moment a registration is confirmed.
- Remind confirmed attendees roughly a day before the event.
- Follow up after the event with a thank-you and a feedback link.
- Never send the same lifecycle email twice for one registration.
- Let attendees opt out of non-essential email without losing their ticket confirmation.
- Make delivery visible to the organiser and to the admin log.

### Non-Goals
- Marketing campaigns or re-engagement blasts; announcements already cover broadcasts.
- Redesigning the announcement system or its Bulk-stream routing.
- SMS, push notifications, or WhatsApp.
- Editing templates from the admin UI (templates stay in code for this version).

### Existing Surface
- `convex/mailtrap.ts` — transport selection (transactional, bulk, sandbox).
- `convex/emailService.ts`, `convex/emails.ts` — the Node send action and announcement sender.
- `convex/emailLog.ts` — `emailEvents` rows (`template`, `recipient`, `status`, `error`).
- `convex/crons.ts` — scheduled jobs (`cronRuns` records each run).
- `convex/registrations.ts` — `registerForEvent`, `cancelRegistration`.

### Impact
Attendees stop missing events they registered for and have something to act on afterwards.
Organisers stop assuming email happened and can see it did.

## User Stories

### US-001: Know my registration is real
As an attendee, I want a confirmation email with the event details and my ticket, so that I have a record outside the app.

**Acceptance Criteria:**
- AC-001: Given a successful registration, a confirmation email is sent to the attendee's address within 60 seconds, containing the event title, date, location, and a link to the ticket.

### US-002: Be reminded before the event
As a confirmed attendee, I want a reminder about a day before, so that I do not forget the event I registered for.

**Acceptance Criteria:**
- AC-002: Given a confirmed registration for an event starting in roughly 24 hours, exactly one reminder is sent to attendees who have not opted out.
- AC-003: Given an event that has ended, a thank-you email with a feedback link is sent to confirmed attendees who have not opted out.

### US-003: Trust that email is not duplicated or silently lost
As an attendee, I want each lifecycle email once, so that I do not get spammed or miss one because a job re-ran.

**Acceptance Criteria:**
- AC-004: Given the reminder job runs repeatedly, or a retry occurs, no registration receives the same lifecycle email twice.
- AC-005: Given a provider failure, the failure is recorded with its reason, retried within a bounded budget, and visible in the admin delivery log; the registration itself never fails because email did.

### US-004: Control what I receive
As an attendee, I want to opt out of reminders and follow-ups, so that my inbox is mine, while still receiving the confirmation I need.

**Acceptance Criteria:**
- AC-006: Given an attendee who opts out of lifecycle email, reminders and thank-yous stop, and the registration confirmation is still delivered.

### US-005: See what was sent
As an organiser, I want per-registration delivery status, so that I can answer "did they get the email?" without guessing.

**Acceptance Criteria:**
- AC-007: Given a registration, the admin can see which lifecycle emails were sent, failed, or skipped, with timestamps.
- AC-008: Given any lifecycle email, the rendered content contains only that recipient's data, and no message is addressed to more than one attendee.

## Requirements

### Functional Requirements
- FR-001: A lifecycle template registry MUST define exactly four templates — `registration_confirmation`, `reminder_24h`, `post_event_thankyou`, `feedback_request` — each with subject, HTML, and text bodies. (AC-001, AC-002, AC-003)
- FR-002: Registration MUST schedule the confirmation asynchronously so the mutation returns without waiting on the provider. (AC-001)
- FR-003: A scheduled job MUST select confirmed registrations whose event starts within the reminder window (24 ± 1 hours) and enqueue reminders. (AC-002)
- FR-004: A scheduled job MUST select registrations whose event ended within the follow-up window and enqueue the thank-you. (AC-003)
- FR-005: Each send MUST carry an idempotency key of `registrationId + template`, recorded before dispatch, so a repeat run sends nothing. (AC-004)
- FR-006: A failed send MUST be recorded with the provider reason, retried with a bounded budget, and never throw into the registration path. (AC-005)
- FR-007: An attendee MUST be able to set an email preference that suppresses reminder and thank-you sends while leaving confirmation in place. (AC-006)
- FR-008: The admin MUST be able to read per-registration delivery rows for the lifecycle templates. (AC-007)
- FR-009: Templates MUST render through one escaping renderer; no recipient's data may appear in another recipient's message. (AC-008)

### Non-Functional Requirements
- NFR-001: Confirmation is transactional and MUST NOT be suppressed by the lifecycle preference; reminders and thank-yous are optional and MUST honour it. (AC-006)
- NFR-002: Registration latency MUST NOT depend on the email provider; the mutation completes before the send is attempted. (AC-001, AC-005)
- NFR-003: Every lifecycle email MUST be sent to exactly one recipient; no BCC fan-out, and no other attendee's name, email, or ticket may appear in the body. (AC-008)
- NFR-004: Retries MUST be bounded and observable; a permanently failing registration MUST stop retrying and remain visible as failed rather than looping. (AC-005)

## UI/UX & Data Requirements

### Key Screens
- Event page / registration success: unchanged visually; the confirmation is confirmed by email.
- Attendee preferences: an opt-out control reachable from the email and from My Tickets.
- Admin: delivery rows per registration, reusing the existing email log surface.

### Data Model Changes
- `emailEvents.template` union extended with the four lifecycle values, plus an optional
  `registrationId` and `idempotencyKey` so delivery can be traced and deduplicated.
- `registrations` gains an optional `emailOptOut` boolean (default false).
- No change to `events` or `users` shape.

## Edge Cases & Error States

| Scenario | Expected Behaviour |
|---|---|
| Registration cancelled before the reminder | No reminder is sent; the confirmation already sent is not retracted. |
| Event rescheduled inside the window | The job keys on `startDate`, so a moved event either sends once or not at all — never twice. |
| Provider outage | Sends record `failed` with the reason; retries are bounded; the admin log shows it. |
| Duplicate registration attempt | Rejected downstream as today; no second confirmation. |
| Attendee opts out after confirming | Reminders and thank-yous stop; the confirmation is not re-sent. |
| Event ends without ever starting (deleted) | No thank-you; the job only selects events with an end date in the past. |

## Security Baseline

- Confirmation must go to the address on the registration, never to a caller-supplied one.
- No PII in subject lines; no cross-recipient data in any body (NFR-003).
- Unsubscribe must be authenticated to the attendee, not a bare `?email=` parameter that leaks addresses.
- Provider credentials stay in environment variables; no key may reach the client or the log.
- Email content is rendered as text/HTML from templates; no user-supplied HTML is interpolated unescaped.

## Dependencies & Risks

### Dependencies
- The Mailtrap transport from the earlier migration (`convex/mailtrap.ts`).
- The existing cron infrastructure (`convex/crons.ts`, `cronRuns`).

### Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Reminder job double-sends after a restart | Medium | High | Idempotency key recorded before dispatch; job selects only unsent keys. |
| Sending blocks the registration mutation | Medium | High | Enqueue and return; the Node action runs separately. |
| Opt-out is honoured inconsistently | Low | High | One preference check in the dispatch path, not per template. |
| Provider rate limits during a large event | Medium | Medium | Batch the reminder sweep and respect the bounded retry budget. |

## Out of Scope
- Broadcast announcements (existing feature).
- Template editing UI.
- SMS or push channels.
- Per-event reminder timing configuration.

## Research & Standards

- Mailtrap Email Sending API — transactional and bulk streams.
- Convex scheduled functions — https://docs.convex.dev/scheduling/scheduled-functions
- Convex cron jobs — https://docs.convex.dev/scheduling/cron-jobs
- RFC 8058 one-click unsubscribe semantics (as the standard we follow for preference handling).
