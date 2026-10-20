---
title: Admin Dashboard Update — Execution Tasks
feature: admin-dashboard-update
version: v1
status: approved
created: 2026-10-20
updated: 2026-10-20
---

# Execution Tasks: Admin Dashboard Update

> 54 production-code and verification tasks across six phases. Test authoring and
> execution belong to `/sdrive:test`; the verification phase runs only the
> typechecker, the linter, governance validation, and manual checks.

## Milestone map

| Milestone | Phase | Outcome |
|---|---|---|
| M0 — Foundations | P1 | Schema, audit, auth, formatters, CSV, filters, panel states, header, nav config |
| M1 — Shell + Command Center | P2 | Grouped navigation, page headers, Ctrl/Cmd+K palette, decision-ready dashboard |
| M2 — Analytics Workspace | P3 | Filtered, comparable analytics with six chart families and data tables |
| M3 — Operations | P4 | CSV export everywhere, reports hub with print/PDF, system health |
| M4 — Governance + Feedback | P5 | Platform settings, maintenance mode, broadcasts, feedback inbox, settings cleanup |
| M5 — Verification | P6 | Typecheck, lint, governance validation, manual accessibility and role passes |

## P1 — Foundations

- [x] **T1.1** Extend the Convex schema with new tables, indexes, and audit literals.
  - Linked: FR-039, FR-042, NFR-016, AC-022, AC-025, AC-028
  - Add platformSettings, announcements, announcementDeliveries, feedback, emailEvents, and cronRuns tables with their indexes; add settings, announcement, feedback, and export targetType literals plus the six new audit action literals; add users.by_createdAt, registrations.by_registeredAt, and registrations.by_event_status. Deploy this schema before any code that writes the new literals.
- [x] **T1.2** Add requireSuperAdmin and enforce server-side authorization in new functions.
  - Linked: FR-040, NFR-001, NFR-002, NFR-004, AC-022, AC-025, AC-027
  - Add requireSuperAdmin beside requireAdmin in convex/helpers.ts, document the rule that every new function declares convex/values arguments and calls requireAdmin or requireSuperAdmin, and add the bounded search and pagination helpers reused by palette, feedback, and reports.
- [x] **T1.3** Extend the audit module with new literals and date-range filters.
  - Linked: FR-039, NFR-015, AC-022, AC-025, AC-028
  - Widen the action and target unions in convex/audit.ts, add date-range and target filters used by the audit page and the dashboard recent list, and keep logAdminAction the single write path for administrative mutations.
- [x] **T1.4** Add rate-limit buckets with retry hints.
  - Linked: NFR-003, AC-017, AC-025, AC-027
  - Add adminSearch, analytics, adminExport, broadcast, feedbackWrite, and feedback-submit buckets to convex/rateLimiter.ts, leaving existing buckets untouched, and return a retry hint on rejection so the UI can state when to try again.
- [x] **T1.5** Build the shared formatting module.
  - Linked: FR-027, FR-041, FR-044, FR-045, AC-005, AC-011, AC-019
  - Create lib/format.ts with currency, compact number, percentage, relative time, signed delta, and timezone-aware day bucketing. A zero or missing baseline renders "new" or "no change", never NaN or Infinity. Currency and timezone are parameters supplied from platform settings.
- [x] **T1.6** Build the OWASP-compliant CSV serializer.
  - Linked: FR-019, NFR-005, NFR-013, AC-017
  - Create lib/csv.ts as a pure serializer: header plus rows, every field quoted, internal quotes doubled, leading = + - @ tab CR LF neutralised with a tab prefix, and an exported MAX_EXPORT_ROWS of 10000. No CSV package is added.
- [x] **T1.7** Define the shared analytics filter contract and scope resolver.
  - Linked: FR-011, FR-013, FR-017, FR-042, NFR-008, AC-008, AC-009, AC-010
  - Create lib/analytics-filters.ts with the client filter model, presets, URL serialization, and the 730-day clamp, and convex/analyticsFilters.ts with the single analyticsFilterValidator plus resolveAnalyticsScope. The resolver narrows events and registrations through indexes, runs once per handler, and returns appliedFilters and rowCounts.
- [x] **T1.8** Create shared panel states and a local error boundary.
  - Linked: FR-043, NFR-011, AC-007, AC-032
  - Create components/admin/panel-state.tsx with skeletons shaped like the final layout, empty and error states with retry, and a PanelErrorBoundary that contains a failing Convex query to its own panel because Convex throws into the React tree.
- [x] **T1.9** Create the shared page header component.
  - Linked: FR-003, NFR-010, AC-002
  - Create components/admin/page-header.tsx with title, one-sentence description, breadcrumb, and an optional primary-action slot that wraps without horizontal scrolling at 360px.
- [x] **T1.10** Create the single admin navigation configuration.
  - Linked: FR-001, FR-026, AC-001, AC-021
  - Create lib/admin-nav.ts with typed groups for Overview, Audience, Events, Operations, Governance, and Personal, each item carrying href, label, icon, group, and an optional feature flag key. This is the only source of admin destinations.

## P2 — Shell and command center

Depends on: P1.

- [x] **T2.1** Rebuild the sidebar from the navigation configuration.
  - Linked: FR-001, FR-002, AC-001
  - Render lib/admin-nav groups, filter flagged items through platform settings, mark the active route with aria-current, close the drawer on route change, and restore focus to the drawer trigger without regressing the existing responsive behaviour.
- [x] **T2.2** Apply the shared page header across every admin page.
  - Linked: FR-003, NFR-010, AC-002
  - Add the header slot to app/admin/layout.tsx and give dashboard, analytics, users, events, registrations, invites, audit, and settings their title, purpose, breadcrumb, and primary action.
- [x] **T2.3** Mount the command palette and own its keyboard lifecycle.
  - Linked: FR-004, FR-006, AC-003
  - Mount one palette instance in app/admin/layout.tsx, add the Ctrl/Cmd+K listener that respects focused text fields, trap focus while open, close on Esc, return focus to the invoking element, and expose role-permitted quick actions.
- [x] **T2.4** Build the palette dialog with grouped results and states.
  - Linked: FR-004, FR-005, FR-006, NFR-009, NFR-011, AC-003, AC-004
  - Build components/admin/command-palette.tsx from components/ui/dialog: labelled input, 250 ms debounce, two-character minimum, grouped Pages, Users, Events, and Registrations sections, arrow and Enter navigation, a query-naming empty state, and an inline retry on failure.
- [x] **T2.5** Add the admin-authorized palette search query.
  - Linked: FR-005, NFR-003, AC-003, AC-004
  - Add admin.searchPalette: authorize with requireAdmin, reject queries under two characters, reuse events.search_title, bound user name/email matching to five, bound registration lookup to five through the event join, consume the adminSearch bucket, and return a typed result union.
- [x] **T2.6** Add command-center trend queries and trend cards.
  - Linked: FR-007, FR-014, FR-041, AC-005
  - Create convex/commandCenter.ts#getTrends returning current and previous totals plus a 30-point sparkline per metric, and components/admin/trend-card.tsx with the named comparison window, a direction indicator that is not colour-only, an aria-label, and a Recharts sparkline.
- [x] **T2.7** Add the action queue, today at a glance, and recent audit panels.
  - Linked: FR-008, FR-009, FR-045, AC-006, AC-007
  - Add getActionQueue (expiring invites, at-capacity events, feedback older than 48 hours, failed deliveries, each with a count and three previews), getToday (today's events with check-in progress), and getRecentAudit (ten entries with actor and relative time), then render them with links to their modules and an as-of label.
- [x] **T2.8** Recompose the dashboard into independently fetching panels.
  - Linked: FR-010, FR-043, NFR-011, AC-007, AC-032
  - Split app/admin/dashboard/page.tsx into four panels, each with its own query, loading skeleton, empty state, and PanelErrorBoundary, so one slow or failing block never blanks the page.

## P3 — Analytics workspace

Depends on: P1, P2.

- [x] **T3.1** Add URL-encoded filter state with presets and custom ranges.
  - Linked: FR-012, AC-008
  - Wire lib/analytics-filters.ts into the analytics page: 7/30/90/365 presets, react-day-picker custom range, URL encoding that survives reload and back/forward, and one filter set driving every card and chart.
- [x] **T3.2** Build the filter bar, chips, and range validation.
  - Linked: FR-011, FR-013, AC-009, AC-010
  - Add category, country, city, ticket type, organizer, registration status, and check-in controls; render active filters as removable chips plus Clear all; reject start-after-end and spans over 730 days inline while keeping the last valid query.
- [x] **T3.3** Add the summary query with previous-period comparison.
  - Linked: FR-014, FR-017, AC-011
  - Replace the fixed-window analytics summary with a filter-aware getSummary that duplicates the range backwards by its exact length and returns current, previous, absolute delta, and a nullable percentage delta plus appliedFilters and rowCounts.
- [x] **T3.4** Add time-series and revenue-split charts.
  - Linked: FR-015, AC-013
  - Add filter-aware getTimeSeries for users, events, registrations, and revenue, including a free/paid revenue split, bucketed by the platform timezone and rendered as a ghost series when comparison is on.
- [x] **T3.5** Add the registration funnel, check-in trend, and capacity utilisation.
  - Linked: FR-015, AC-013
  - Add getFunnel for registered, confirmed, and checked-in steps with step conversion, a check-in rate over time, and a capacity-utilisation distribution for the filtered event set.
- [x] **T3.6** Add cohort and retention analysis.
  - Linked: FR-015, AC-014
  - Add getCohorts returning new versus returning attendees per cohort period, define "returning" as a first registration predating the cohort period, state that definition on the card, and show the minimum-data requirement instead of empty axes.
- [x] **T3.7** Add the weekday by hour registration heatmap.
  - Linked: FR-015, FR-044, AC-013
  - Add getHeatmap bucketing registrations by local weekday and hour in the platform timezone, with an accessible legend and the active timezone displayed on the card.
- [x] **T3.8** Add dimension breakdown charts.
  - Linked: FR-015, FR-017, AC-009, AC-013
  - Add getBreakdown for category, country, city, ticket type, status, and organizer, replacing the existing category and city charts while keeping filter context in every response.
- [x] **T3.9** Wrap every chart in a card with a data-table alternative.
  - Linked: FR-016, NFR-009, NFR-011, AC-015
  - Create the chart card shell with title, one-line interpretation, skeleton, and empty state, plus components/admin/data-table-alt.tsx inside a figure with figcaption so each chart's numbers are keyboard-reachable as text.
- [x] **T3.10** Add the comparison toggle and delta rendering.
  - Linked: FR-014, FR-041, AC-011, AC-012
  - Add a session-persisted comparison toggle that hides deltas and ghost series when off, and render current, previous, absolute delta, percentage delta, and a non-colour direction indicator when on.

## P4 — Operations: export, reports, and health

Depends on: P1, P3.

- [x] **T4.1** Build the export trigger with progress and toasts.
  - Linked: FR-018, FR-020, AC-018
  - Create components/admin/export-button.tsx: show progress while generating, reject repeat clicks, download the returned CSV as a Blob with text/csv;charset=utf-8, raise success or failure toasts, and name the failure reason without a stack trace.
- [x] **T4.2** Add the server-side CSV export mutation.
  - Linked: FR-018, FR-019, FR-020, NFR-013, NFR-015, AC-016, AC-017
  - Create convex/exports.ts#generate: authorize with requireAdmin, apply the same resolver as the visible view, accept only visible columns, enforce the 10000-row cap with a narrower-filter message, write export.generated with module and row count, consume the adminExport bucket, and return CSV text plus filename.
- [x] **T4.3** Wire export into every list and analytics view.
  - Linked: FR-018, NFR-013, AC-016
  - Add the export action to users, events, registrations, audit, and analytics with visible-column definitions and the <module>-<yyyy-MM-dd>.csv filename, leaving moderation logic untouched.
- [x] **T4.4** Build the reports hub event list.
  - Linked: FR-021, AC-019
  - Add reports.listEvents with bounded search and pagination, and create app/admin/reports/page.tsx listing selectable events with date, organizer, and registration count.
- [x] **T4.5** Add the per-event report query and view.
  - Linked: FR-021, FR-044, FR-045, AC-019
  - Add reports.getEventReport composing attendance (confirmed, checked in, no-show, cancelled), a check-in series, capacity utilisation, and paid-event revenue, then render it with an as-of timestamp, timezone-aware labels, and a zeros-plus-explanation state for events with no registrations.
- [x] **T4.6** Add report CSV export and the print stylesheet.
  - Linked: FR-022, AC-020
  - Reuse the export path for the report and add route-scoped print CSS that hides the sidebar, header, and actions while showing a masthead with platform name, event, date, and as-of timestamp. PDF is the browser's print-to-PDF.
- [x] **T4.7** Add health queries, cron heartbeats, and email event logging.
  - Linked: FR-036, FR-037, NFR-006, AC-030, AC-031
  - Create convex/health.ts#getOverview for cron recency and status, 24-hour and 7-day email failures, rate-limit rejections, open-feedback age, and Boolean-only configuration presence; write cronRuns heartbeats from convex/crons.ts and emailEvents from the shared send helper.
- [x] **T4.8** Build the system health page with per-card windows.
  - Linked: FR-036, FR-037, FR-045, NFR-006, NFR-011, AC-030, AC-031, AC-032
  - Create app/admin/health/page.tsx with one card per signal, each stating its window and timestamp, isolated error and retry state, and configuration labels that never print a value.

## P5 — Governance and feedback

Depends on: P1, P2.

- [ ] **T5.1** Add platform settings queries with a safe singleton read.
  - Linked: FR-023, FR-024, NFR-002, NFR-004, NFR-015, AC-021, AC-022
  - Create convex/platform.ts: getSettings reads by_key("global") and falls back to USD/UTC defaults when absent, updateSettings requires super_admin, validates country through country-state-city, currency and timezone through Intl.supportedValuesOf with fallback lists, and writes settings.updated with a shallow before/after diff. getPublicStatus returns only the maintenance flag and message.
- [ ] **T5.2** Build the platform settings page.
  - Linked: FR-023, FR-024, FR-025, NFR-004, AC-021, AC-022, AC-023
  - Create app/admin/platform/page.tsx with a Zod-validated form for default country, currency, timezone, and the five feature flags, a read-only view for non-super-admins, and typed confirmation before enabling maintenance mode.
- [ ] **T5.3** Add the maintenance render gate outside the admin segment.
  - Linked: FR-025, AC-023
  - Create components/maintenance-gate.tsx, mount it in AdminAwareLayout around non-admin routes, subscribe to getPublicStatus, render the notice for signed-out and non-admin visitors, let admins bypass through the existing role query, and leave proxy.ts and Clerk middleware untouched.
- [ ] **T5.4** Enforce feature flags in navigation and on the server.
  - Linked: FR-026, AC-021
  - Filter flagged destinations through platform settings in the sidebar, render a "not enabled" state for a direct URL hit, and have each flagged module's server query reject with a typed not-enabled error.
- [ ] **T5.5** Adopt platform defaults in every formatter and panel label.
  - Linked: FR-027, FR-041, FR-044, FR-045, AC-019, AC-021
  - Add the client platform-settings hook and pass currency and timezone into lib/format.ts everywhere, remove any remaining hard-coded naira or Nigeria assumptions from admin screens, and surface the active timezone on time-bucketed cards and reports.
- [ ] **T5.6** Extract the shared Resend helper and email delivery log.
  - Linked: FR-036, NFR-015, AC-026, AC-030
  - Refactor convex/emails.ts into a shared send helper that writes an emailEvents row per attempt and supports the plain-text announcement template, preserving the existing invite behaviour, and keep cron heartbeats writing on both success and failure.
- [ ] **T5.7** Add broadcast audience resolution and sending.
  - Linked: FR-028, FR-029, FR-030, NFR-002, NFR-003, NFR-015, AC-024, AC-025, AC-026
  - Create convex/announcements.ts: resolveAudience counts and returns up to five masked samples for all users, organizers, one event's confirmed registrations de-duplicated by email, and admins; send requires super_admin, a matching typed confirmation, and the broadcast bucket, creates the record as sending, sends in batches of 50, writes one delivery row per recipient, updates counts and a sent or partial status, and writes announcement.sent.
- [ ] **T5.8** Build the broadcast composer.
  - Linked: FR-028, FR-029, NFR-004, NFR-009, AC-024, AC-025
  - Create the announcements page composer: audience selector with a resolved recipient count, masked sample preview, subject and body preview, send disabled at zero recipients, and typed confirmation before sending.
- [ ] **T5.9** Add the announcements history list.
  - Linked: FR-030, FR-031, AC-026
  - Render announcements with status, audience, recipient, sent and failed counts, author, and timestamp, so a partial failure is never presented as a success.
- [ ] **T5.10** Add feedback submission and the public feedback page.
  - Linked: FR-032, NFR-003, NFR-004, NFR-005, AC-027
  - Create convex/feedback.ts#submit requiring a signed-in identity, a validated type, a 10-2000 character message, an existing event when supplied, duplicate suppression per user, type, and event within 10 minutes, and the feedback bucket. Create app/(public)/feedback/page.tsx with an optional eventId parameter and a Report this event link, rendering all user content as text with no file uploads.
- [ ] **T5.11** Add the feedback inbox queries, mutations, and audited deletion.
  - Linked: FR-033, FR-034, NFR-015, NFR-016, AC-028
  - Add feedback.list with status, type, and priority filters plus counts, and feedback.update appending immutable notes, stamping resolvedBy and resolvedAt on terminal states, writing feedback.updated on every change, and writing feedback.deleted before an explicit deletion. Records are never auto-purged.
- [ ] **T5.12** Build the feedback inbox interface.
  - Linked: FR-033, FR-035, NFR-005, NFR-011, AC-028, AC-029
  - Create app/admin/feedback/page.tsx with filterable list, detail view, note composer, status and priority controls, target navigation, the target removed label when the event is gone, and text-only rendering of user content.
- [ ] **T5.13** Remove attendee concepts from admin settings.
  - Linked: FR-038, AC-033, AC-034
  - Delete the Onboarding InfoRow from app/admin/settings/page.tsx without reflowing the two-column layout, narrow the admin projection in convex/settings.ts so onboarding, interests, and attendee location are never returned, and render a truthful degraded state instead of inventing Pending.

## P6 — Verification

Depends on: P1, P2, P3, P4, P5.

- [ ] **T6.1** Run the typechecker.
  - Linked: NFR-014, AC-001
  - Run npx tsc --noEmit and resolve every error introduced by the feature.
- [ ] **T6.2** Run the linter.
  - Linked: NFR-014, AC-001
  - Run npm run lint and reach zero errors without disabling rules to hide feature code.
- [ ] **T6.3** Validate SpecDrive governance.
  - Linked: NFR-014, AC-001
  - Run node .sdrive/scripts/validate-governance.js against the new spec, plan, tasks, and traceability, using the documented Ajv 8 resolution if the root install still exposes Ajv 6.
- [ ] **T6.4** Run the manual accessibility, responsive, and motion pass.
  - Linked: NFR-009, NFR-010, NFR-012, AC-002, AC-003, AC-015
  - Keyboard and screen-reader pass over the palette, dialogs, filters, and every chart table; 360px check on every new screen; reduced-motion check for opacity and transform transitions.
- [ ] **T6.5** Run the manual role and baseline-control matrix.
  - Linked: NFR-001, NFR-002, NFR-007, AC-022, AC-025, AC-028
  - Exercise user, admin, and super_admin against every new function, confirming client gating is never the only control and that proxy.ts, security headers, and transport enforcement are unchanged.
