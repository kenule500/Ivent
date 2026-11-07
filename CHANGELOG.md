# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Admin console foundations** — an admin shell with a grouped sidebar (Overview,
  Audience, Events, Operations, Governance, Personal), a command palette on
  `Ctrl/Cmd+K`, and an admin guard that verifies the role before rendering.
- **Command center** — dashboard statistics, upcoming-event counts, and the ten most
  recent audit entries.
- **Analytics workspace** — a filtered analytics view with date-range, category, and
  location filters, summary tiles, and charts.
- **CSV exports** — export users, events, registrations, audit log, and analytics,
  plus a per-event report. Exports are capped and rate-limited, and the file is built
  client-side from returned text so it is never publicly addressable.
- **Reports hub** — a reports index and a per-event report with attendance and
  revenue metrics.
- **Platform settings** — default country, currency, and timezone, plus five feature
  flags (command palette, reports, broadcasts, feedback inbox, system health).
- **Maintenance mode** — a platform-wide notice shown to non-admins while admins keep
  working.
- **Broadcast announcements** — send email to all users, organizers, admins, or a
  single event's attendees, with audience preview, typed confirmation, batched
  delivery, and per-recipient delivery records.
- **Feedback inbox** — triage bug, feature, abuse, and other reports with status,
  priority, and admin notes.
- **System health** — cron heartbeats, email delivery outcomes, and rate-limit
  rejection counts.
- **Audit log** — a filterable record of admin actions, with CSV export.
- **Admin invites** — create, resend, revoke, and delete admin invitations, with a
  7-day expiry and a daily cron that marks expired invites.
- **Admin settings** — the signed-in admin's profile and notification preferences.

### Changed

- **`next` upgraded to 16.4.3** from 16.2.9, clearing the critical advisories against
  the App Router, Server Actions, and the Image Optimization API.
- **`zod` upgraded to ^4.6.6** from ^4.4.3, clearing the memory-exhaustion advisory in
  constrained-collection validation.
- **`shadcn` removed from runtime dependencies.** It is a scaffolding CLI, not a
  runtime library, and nothing imported it. Removing it also cleared the transitive
  `zod` and `deepmerge` advisories it pulled in, and dropped 188 packages.

### Security

- Production dependency advisories reduced from 39 (3 critical, 14 high) to 17
  (1 critical, 2 high). The three remaining advisories (`shell-quote`,
  `browserslist`, `image-size`) are transitive with no published fix path; they are
  tracked rather than waived silently.
- Admin routes are protected by Clerk middleware, and every admin mutation is
  enforced server-side in Convex.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`) are set in `proxy.ts`.

### Known gaps

- NFR-008 (performance at 50,000 events / 500,000 registrations) has no benchmark
  evidence yet.
- `sdrive verify` does not scan `convex/`, so it reports implemented backend code as
  missing. Tracked as blocker `T6.1`.

## [0.1.0]

Initial version: event discovery, registration, organizer dashboards, QR check-in,
and AI-assisted event creation.
