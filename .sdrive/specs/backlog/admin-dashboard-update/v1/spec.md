---
title: Admin Dashboard Update
status: backlog
version: v1
created: 2026-10-20
updated: 2026-10-20
---

# Admin Dashboard Update

## Overview

- **Problem Statement**: The admin console does what moderation requires and nothing more. `/admin/dashboard` is four counters with two recent-activity lists; analytics is a fixed 30-day window with four charts and no filters; settings exposes an attendee concept ("Onboarding: Pending"); and there is no reporting, export, announcement, feedback, platform-configuration, or health surface at all. An operator cannot answer "what needs my attention today?", cannot slice demand by category, country, ticket type, or organizer, cannot hand a sponsor a credible post-event report, cannot email a segmented audience, cannot triage what users report, and cannot tell whether background jobs are healthy. The result reads like a database viewer, not a command center — which is the opposite of the prestige signal the product needs.
- **Proposed Solution**: Rebuild `/admin` as an operator command center in four layers. First, a shell: grouped navigation, one `PageHeader` component, and a keyboard command palette (Ctrl/Cmd+K). Second, a decision-ready dashboard: trend cards with deltas and sparklines, an action queue, today-at-a-glance, and recent audit activity. Third, an analytics workspace with one server-side filter object (range, category, country, city, ticket type, organizer, registration status, check-in state), previous-period comparison, five new chart families, and per-chart data-table alternatives. Fourth, new operational modules: CSV export across every list, a reports hub, super-admin platform settings, broadcast announcements, a support/feedback inbox, and a system-health panel. Admin settings drops the attendee-only onboarding row. Every new mutation stays behind `requireAdmin`/super-admin checks, declares Convex validators, writes an audit entry, and is rate-limited.
- **Target Audience**: Ivent admins (moderation, analytics, reporting) and super admins (platform configuration, broadcasts, governance). Secondary beneficiaries: organizers and sponsors who receive exported reports, and attendees who receive announcements.
- **Assumptions**:
  - The existing console from `admin-console-and-governance` v1 remains the base. This feature modifies it in place; it does not replace Clerk sign-in, invite acceptance, or the audit primitive.
  - `hasCompletedOnboarding` (and interests/location) are attendee concepts. Admins never complete attendee onboarding, so the value is structurally meaningless in an admin context rather than merely stale.
  - Resend is the only email transport; no new vendor is introduced.
  - No new third-party UI package is required. `components/ui/*` (including `dialog`, `tabs`, `select`, `popover`, `calendar`, `table`, `chart`), Recharts, `date-fns`, `lucide-react`, and `react-day-picker` cover the approved visual budget.
  - Read-on-demand analytics remains acceptable at current volumes. Indexes and bounded ranges are added so filtered queries do not scan whole collections.
  - The product is global (approved product overview). Currency, country, and timezone come from platform settings with `USD`/`UTC` defaults; no screen may hard-code `₦` or `NG`.
  - Feedback and announcement records are internal operational data. They are retained until an admin deletes them, and deletion is audited.
- **Out of Scope**:
  - Online payments, refunds, payouts, and tax handling.
  - Editing event content (title, schedule, venue, capacity) from the admin console; events remain organizer-owned.
  - Granular per-permission roles beyond `user`, `admin`, and `super_admin`.
  - A warehouse, nightly aggregate pipeline, or external BI integration.
  - Native mobile applications.
  - Live chat or third-party helpdesk integration; the feedback inbox is internal only.
  - Draft, scheduled, recurring, or templated broadcasts (v1 sends immediately, plain text plus simple line breaks).
  - SIEM export or external observability integration.
  - Public API or webhooks for admin data.

## User Stories

### US-001: Navigate a grouped, consistent console
As an admin, I want navigation grouped by job and one consistent page header, so that I can find the right tool quickly and every screen reads as one product.

**Acceptance Criteria:**
- AC-001: Given any `/admin` route, the sidebar groups destinations under Overview, Audience, Events, Operations, Governance, and Personal, marks the active item with `aria-current="page"`, collapses to a drawer below `md`, and is generated from one navigation configuration; after a route change the drawer closes and focus returns to its trigger.
- AC-002: Given any admin page, it renders a header with title, a one-sentence purpose, a breadcrumb, and an optional primary-action slot; at a 360px viewport the header wraps without horizontal scrolling.

### US-002: Reach anything from the keyboard
As an admin, I want a command palette, so that I can jump to a page, event, user, or registration without walking menus.

**Acceptance Criteria:**
- AC-003: Given I press Ctrl/Cmd+K anywhere inside `/admin`, a dialog opens with a labelled search input, trapped focus, and `Esc` closing it back to the invoking element; typing two or more characters returns grouped results (Pages, Users, Events, Registrations) that are keyboard-navigable, and Enter opens the highlighted destination.
- AC-004: Given fewer than two characters, the palette shows only static page actions; given no matches, it names the query in an empty state; given a query failure, it shows an inline retry affordance rather than a blank panel.

### US-003: Open the console to a decision, not a data dump
As an admin, I want the dashboard to tell me what changed and what needs action, so that opening `/admin` is decision-ready.

**Acceptance Criteria:**
- AC-005: Given `/admin/dashboard`, I see trend cards for users, events, registrations, and estimated revenue, each with the comparison window named, a delta, and a sparkline; a zero or missing baseline renders "new" or "no change" instead of `NaN`, `Infinity`, or `0%`.
- AC-006: Given pending operational items — invites expiring within 48 hours, events at or above 100% capacity, feedback open longer than 48 hours, and failed email deliveries — I see an action queue with counts and a link to each module; with none, the queue shows a positive empty state rather than an empty box.
- AC-007: Given I open the dashboard, I see today's events with check-in progress, the ten most recent audit entries with actor and relative time, and quick actions; each block has its own loading, empty, and error state.

### US-004: Filter analytics by time and dimension
As an admin, I want to slice analytics by time and dimensions, so that I can answer questions about one segment instead of the whole platform.

**Acceptance Criteria:**
- AC-008: Given the analytics page, I can pick a 7/30/90/365-day preset or a custom range; the range is encoded in the URL, survives reload and back/forward, and one filter set drives every summary card and chart on the page.
- AC-009: Given filters for category, country, city, ticket type, organizer, registration status, and check-in state, I can combine them; active filters render as removable chips plus "Clear all", and both the result count and the empty state reflect the filtered dataset.
- AC-010: Given a custom range whose start is after its end, or a span longer than 730 days, the page rejects it with an inline message and keeps the last valid query.

### US-005: Compare a period with its predecessor
As an admin, I want period-over-period comparison, so that I can say whether growth is real.

**Acceptance Criteria:**
- AC-011: Given comparison is enabled, every summary metric shows the current value, previous value, absolute delta, percentage delta, and a direction indicator that is not conveyed by colour alone; when the previous value is zero, the delta renders "new" instead of a percentage.
- AC-012: Given comparison is disabled, no delta or ghost series renders, and the toggle state is preserved for the session.

### US-006: See the funnel, the door, and the money
As an admin, I want operational and demand charts, so that I can see conversion and revenue rather than only signups.

**Acceptance Criteria:**
- AC-013: Given the analytics page, I see a registration funnel (registered → confirmed → checked in) with step conversion, check-in rate over time, capacity-utilisation distribution, revenue over time split by free/paid, and a weekday × hour registration heatmap.
- AC-014: Given cohort mode, I see new versus returning attendees per cohort period, with the definition of "returning" stated on the card; given insufficient data, the card states the minimum required instead of rendering empty axes.
- AC-015: Every chart card has a title, a one-line interpretation, a loading skeleton, an empty state, and a keyboard-reachable data-table alternative that exposes the same numbers.

### US-007: Export what I am looking at
As an admin, I want to export the current view, so that I can hand evidence to a sponsor, school, or teammate.

**Acceptance Criteria:**
- AC-016: Given any list or analytics view with an export action, the CSV contains the columns visible in that view, respects the active filters, includes a header row, and is named `<module>-<yyyy-MM-dd>.csv`.
- AC-017: Given any cell whose value begins with `=`, `+`, `-`, `@`, tab, carriage return, or line feed, every field is double-quoted, internal quotes are doubled, and the dangerous leading character is neutralised per OWASP CSV-injection guidance; given a result set above the configured cap, the export is refused with the cap stated and a suggestion to narrow filters.
- AC-018: Given an export starts, its trigger shows progress and rejects repeat clicks; completion or failure raises a toast, and a failure names the reason without exposing a stack trace.

### US-008: Produce a credible post-event report
As an admin, I want a per-event report, so that organizers and sponsors receive an artifact they can trust.

**Acceptance Criteria:**
- AC-019: Given `/admin/reports`, I can choose an event and see attendance (confirmed, checked in, no-show, cancelled), check-in rate over time, capacity utilisation, and revenue for paid events, with the data timestamp shown.
- AC-020: Given a report, I can export it as CSV and print or save it as PDF through a print stylesheet that removes admin chrome; given an event with no registrations, the report renders zeros plus an explanatory empty state.

### US-009: Configure the platform, not just my account
As a super admin, I want platform-level defaults and switches, so that the console reflects a global product instead of a Nigeria-only one.

**Acceptance Criteria:**
- AC-021: Given `/admin/platform`, a super admin can set default country, default currency (ISO 4217), default timezone (IANA), and toggle feature flags for command palette, reports, broadcasts, feedback inbox, and system health.
- AC-022: Given a super admin saves platform settings, the change persists in one settings document, writes a `settings.updated` audit entry containing before and after values, and affects formatting on the next render; a non-super-admin sees a read-only view and cannot reach the mutation.
- AC-023: Given maintenance mode is enabled, signed-out and non-admin visitors see a maintenance notice on public routes while admins retain access; enabling it requires typed confirmation and is audited.

### US-010: Broadcast to a filtered audience
As a super admin, I want to email a filtered audience, so that I can communicate without exporting addresses.

**Acceptance Criteria:**
- AC-024: Given the broadcast composer, I choose an audience (all users, organizers with at least one event, attendees of a selected event, admins), see the resolved recipient count before sending, and preview subject and body.
- AC-025: Given I send, the system requires typed confirmation, is rate-limited, sends through Resend in bounded batches, writes an `announcement.sent` audit entry with audience and count, and records per-recipient delivery outcomes.
- AC-026: Given delivery partially fails, the announcement shows sent and failed counts and its failures appear in system health; a partially failed send is never reported as a success.

### US-011: Triage what users report
As an admin, I want a queue of feedback and abuse reports, so that moderation is deliberate rather than reactive.

**Acceptance Criteria:**
- AC-027: Given a signed-in non-admin submits feedback or reports an event from the public app, a validated record is created with type, optional target, message, and reporter; submission is rate-limited and duplicate submissions within the window are suppressed.
- AC-028: Given `/admin/feedback`, I can filter by status, type, and priority, open a record, add an internal note, move it through open → in review → resolved or dismissed, and see who changed it and when; every change writes an audit entry.
- AC-029: Given a record targets an event, I can open that event from the record; given the event was deleted, the record still renders with a "target removed" label.

### US-012: Know whether the machinery is healthy
As an admin, I want a health panel, so that failures are caught before users report them.

**Acceptance Criteria:**
- AC-030: Given `/admin/health`, I see each cron job's last run and status, email delivery failures in 24 hours and 7 days, rate-limit rejections, and the age of open feedback; every signal states the window it covers.
- AC-031: Given a required server configuration value is missing, the panel lists it as unconfigured with the feature it affects, and never prints the value.
- AC-032: Given one health query fails, only that card shows an error with retry; the remaining cards stay usable.

### US-013: Stop leaking attendee concepts into admin settings
As an admin, I want settings to show only admin-relevant information, so that the console does not present attendee state as an admin task.

**Acceptance Criteria:**
- AC-033: Given `/admin/settings`, the Onboarding row is absent, and no other attendee-only field (interests, attendee location) is rendered; profile identity, role, member-since, security actions, and notification preferences remain.
- AC-034: Given the settings query returns a record without admin-relevant fields, the page renders a degraded but truthful state instead of inventing "Pending".

## Requirements

### Functional Requirements

#### Shell, navigation, and command palette
- FR-001: The admin shell MUST render navigation from one configuration source grouped as Overview, Audience, Events, Operations, Governance, and Personal. (AC-001)
- FR-002: The shell MUST mark the active route with `aria-current`, close the mobile drawer on route change, and restore focus to the drawer trigger. (AC-001)
- FR-003: Every admin page MUST render a shared page header with title, description, breadcrumb, and a primary-action slot. (AC-002)
- FR-004: The console MUST provide a command palette invoked by Ctrl/Cmd+K that searches pages, users, events, and registrations. (AC-003)
- FR-005: Palette search MUST run server-side behind an admin check, enforce a two-character minimum, debounce input, cap results per group, and return a typed result union. (AC-003, AC-004)
- FR-006: The command palette MUST include deep-link quick actions permitted by the current role. (AC-003)

#### Command center dashboard
- FR-007: The dashboard MUST show trend cards for users, events, registrations, and estimated revenue, each with the named comparison window, delta, and sparkline. (AC-005)
- FR-008: The dashboard MUST derive an action queue from expiring invites, at-capacity events, stale open feedback, and failed email deliveries, each linking to its module. (AC-006)
- FR-009: The dashboard MUST show today's events with check-in progress, the ten most recent audit entries, and role-appropriate quick actions. (AC-007)
- FR-010: Every dashboard block MUST fetch independently so that one failure does not blank the page. (AC-007, AC-032)

#### Analytics workspace
- FR-011: Analytics MUST accept one shared filter object covering date range, categories, countries, cities, ticket types, organizer, registration status, and check-in state. (AC-008, AC-009)
- FR-012: Analytics MUST support preset and custom ranges, encode filters in the URL, and restore them on reload and history navigation. (AC-008)
- FR-013: Analytics MUST reject invalid ranges (start after end, or span over 730 days) and retain the last valid query. (AC-010)
- FR-014: Analytics MUST support previous-period comparison for every summary metric. (AC-011, AC-012)
- FR-015: The analytics workspace MUST expose registration funnel, check-in trend, capacity utilisation, revenue split, cohort retention, and weekday × hour heatmap datasets. (AC-013, AC-014)
- FR-016: Every chart MUST ship a data-table alternative exposing the same numbers. (AC-015)
- FR-017: Every analytics response MUST echo the applied filter and the row counts used to produce it. (AC-009)

#### Export
- FR-018: Every list and report view MUST offer a CSV export of the current filtered dataset. (AC-016)
- FR-019: CSV generation MUST quote every field, double internal quotes, and neutralise formula-injection prefixes in accordance with OWASP guidance. (AC-017)
- FR-020: Exports MUST enforce a configurable row cap, be rate-limited per admin, and report progress, success, and failure. (AC-017, AC-018)

#### Reports
- FR-021: The reports hub MUST list events and render a per-event report with attendance, check-in, capacity, and revenue sections plus a data timestamp. (AC-019)
- FR-022: Reports MUST be exportable as CSV and printable through a print stylesheet that hides admin chrome. (AC-020)

#### Platform settings and defaults
- FR-023: Platform settings MUST persist default country, currency, timezone, feature flags, and maintenance mode in a single document. (AC-021)
- FR-024: Platform settings writes MUST require `super_admin` and write a `settings.updated` audit entry with before and after values. (AC-022)
- FR-025: Maintenance mode MUST block public routes for non-admins while preserving admin access, and MUST require typed confirmation to enable. (AC-023)
- FR-026: Feature flags MUST hide a disabled module from navigation and reject its server queries. (AC-021)
- FR-027: Currency, date, number, and timezone formatting MUST derive from platform settings rather than hard-coded `₦`, `NG`, or a browser-local guess. (AC-019, AC-021)

#### Broadcast announcements
- FR-028: The broadcast composer MUST resolve and display recipient counts for all users, organizers, attendees of a selected event, and admins before sending. (AC-024)
- FR-029: Broadcast sending MUST require `super_admin`, typed confirmation, rate limiting, bounded Resend batches, and a persisted announcement record. (AC-025)
- FR-030: Broadcasts MUST record per-recipient delivery outcomes and expose sent and failed counts. (AC-026)
- FR-031: The announcements list MUST show status, audience, recipient counts, author, and timestamp. (AC-026)

#### Support and feedback
- FR-032: The public app MUST let a signed-in non-admin submit feedback or report an event with validation, rate limiting, and duplicate suppression. (AC-027)
- FR-033: The feedback inbox MUST support status, type, and priority filters, a detail view, internal notes, status transitions, and navigation to the target. (AC-028)
- FR-034: Feedback mutations MUST require admin and write an audit entry for every status, priority, or note change. (AC-028)
- FR-035: A feedback record whose target was deleted MUST remain readable and labelled as target removed. (AC-029)

#### System health
- FR-036: The health panel MUST report cron recency and status, 24-hour and 7-day email failures, rate-limit rejections, open-feedback age, and configuration presence. (AC-030)
- FR-037: Health reporting MUST expose only presence or absence of configuration, never a value. (AC-031)

#### Settings cleanup and shared infrastructure
- FR-038: Admin settings MUST NOT render `hasCompletedOnboarding`, interests, or attendee location. (AC-033, AC-034)
- FR-039: The audit schema MUST add action and target literals for settings, announcements, feedback, exports, and maintenance mode. (AC-022, AC-025, AC-028)
- FR-040: All new Convex functions MUST declare `convex/values` argument validators and enforce role checks server-side. (AC-022, AC-025, AC-028)
- FR-041: The console MUST provide shared formatters for currency, compact numbers, relative time, percentages, and signed deltas. (AC-005, AC-011)
- FR-042: The analytics and operational modules MUST add indexes so filtered windows are served by index ranges rather than full-collection scans. (AC-008, AC-030)
- FR-043: Each major admin panel MUST sit behind a local error boundary with retry. (AC-007, AC-032)
- FR-044: Day bucketing and report labels MUST use the platform timezone. (AC-019, AC-030)
- FR-045: Every aggregated panel MUST display an "as of" timestamp and the window it covers. (AC-019, AC-030)

### Non-Functional Requirements

- NFR-001: Every new Convex function MUST authenticate via Clerk and authorize with `requireAdmin` or a super-admin equivalent; client gating is defense in depth only. (CON-511; AC-022, AC-025, AC-028)
- NFR-002: Platform settings, broadcasts, and maintenance mode MUST be enforced as `super_admin`-only on the server, not only hidden in the UI. (CON-512; AC-022, AC-025)
- NFR-003: Palette search, analytics queries, exports, broadcasts, feedback submission, and feedback mutations MUST be rate-limited through `@convex-dev/rate-limiter` and return a retry hint on rejection. (CON-514; AC-017, AC-025, AC-027)
- NFR-004: Every form MUST validate with Zod and every Convex function MUST declare `convex/values` validators; unvalidated free-form objects MUST NOT be accepted. (CON-515; AC-021, AC-024, AC-027)
- NFR-005: The feature MUST NOT introduce `dangerouslySetInnerHTML`; user-supplied feedback, notes, announcement bodies, and exported cells MUST be rendered or encoded as text. (CON-517; AC-017, AC-028)
- NFR-006: Secrets MUST remain server-side; the health panel and settings UI MUST report presence only, and no `.env` file may be created or modified. (CON-519; AC-031)
- NFR-007: Production traffic MUST remain HTTPS-only with HSTS at the hosting layer; this feature MUST NOT weaken transport security. (CON-520; AC-021)
- NFR-008: Filtered analytics MUST return within 1.5 s p95 and the dashboard within 1 s p95 at 50,000 events and 500,000 registrations, using index ranges and bounded windows rather than collection scans.
- NFR-009: Every new screen MUST meet WCAG 2.1 AA: visible focus, 4.5:1 text contrast, labelled controls, keyboard-complete palette and dialogs, chart data-table alternatives, and status messages announced without relying on colour.
- NFR-010: Every new screen MUST be usable at 360px with no page-level horizontal scrolling; wide data tables MAY scroll inside their own container.
- NFR-011: Every data-driven panel MUST provide loading, empty, and error states, with skeletons whose shape matches the final layout.
- NFR-012: Motion MUST respect `prefers-reduced-motion`, and no animation may be required to understand a state change.
- NFR-013: Exports MUST be capped (default 10,000 rows), audited, rate-limited, and limited to the columns visible to the requesting admin.
- NFR-014: `npx tsc --noEmit`, `npm run lint` with zero errors, and `node .sdrive/scripts/validate-governance.js` MUST pass before the feature is complete. (CON-204, CON-703)
- NFR-015: Every new administrative mutation MUST write an audit entry through `logAdminAction`, and failures MUST surface to the caller rather than being swallowed. (CON-206)
- NFR-016: Feedback and announcement records MUST be retained until an explicit deletion, and every deletion MUST be audited.

## UI/UX & Data Requirements

### Navigation structure

| Group | Destinations |
|---|---|
| Overview | Dashboard, Analytics |
| Audience | Users, Feedback inbox |
| Events | Events, Registrations, Reports |
| Operations | Announcements, System health |
| Governance | Admin invites, Audit log, Platform settings |
| Personal | Settings |

### Analytics filter model

| Filter | Type | Notes |
|---|---|---|
| Range | preset `7\|30\|90\|365` or custom `{start,end}` | Maximum span 730 days; URL-encoded |
| Categories | `string[]` | Matches `events.category` |
| Countries | `string[]` | Matches `events.country` |
| Cities | `string[]` | Matches `events.city` |
| Ticket types | `free\|paid` | Matches `events.ticketType` |
| Organizer | `Id<users>` | Matches `events.organizerId` |
| Registration status | `confirmed\|cancelled` | Matches `registrations.status` |
| Check-in state | `checked_in\|not_checked_in` | Matches `registrations.checkedIn` |
| Comparison | `boolean` | Previous equal-length period |

### Data model additions

| Entity | Change | Purpose |
|---|---|---|
| `platformSettings` | create | Singleton document: defaults, feature flags, maintenance mode, `updatedBy`, `updatedAt` |
| `announcements` | create | Subject, body, audience, recipient/failed counts, status, author, timestamps |
| `announcementDeliveries` | create | Per-recipient outcome: announcement, email, status, error, timestamp |
| `feedback` | create | Type, target, message, reporter, status, priority, admin notes, timestamps |
| `emailEvents` | create | Delivery log used by the health panel and action queue |
| `auditLogs` | update | Add action and target literals for settings, announcements, feedback, exports, maintenance |
| `users` | update | Add `by_createdAt` index for bounded growth windows |
| `registrations` | update | Add `by_registeredAt` and `by_event_status` indexes |
| `events` | no_change | Existing `by_startDate`, `by_category`, `by_organizer` cover the filters |

### Interaction requirements

- The command palette is a dialog, not a page. It never traps focus on close and never steals Ctrl/Cmd+K from a focused text field.
- Filter chips are removable and keyboard-focusable. "Clear all" is a single action, not a page reload.
- Every chart's data-table alternative is reachable by keyboard and announced as the chart's text equivalent.
- Destructive actions (maintenance mode, broadcast send, record deletion) require typed confirmation, not a bare click.
- The settings page keeps its two-column layout; the Onboarding row is deleted without reflowing the remaining cards.

## Security Baseline

| Control | Status | Expansion in this feature |
|---|---|---|
| CON-511 Authentication | REQUIRED | NFR-001: every new Convex function authenticates through Clerk identity and authorizes through `requireAdmin`. |
| CON-512 Authorization | REQUIRED | NFR-002: platform settings, broadcasts, and maintenance mode are `super_admin`-only on the server. |
| CON-513 Security Headers (Helmet) | NOT APPLICABLE | Next.js has no Express middleware; headers remain `next.config.ts`'s responsibility (CON-506). |
| CON-514 Rate Limiting | REQUIRED | NFR-003: palette, analytics, exports, broadcasts, feedback submission, and feedback mutations are limited with retry hints. |
| CON-515 Input Validation | REQUIRED | NFR-004: Zod on forms, `convex/values` validators on every argument. |
| CON-516 NoSQL / Injection | NOT APPLICABLE | Convex queries are typed and parameterized; no query strings are assembled. |
| CON-517 XSS Protection | REQUIRED | NFR-005: no `dangerouslySetInnerHTML`; user content rendered as text; CSV cells neutralised. |
| CON-518 CSRF Protection | NOT APPLICABLE | State changes are Clerk-authenticated Convex mutations, not cookie-driven HTML form posts. |
| CON-519 Environment Security | REQUIRED | NFR-006: secrets stay server-side; health reports presence only. |
| CON-520 HTTPS / HSTS | REQUIRED | NFR-007: hosting-layer HTTPS/HSTS is unchanged and not weakened. |

## Edge Cases & Error States

- EC-001: The platform has zero users, events, and registrations → the action queue shows a positive empty state and each analytics card states the minimum data it needs.
- EC-002: The comparison period has zero for a metric → delta renders "new"; no division by zero.
- EC-003: A custom range starts after it ends, or spans more than 730 days → inline validation, last valid query retained.
- EC-004: A filter combination returns zero rows → per-chart empty states, export disabled, chips still removable.
- EC-005: An export exceeds the row cap → refused with the cap and a narrower-filter suggestion.
- EC-006: A CSV cell begins with `=`, `+`, `-`, `@`, tab, CR, or LF → field quoted and neutralised per OWASP guidance.
- EC-007: A non-super-admin opens `/admin/platform` or `/admin/announcements` → read-only view or redirect; the mutation is rejected server-side.
- EC-008: Maintenance mode is enabled while an admin is mid-session → admins keep access; public visitors see the notice.
- EC-009: A broadcast audience resolves to zero recipients → send disabled with the reason shown.
- EC-010: Resend fails for some recipients → partial-failure state, failures listed in health, no false success.
- EC-011: A feedback record targets an event that was deleted → "target removed" label, record retained.
- EC-012: A palette query fails → inline retry, dialog stays open, no crash.
- EC-013: Two admins resolve the same feedback record concurrently → both audit entries persist; the latest write wins and the detail view refreshes.
- EC-014: An analytics query times out → only that panel shows an error with retry.
- EC-015: A user has no name or avatar → initials fallback and an email-based label; no empty text node.
- EC-016: The platform settings document does not exist on first run → defaults render and the document is created on first save.
- EC-017: A timezone other than UTC is selected → day buckets, heatmap hours, and report labels follow it consistently, and the active timezone is displayed.
- EC-018: A disabled feature flag is hit by a direct URL → the route renders a "not enabled" state and the server query rejects.

## Dependencies & Risks

### Dependencies

| Dependency | Type | Change | Notes |
|---|---|---|---|
| Convex | service | no_change | Data, cron, rate limiter, indexes |
| Clerk | service | no_change | Identity and roles |
| Resend | service | no_change | Invite and broadcast email |
| Recharts | library | no_change | All charts |
| `date-fns` | library | no_change | Date math and formatting |
| `react-day-picker` | library | no_change | Custom range selection |
| `lucide-react` | library | no_change | Icons |
| `zod` | library | no_change | Form validation |
| `@convex-dev/rate-limiter` | library | no_change | Rate limits |
| `country-state-city` | library | no_change | Validates the platform default country |

No new third-party package is required. `components/ui/dialog`, `tabs`, `select`, `popover`, `calendar`, `table`, `badge`, `progress`, `tooltip`, and `chart` cover the interaction requirements.

### Risks

- RISK-001: Read-on-demand analytics will not scale indefinitely. Mitigation: add indexes, clamp ranges, cap exports, and record the aggregate-pipeline trigger point in the plan.
- RISK-002: Broadcast email can damage sender reputation or spam users. Mitigation: super-admin only, typed confirmation, preview, rate limit, bounded batches, and a delivery log.
- RISK-003: Adding literals to the `auditLogs` unions is a schema change that can reject old documents if deployed out of order. Mitigation: deploy schema first, keep the validator exhaustive, and backfill no existing rows.
- RISK-004: Exports can leak personal data. Mitigation: admin-only, visible columns only, row cap, rate limit, and an audit entry per export.
- RISK-005: Maintenance mode can lock out legitimate operators. Mitigation: admin bypass, typed confirmation, audit entry, and a visible banner while active.
- RISK-006: The feedback form adds a public write surface. Mitigation: signed-in only, length caps, rate limit, duplicate suppression, and no file uploads.
- RISK-007: Timezone-aware bucketing changes existing chart values. Mitigation: display the active timezone on every affected card and document the change in the plan.
- RISK-008: Palette search adds a query per keystroke. Mitigation: two-character minimum, 250 ms debounce, per-group caps, and a rate limit.
- RISK-009: Oversized scope for one version. Mitigation: the plan phases delivery into M0–M4 so each milestone is independently shippable.

## Research & Standards

- OWASP Foundation, *CSV Injection* — field quoting, doubled quotes, and neutralisation of `=`, `+`, `-`, `@`, tab, CR, LF, including the Excel-resistant tab-prefix note. Source: https://owasp.org/www-community/attacks/CSV_Injection
- W3C, *Web Content Accessibility Guidelines (WCAG) 2.1* — Level AA success criteria used by NFR-009. Source: https://www.w3.org/TR/WCAG21/
- No external research was available for product-specific dashboard IA; those decisions derive from the repository, the approved product overview, and the owner's answers.
