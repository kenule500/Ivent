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
- **Share-ready event pages (BP-005).** A public event is now a server-rendered page
  with its own title, description, canonical URL, and Open Graph/Twitter tags,
  plus a generated 1200×630 social card (a branded fallback is used when the event
  has no cover image) and escaped `schema.org/Event` JSON-LD. Organizers can add up
  to six sponsors — name, logo, alt text, and an optional link — and reorder or
  remove them; the sponsor strip is absent when there are none.
- **Live door mode and offline check-in (BP-004).** A dedicated door screen per
  event shows the checked-in count, confirmed total, check-in rate, last check-in
  time, connection state, and the ten most recent check-ins, and stays current
  within about two seconds of a check-in on another device. Organizers can check
  people in by QR scan, ticket code, or attendee name, and a repeat scan reports
  "already checked in" with the original timestamp instead of double counting.
  Enabling offline mode caches that one event's confirmed attendee list on the
  device — with no network needed to keep checking people in — and queued
  check-ins sync idempotently once connectivity returns. The cache is cleared on
  sign-out, 24 hours after the event ends, or on demand. Installing the app adds a
  web manifest and a service worker that keeps the door shell available offline
  when the network drops — it never caches API responses.
- **Google Wallet event tickets (BP-003).** Confirmed registrations for an
  event with wallet enabled can be added to Google Wallet as an event ticket with
  a scannable barcode. Repeated requests reuse the same pass, and cancelling a
  registration or deleting the event expires it. Issuance is rate-limited and
  audited, and a wallet outage never affects the in-app QR ticket. Apple
  Wallet is not offered: no Pass Type ID credentials exist, so the wallet surface
  reports Apple as unavailable.
- **Custom registration questions (BP-007).** Organizers can define up to ten
  ordered questions per event — short text, long text, single select, multi select,
  number, or date — mark each required or optional, add help text and options, and
  preview the attendee form before publishing. The registration dialog renders
  them in order with required markers and a privacy note, and validates answers in
  the browser and again on the server. Answers belong to the attendee, the event's
  organizer, and administrators. Editing a question with existing answers versions
  it and archives the old definition, so historical answers stay readable and
  exportable; removing one requires confirmation. Registration exports add one
  column per current and archived question.
- **Event currency, international locations, and English/French UI (BP-014).**
  Events now store a currency (`NGN`, `USD`, `GBP`, `EUR`), a full
  country/state/city location, and an IANA timezone, and every price and date on
  the public page, ticket, registration form, door mode, and exports is formatted
  for that event — so a `$5,000` event no longer renders with a hardcoded naira
  symbol, and dates are shown in the event's timezone, labelled, rather
  than the viewer's. Product copy is available in English and French via a
  switcher that persists for a year and drives system lifecycle email. The
  interface resolves locale from the user's choice, then a persisted cookie, then
  the platform default, then `Accept-Language`. An unsupported locale or currency
  falls back to the platform default with a non-blocking notice instead of a raw
  key or a blank price. Organizer-entered content is shown exactly as entered and
  never machine-translated.
- **Platform locale and currency defaults.** Platform settings gain a default
  locale (`en` or `fr`) alongside the default country, currency, and timezone, and
  the currency is now validated against the four supported values.

### Changed

- **Accessibility and performance hardening (BP-015).** Shared accessibility
  primitives — `LiveRegionProvider`/`useAnnounce`, `SkipLink`, `VisuallyHidden`,
  focus helpers, and a reactive `prefers-reduced-motion` hook — replace per-screen
  ad-hoc behaviour. Event cards became real controls (`role`, tab stop, Enter/Space),
  async registration, ticket, and feedback outcomes now announce instead of relying
  on toasts, the layout exposes skip link and landmark structure with the footer no
  longer nested inside `<main>`, and icon-only controls carry accessible names.
  Two gates now enforce the floor: `npm run a11y` (axe-core, WCAG 2.1 A/AA) and
  `npm run lighthouse` (budgets in `.lighthouserc.json`).
  Measured: Lighthouse accessibility 87 → **96**; event-page first-load JavaScript
  **2,592 KB → 331 KB** after the onboarding modal stopped preloading its worldwide
  `country-state-city` dataset. The 180 KB JS budget remains **unmet** because
  Clerk's UI bundles alone are ~343 KB — recorded, not waived, in
  `.sdrive/reports/performance/performance-report-accessibility-and-performance-hardening-v1-2026-11-08.md`.

- **Transactional email moved from Resend to Mailtrap.** `convex/mailtrap.ts` posts
  straight to the Mailtrap Email Sending API, so no SDK is bundled into the Convex
  action. Invites go out on the transactional stream while announcements use the
  Bulk stream once `MAILTRAP_BULK_API_KEY` is set, and fall back to transactional
  when it is not. The Email Testing sandbox is one flag away
  (`MAILTRAP_USE_SANDBOX` plus `MAILTRAP_INBOX_ID`), provider error text lands in
  `emailEvents` and `/admin/health`, and `/admin/health` reports the Mailtrap
  config plus which transport mode is active. `RESEND_API_KEY` /
  `RESEND_FROM_EMAIL` are replaced by `MAILTRAP_API_KEY`,
  `MAILTRAP_BULK_API_KEY`, `MAILTRAP_FROM_EMAIL`, and `MAILTRAP_FROM_NAME`, and
  the `resend` dependency is removed.
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
