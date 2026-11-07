---
title: Admin Dashboard Update — Technical Plan
feature: admin-dashboard-update
version: v1
status: approved
created: 2026-10-20
updated: 2026-10-20
---

# Technical Plan — Admin Dashboard Update (v1)

## Approach

The console is rebuilt in place. There is no new application, no new server, and no new UI system. The work is sequenced so that every milestone can ship behind a feature flag and be reviewed on its own:

1. **Foundations first.** Add the schema, audit literals, authorization helpers, formatters, CSV serializer, filter contract, and shared panel states. Everything later depends on these, and none of them is visible to operators.
2. **Shell and command center second.** The shell is what makes the rest feel like one product; the dashboard is what makes it feel decision-ready.
3. **Analytics third.** The filter contract is the highest-risk piece because every chart, export, and report reads it. It ships before the new chart families.
4. **Operations fourth.** Export, reports, and health are read-only surfaces over data that already exists, plus one heartbeat table.
5. **Governance and feedback last.** Platform settings, broadcasts, and the feedback inbox are the only pieces that introduce new write paths into the public app. They ship with their role checks, rate limits, and audit entries already proven by the milestones before them.

Each Convex function is independently authorized. The client guard remains defense in depth only (CON-205, CON-511).

## Milestones

| Milestone | Phase | Outcome | Depends on |
|---|---|---|---|
| M0 — Foundations | P1 | Schema, audit, auth, formatters, CSV, filters, panel states, header, nav config | — |
| M1 — Shell + Command Center | P2 | Grouped navigation, page headers, Ctrl/Cmd+K palette, decision-ready dashboard | M0 |
| M2 — Analytics Workspace | P3 | Filtered, comparable analytics with six chart families and data tables | M0, M1 |
| M3 — Operations | P4 | CSV export everywhere, reports hub with print/PDF, system health | M0, M2 (export reads filters) |
| M4 — Governance + Feedback | P5 | Platform settings, maintenance mode, broadcasts, feedback inbox, settings cleanup | M0, M1 |
| M5 — Verification | P6 | Typecheck, lint, governance validation, manual accessibility and role passes | All |

## Anti-Redundancy Decisions

Everything below was checked against the repository before planning.

| Asset | Action | Reason |
|---|---|---|
| `components/AdminGuard.tsx` | **reuse** | Client role gate already redirects non-admins. |
| `components/AdminSidebar.tsx` | **modify** | Hard-coded flat list; add groups, `aria-current`, focus return, flag filtering. |
| `app/admin/layout.tsx` | **modify** | Add palette mount, focus restoration, and page-header slot. |
| `components/AdminAwareLayout.tsx` | **modify** | Add the maintenance gate around non-admin routes. |
| `components/admin/stat-card.tsx` | **modify** | Add delta, sparkline, and comparison window while keeping the existing API. |
| `components/admin/pagination.tsx` | **reuse** | Existing client pagination is adequate. |
| `components/admin/delete-*-modal.tsx`, `revoke-invite-modal.tsx`, `cancel-registration-modal.tsx` | **reuse** | Confirmation patterns already exist; typed confirmation is added only for maintenance and broadcast. |
| `components/ui/*` | **reuse** | `dialog`, `tabs`, `select`, `popover`, `calendar`, `table`, `badge`, `progress`, `tooltip`, `chart` cover the visual budget. No new UI package (CON-302). |
| `components/ui/chart.tsx` | **reuse** | `ChartContainer`/`ChartTooltip` already wrap Recharts. |
| `hooks/useConvexQuery.ts` | **reuse** | Query/mutation wrappers stay; errors are caught by panel-level boundaries because Convex throws into the React tree. |
| `lib/data.ts` (`CATEGORIES`) | **reuse** | Single source for category filter options. |
| `lib/location-utils.ts` | **reuse (read-only)** | Nigeria-only frontstore helper. Admin must NOT depend on it for country filtering; platform settings supply the default country. |
| `convex/helpers.ts` | **modify** | Add `requireSuperAdmin` and bounded search/pagination helpers next to `requireAdmin`. |
| `convex/audit.ts` | **modify** | Extend action/target unions and add date-range/target filters. |
| `convex/analytics.ts` | **modify** | Replace fixed-window queries with one filter resolver; keep existing query names where the shape is compatible. |
| `convex/admin.ts` | **modify** | Keep moderation mutations; split dashboard totals into command-center queries. |
| `convex/search.ts` | **reuse (partial)** | Public event search is unauthenticated and future-only. The palette gets its own admin query but reuses the `search_title` index. |
| `convex/settings.ts` | **modify** | Narrow the admin projection and stop returning attendee-only fields. |
| `convex/emails.ts` | **modify** | Extract a shared Resend send helper and add the announcement template; invite behaviour is preserved. |
| `convex/crons.ts` | **modify** | Add heartbeat writes and keep the invite-expiry job unchanged. |
| `convex/rateLimiter.ts` | **modify** | Add buckets; existing buckets are untouched. |
| `app/admin/dashboard/page.tsx` | **modify** | Recompose into independent panels. |
| `app/admin/analytics/page.tsx`, `components/admin/analytics-*.tsx` | **modify** | Filter bar, comparison, new charts, table alternatives. |
| `app/admin/{users,events,registrations,audit}/page.tsx` | **modify** | Add export action and shared page header only; moderation logic is untouched. |
| `app/admin/settings/page.tsx` | **modify** | Remove the Onboarding row; narrow the projection. |
| `app/admin/invites/page.tsx`, `app/admin/page.tsx`, `app/admin/signup/*` | **reuse** | No scope in this version. |
| `proxy.ts` | **reuse** | Clerk route protection and security headers stay as they are; maintenance mode is a render gate, not a middleware rewrite. |
| `app/api/generate-event/route.ts` | **reuse** | Unrelated to this feature. |

**Create**: `components/admin/page-header.tsx`, `components/admin/command-palette.tsx`, `components/admin/panel-state.tsx`, `components/admin/export-button.tsx`, `components/admin/filter-chips.tsx`, `components/admin/data-table-alt.tsx`, `components/admin/trend-card.tsx`, `components/maintenance-gate.tsx`, `lib/format.ts`, `lib/csv.ts`, `lib/analytics-filters.ts`, `lib/admin-nav.ts`, `convex/platform.ts`, `convex/announcements.ts`, `convex/feedback.ts`, `convex/health.ts`, `convex/commandCenter.ts`, `convex/analyticsFilters.ts`, `convex/exports.ts`, plus the five new `app/admin/*` route folders and the public feedback page.

**Do not create**: a second chart library, a second table system, a command-palette package, a CSV package, a state-management library, an HTTP API for admin data, or a parallel auth path.

## Convex Function Contracts

All functions below declare `convex/values` validators (CON-207) and call `requireAdmin` unless marked public. `requireSuperAdmin` is added in M0.

| Function | Auth | Args | Returns | Limit |
|---|---|---|---|---|
| `commandCenter.getTrends` | admin | `{ range }` | current/previous totals + 30-point sparkline per metric | analytics bucket |
| `commandCenter.getActionQueue` | admin | `{}` | counts + items for four queues | — |
| `commandCenter.getToday` | admin | `{}` | today's events with check-in progress | — |
| `admin.getRecentAudit` | admin | `{ limit }` | 10 latest audit entries | — |
| `admin.searchPalette` | admin | `{ query }` | typed groups: pages, users, events, registrations | search bucket |
| `analytics.getSummary` | admin | `filters` | current + previous metrics | analytics bucket |
| `analytics.getTimeSeries` | admin | `filters` | buckets for users, events, registrations, revenue | analytics bucket |
| `analytics.getBreakdown` | admin | `filters, dimension` | category/country/city/ticket/status/organizer counts | analytics bucket |
| `analytics.getFunnel` | admin | `filters` | registered, confirmed, checked-in + conversion | analytics bucket |
| `analytics.getCohorts` | admin | `filters` | new vs returning per cohort period | analytics bucket |
| `analytics.getHeatmap` | admin | `filters` | weekday × hour counts | analytics bucket |
| `exports.generate` | admin | `{ module, filters, columns }` | CSV text + row count + filename | export bucket |
| `reports.listEvents` | admin | `{ search?, page? }` | paged event options | — |
| `reports.getEventReport` | admin | `{ eventId }` | attendance, series, capacity, revenue | — |
| `health.getOverview` | admin | `{}` | cron runs, email failures, rate-limit hits, feedback age, config presence | — |
| `platform.getSettings` | admin | `{}` | settings or defaults | — |
| `platform.getPublicStatus` | **public** | `{}` | maintenance flag + message only | — |
| `platform.updateSettings` | **super_admin** | `{ settings }` | saved settings | settings bucket |
| `announcements.resolveAudience` | super_admin | `{ audience }` | count + sample recipients (masked) | broadcast bucket |
| `announcements.send` | **super_admin** | `{ subject, body, audience, confirmation }` | announcement id + counts | broadcast bucket |
| `announcements.list` | admin | `{ page? }` | announcements with counts | — |
| `feedback.submit` | signed-in user | `{ type, eventId?, message }` | id + status | feedback bucket |
| `feedback.list` | admin | `{ status?, type?, priority?, page? }` | paged records + counts | — |
| `feedback.update` | admin | `{ id, status?, priority?, note? }` | updated record | — |
| `settings.getMyProfile` | admin | `{}` | admin-relevant fields only | — |

Public surface is limited to `platform.getPublicStatus` and `feedback.submit`; both validate input and rate-limit where applicable.

## Data Model

### New entities

| Entity | Fields | Indexes |
|---|---|---|
| `platformSettings` | `key` (`"global"`), `defaultCountry`, `defaultCurrency`, `defaultTimezone`, `maintenanceMode`, `maintenanceMessage`, `featureFlags` (`commandPalette`, `reports`, `broadcasts`, `feedbackInbox`, `systemHealth`), `updatedBy`, `updatedAt` | `by_key` |
| `announcements` | `subject`, `body`, `audienceType`, `audienceEventId?`, `recipientCount`, `sentCount`, `failedCount`, `status` (`draft\|sending\|sent\|partial\|failed`), `createdBy`, `createdAt`, `sentAt?` | `by_createdAt`, `by_status` |
| `announcementDeliveries` | `announcementId`, `email`, `status` (`sent\|failed`), `error?`, `createdAt` | `by_announcement`, `by_status_createdAt` |
| `feedback` | `type` (`bug\|feature\|abuse\|other`), `eventId?`, `userId`, `userEmail`, `message`, `status` (`open\|in_review\|resolved\|dismissed`), `priority` (`low\|normal\|high`), `adminNotes` (array of `{authorId, authorName, body, createdAt}`), `createdAt`, `updatedAt`, `resolvedBy?`, `resolvedAt?` | `by_status_createdAt`, `by_type`, `by_event`, `by_user` |
| `emailEvents` | `template` (`invite\|announcement`), `recipient`, `status` (`sent\|failed`), `error?`, `createdAt` | `by_createdAt`, `by_status_createdAt` |
| `cronRuns` | `name`, `lastRunAt`, `status` (`success\|failed`), `error?`, `processed` | `by_name` |

### Modified entities

| Entity | Change |
|---|---|
| `auditLogs.action` | Add `settings.updated`, `announcement.sent`, `feedback.updated`, `feedback.deleted`, `export.generated`, `maintenance.changed` |
| `auditLogs.targetType` | Add `settings`, `announcement`, `feedback`, `export` |
| `users` | Add `by_createdAt` index |
| `registrations` | Add `by_registeredAt` and `by_event_status` indexes |
| `events` | No change; `by_startDate`, `by_category`, `by_organizer` cover filters |

### Migration and deployment order

1. Deploy `convex/schema.ts` with the new tables, indexes, and union literals. Convex validates existing documents against the schema, so this must come before code that writes the new literals.
2. Deploy the helper, audit, and rate-limit changes.
3. Deploy the new query modules.
4. Deploy UI. The platform settings document is created lazily on first save; reads fall back to defaults when absent (EC-016).

No data backfill is required. Existing audit rows use only pre-existing literals.

## Architecture by Module

### Shell and navigation

`lib/admin-nav.ts` exports a typed array of groups and items, each with `href`, `label`, `icon`, `group`, and optional `flag`. `AdminSidebar` renders it, filters flagged items through `platform.getSettings`, and applies `aria-current`. The layout keeps a ref to the drawer trigger and restores focus on close; route changes close the drawer through the existing pathname comparison, moved out of render into an effect-free derived state pattern that the file already uses.

### Command palette

`components/admin/command-palette.tsx` is a dialog built from the existing `components/ui/dialog.tsx`. It mounts once in `app/admin/layout.tsx`. A small hook owns the Ctrl/Cmd+K listener, 250 ms debounce, minimum length, and selection index. `admin.searchPalette` reuses the `search_title` index for events, the `by_token`-independent name/email scan for users (bounded to 5), and the `by_qrCode`/event join for registrations (bounded to 5). Pages are resolved on the client from `admin-nav.ts`; the server returns only data results. Role-dependent quick actions are filtered client-side and re-checked server-side on execution.

### Command center

`convex/commandCenter.ts` computes four independent payloads so the dashboard can render four independent panels; each panel is wrapped in `PanelErrorBoundary`. Trend cards compute a current window and an equal-length previous window. Sparklines reuse `Sparkline` drawn with Recharts `LineChart` at low height. Deltas come from `lib/format.ts`: when the previous value is 0 the delta is `"new"`, never `Infinity`.

The action queue is four bounded queries merged server-side: pending invites expiring within 48 hours, events where `registrationCount >= capacity`, feedback `open` older than 48 hours, and `emailEvents` failures in the last 24 hours. Each carries a count and a maximum of three preview items.

### Analytics

`convex/analyticsFilters.ts` owns the single validator:

```ts
export const analyticsFilterValidator = v.object({
  start: v.number(),
  end: v.number(),
  categories: v.optional(v.array(v.string())),
  countries: v.optional(v.array(v.string())),
  cities: v.optional(v.array(v.string())),
  ticketTypes: v.optional(v.array(v.union(v.literal("free"), v.literal("paid")))),
  organizerId: v.optional(v.id("users")),
  registrationStatus: v.optional(v.union(v.literal("confirmed"), v.literal("cancelled"))),
  checkIn: v.optional(v.union(v.literal("checked_in"), v.literal("not_checked_in"))),
  timezone: v.optional(v.string()),
});
```

`resolveAnalyticsScope(ctx, filters)` loads events through `by_startDate` when the range is bounded and filters them in memory only after the index narrows the set (category via `by_category` when a single category is selected). Registrations are loaded through `by_registeredAt` for time series and through `by_event_status` when an event set is already known. Every response includes `appliedFilters` and `rowCounts` (FR-017).

Time bucketing uses the platform timezone through `Intl.DateTimeFormat` with `timeZone`, not `toISOString()` (FR-044). The heatmap buckets by local weekday and hour.

Comparison (`includePrevious`) duplicates the range backwards by its exact length; the summary returns `{ current, previous, delta, deltaPct }`. `deltaPct` is `null` when `previous === 0`.

Cohorts define "returning" as an attendee whose first registration for any event predates the cohort period; the definition is rendered on the card (AC-014).

### Export

`lib/csv.ts` is pure and testable later:

- `serializeCsv(rows, columns)` → header + rows.
- Every field wrapped in double quotes; internal quotes doubled.
- A value starting with `=`, `+`, `-`, `@`, `\t`, `\r`, or `\n` is prefixed with a tab inside the quoted field, following OWASP's Excel-resistant guidance.
- `MAX_EXPORT_ROWS = 10_000`.

`convex/exports.ts#generate` authorizes, applies the same filter resolver as the visible view, enforces the cap, writes `export.generated` with module and row count, and returns the CSV plus filename. The client downloads through a `Blob` with `text/csv;charset=utf-8`. No server file storage is introduced.

### Reports

`reports.getEventReport` composes existing event/registration data into attendance counts, a check-in series, capacity utilisation, and revenue for paid events. The page renders print CSS via `@media print` in the route's own stylesheet: hide sidebar, header, and actions; show a report masthead with platform name, event, date, and "as of" timestamp. PDF is the browser's print-to-PDF; no PDF library is added.

### Platform settings

`platform.getSettings` reads the singleton `by_key("global")` and returns defaults when missing. `platform.updateSettings` requires `super_admin`, validates country via `country-state-city`, currency via `Intl.supportedValuesOf("currency")` (fallback list), and timezone via `Intl.supportedValuesOf("timeZone")` (fallback list), then writes an audit entry with a shallow before/after diff. `platform.getPublicStatus` is the only public read and returns `{ maintenanceMode, maintenanceMessage }`.

Feature flags are enforced twice: the nav filters flagged items, and each module's server query checks the flag and throws a typed "not enabled" error (EC-018).

Maintenance mode is a render gate: `components/maintenance-gate.tsx` sits in `AdminAwareLayout` outside `/admin`, subscribes to `getPublicStatus`, and renders the notice instead of children for non-admin visitors. Admins bypass through the existing role query. This avoids putting a Convex fetch in Clerk middleware and keeps `proxy.ts` untouched.

### Formatting and platform defaults

`lib/format.ts` is the only place that turns a number or timestamp into display text. It receives the platform settings once through a small client hook (`usePlatformSettings`) that reads `platform.getSettings`; every formatter takes `{ currency, timezone }` explicitly so no screen can hard-code `₦`, `NG`, or a browser-local guess (FR-027). Currency formatting uses `Intl.NumberFormat` with the configured ISO code, compact numbers use `notation: "compact"`, relative time uses `date-fns` `formatDistanceToNow`, and signed deltas return `"new"` when the previous window is zero (AC-005, AC-011).

Day bucketing and report labels use `Intl.DateTimeFormat` with the configured `timeZone`, never `toISOString()` (FR-044). Each aggregated panel renders an `asOf` timestamp formatted in that timezone plus the window it covers (FR-045). The active timezone is displayed next to every time-bucketed card so a change of default is observable rather than silent (EC-017).

### Settings cleanup

`app/admin/settings/page.tsx` deletes the `Onboarding` `InfoRow` and nothing else: profile identity, role, member-since, security actions, and notification preferences keep their positions, and the two-column layout is not reflowed (AC-033). `convex/settings.ts` narrows its admin projection so `hasCompletedOnboarding`, interests, and attendee location are not returned at all. When a field the page expects is absent, the page renders a degraded but truthful state ("Not available") instead of inventing "Pending" (AC-034).

### Broadcasts

`announcements.resolveAudience` expands one of four audiences:

| Audience | Source |
|---|---|
| `all` | `users` |
| `organizers` | users who own at least one event (`events.by_organizer` de-duplicated) |
| `event` | confirmed registrations for `audienceEventId`, de-duplicated by email |
| `admins` | users with role `admin` or `super_admin` |

It returns a count and up to five masked samples (`a***@domain`). `announcements.send` requires `super_admin`, a matching typed confirmation string, and the broadcast rate-limit bucket. It creates the announcement as `sending`, sends in batches of 50 through the shared Resend helper, writes one `announcementDeliveries` row per recipient, updates counts and status (`sent` or `partial`), and writes `announcement.sent`. Failures are never swallowed (EC-010).

### Feedback

`feedback.submit` is the only public write. It requires a signed-in identity, validates `type` and message length (10–2,000), rejects non-existent event IDs, suppresses an identical `(userId, type, eventId)` submission within 10 minutes, and consumes the feedback bucket. Reporter fields come from the server user record, never from the client.

`feedback.list` and `feedback.update` require admin. Updates append notes as immutable entries and set `resolvedBy`/`resolvedAt` on terminal states. Every change writes `feedback.updated` with the changed fields. If the target event no longer exists, `getEvent` returns `null` and the UI renders "target removed" (EC-011).

The public entry point is `app/(public)/feedback/page.tsx` with an optional `eventId` search param, plus a "Report this event" link on the event detail page. No file uploads.

### Health

`health.getOverview` reads `cronRuns`, aggregates `emailEvents` failures for 24 hours and 7 days, counts rate-limit rejections recorded by a lightweight counter table, computes the oldest open feedback age, and reports configuration presence using `Boolean(process.env.X)` only. Values are never returned (NFR-006). Each signal carries its window and an `asOf` timestamp.

Cron heartbeats are written by `convex/crons.ts` on completion and failure. Email sends write `emailEvents` from the shared helper.

## Security Expansion (CON-51x)

| Control | Requirement | Artifacts |
|---|---|---|
| CON-511 Authentication | NFR-001 | `requireAdmin`/`requireSuperAdmin` on every function; `feedback.submit` requires an identity |
| CON-512 Authorization | NFR-002 | Super-admin checks inside `platform.updateSettings`, `announcements.*`; client hiding is secondary |
| CON-513 Headers | N/A | No Express; `proxy.ts` headers remain unchanged |
| CON-514 Rate limiting | NFR-003 | New buckets in `convex/rateLimiter.ts`: `adminSearch`, `analytics`, `adminExport`, `broadcast`, `feedbackWrite` |
| CON-515 Validation | NFR-004 | Zod on every form; `convex/values` on every argument; filter validator shared |
| CON-516 Injection | N/A | No query strings |
| CON-517 XSS | NFR-005 | No `dangerouslySetInnerHTML`; feedback, notes, and announcement bodies render as text; CSV neutralised |
| CON-518 CSRF | N/A | Clerk-authenticated mutations |
| CON-519 Environment | NFR-006 | `Boolean(process.env.*)` only; `.env.example` updated if new keys are needed (none expected) |
| CON-520 HTTPS/HSTS | NFR-007 | Hosting layer unchanged |

## Performance Strategy

- **Indexes first.** Filtered windows use `users.by_createdAt`, `registrations.by_registeredAt`, `registrations.by_event_status`, `events.by_startDate`, `events.by_category`, and `events.by_organizer`. No filtered query may call `.collect()` on a whole table.
- **Bounded results.** Palette groups cap at 5, action queues at 3 previews, exports at 10,000 rows, list pages at 25.
- **One scope resolution.** Analytics resolves the event scope once per handler and derives every aggregation from it, so a page load does not scan the same table six times.
- **Independent panels.** A slow chart never blocks the summary; each panel has its own loading state.
- **Measured target.** p95 ≤ 1.5 s for filtered analytics and ≤ 1 s for the dashboard at 50k events / 500k registrations (NFR-008). If the target is missed, the documented next step is a daily aggregate table, not heavier client work.

## Accessibility and State Coverage

- Palette and all dialogs use the existing Radix-based dialog with labelled titles, focus trap, and focus return.
- Filter chips are real buttons with accessible names; charts expose a toggleable table alternative inside a `<figure>` with `<figcaption>`.
- Colour is never the only delta signal: an arrow glyph and `aria-label` accompany every delta.
- Every panel implements skeleton, empty, and error states through `PanelState`.
- All layouts are verified at 360px; wide tables scroll inside `TableContainer`.
- Motion is limited to opacity/transform and disabled under `prefers-reduced-motion`.

## Rollout and Feature Flags

Flags default to **on** for command palette, reports, feedback inbox, and system health, and **off** for broadcasts (sender reputation is the highest-risk surface). Admins can enable broadcasts from `/admin/platform` once the Resend domain is verified.

Deployment order per milestone: schema → server functions → UI → flag. M0 ships invisible; M1–M4 ship independently.

## Verification Plan

Test authoring and execution belong to `/sdrive:test` (CON-404 through CON-406). This plan deliberately contains no test tasks. Verification-phase tasks cover only:

- `npx tsc --noEmit`
- `npm run lint` with zero errors
- Governance validation (the Ajv 6/8 resolution issue documented in the handoff)
- Manual keyboard and screen-reader passes for palette, dialogs, filters, and chart tables
- Manual role matrix (user / admin / super_admin) against every new function
- Manual 360px and reduced-motion passes

## Risks

| Risk | Mitigation | Residual |
|---|---|---|
| RISK-001 analytics scale | Indexes, bounded windows, cap, aggregate-pipeline trigger documented | Medium at 10× current volume |
| RISK-002 broadcast reputation | Flag off by default, super-admin only, preview, typed confirmation, batches, delivery log | Medium |
| RISK-003 schema union change | Schema deployed before code; no backfill; exhaustive validator | Low |
| RISK-004 export PII | Visible columns only, admin-only, cap, rate limit, audit | Low |
| RISK-005 maintenance lockout | Admin bypass, typed confirmation, audit, banner | Low |
| RISK-006 feedback spam | Signed-in only, length caps, duplicate suppression, rate limit | Low |
| RISK-007 timezone change | Display active timezone, document behaviour change on cards | Low |
| RISK-008 palette load | 2-char minimum, 250 ms debounce, caps, rate limit | Low |
| RISK-009 scope size | Five independently shippable milestones | Medium if compressed |

## Next.js Notes

Per CON-705, implementation must read the bundled guides before touching routing, data fetching, caching, error handling, or route handlers: `node_modules/next/dist/docs/` — layouts/pages, fetching data, caching, error handling, and proxy. The plan intentionally avoids new server-side caching APIs; the maintenance gate is a client render gate, and route folders follow the existing App Router structure.

## Open Decisions Resolved

- **Settings vs platform**: platform configuration is its own page under Governance, not a Settings tab, because the two have different audiences (self vs platform).
- **Broadcast default**: off until Resend domain verification, to protect sender reputation.
- **PDF**: browser print-to-PDF, not a PDF library.
- **Currency list**: `Intl.supportedValuesOf` with a small fallback constant; no new dependency.
