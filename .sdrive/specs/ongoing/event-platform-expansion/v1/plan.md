# Plan: Event Platform Expansion (v1)

## Architecture Summary

This feature is one branch carrying five product items because they share the
event record, the registration record, the public event route, and the organizer
event surface. The implementation is additive: every new field is optional, every
new surface falls back to platform defaults for legacy rows, and no destructive
backfill is required.

The work is sequenced so each layer can be reviewed independently:

1. Add the schema, shared validators, locale/currency constants, authorization
   helper, and rate-limit buckets.
2. Make the public event page server-rendered for metadata, add the generated
   Open Graph image and JSON-LD, then add sponsor persistence and UI.
3. Build the indexed door snapshot and attendee search, extend check-in outcomes,
   add the offline queue/sync mutation, and then the door-mode UI plus PWA shell.
4. Isolate Google Wallet behind a server-only provider, add idempotent issuance
   and void/expire, then add the ticket control and unavailable-Apple state.
5. Add versioned custom question definitions, answer validation/storage, the
   organizer builder, the attendee form, and dynamic CSV columns.
6. Add platform locale/currency settings, event currency/location/timezone,
   migrate all event surfaces to event-aware formatting, and localize UI/system
   email in English and French.
7. Run formatter, linter, typecheck, governance validation, `sdrive verify`, and
   manual responsive/keyboard/French checks. Testing is handed to `/sdrive:test`.

No new runtime dependency is planned. Google Wallet uses the REST API through
server-side `fetch` and Node `crypto` for service-account and save-JWT signing.
PWA offline support uses raw IndexedDB, a service worker, and the web app
manifest. English/French uses typed dictionaries and a cookie, not an i18n
package.

## Existing Asset Reuse

| Existing asset | Decision | Why |
|---|---|---|
| `convex/events.ts` | modify | `createEvent` and `getEventBySlug` already exist; extend them with the new event fields and a focused settings mutation. |
| `convex/registrations.ts` | modify | `registerForEvent`, `cancelRegistration`, and `checkInAttendee` already own the registration/check-in lifecycle. |
| `convex/exports.ts` + `lib/csv.ts` | modify | The existing export pipeline already escapes CSV; add dynamic question columns there. |
| `lib/format.ts` | modify | Reuse the existing currency/date formatters; add an event-aware context instead of a second formatter. |
| `convex/platformData.ts` + `convex/platform.ts` | modify | The platform settings singleton and defaults already exist; add `defaultLocale` and currency validation. |
| `convex/helpers.ts` | modify | `secureQuery`/`secureMutation` already enforce Clerk auth; add one event-ownership helper for the new surfaces. |
| `convex/rateLimiter.ts` | modify | Add buckets to the existing limiter instead of a second rate-limit mechanism. |
| `country-state-city` | reuse | Already installed and used by the product; no new location package. |
| `next/og` (`ImageResponse`) | reuse | Built into Next.js 16; no external OG service. |
| Convex file storage | reuse | Sponsor logo uploads use the existing upload URL/storage path. |
| `app/(public)/events/[slug]/page.tsx` | modify | Keep the URL and interactive behavior; split the server metadata wrapper from the client body. |
| `app/(main)/my-events/[eventId]/page.tsx` | modify | Add the door entry point and settings links; do not duplicate the organizer dashboard. |
| `convex/audit.ts` + `auditLogs` | modify | Reuse the audit log for wallet, sponsor, question, and settings changes. |

## Components

| Component | Action | Responsibility | Requirements |
|---|---|---|---|
| `convex/schema.ts` | modify | Additive event/registration/settings fields, indexes, audit unions. | FR-004, FR-009, FR-016, FR-020, FR-025, FR-026, NFR-010 |
| `convex/validators.ts` | create | Shared validators, currency/locale/question-type constants, sponsor/offline limits. | FR-020, FR-025, FR-026, NFR-006 |
| `convex/platformData.ts` | modify | Supported currency/locale constants and defaults. | FR-025, FR-026 |
| `convex/helpers.ts` | modify | Event-organizer authorization helper; no duplicate auth mechanism. | FR-008, NFR-001 |
| `convex/rateLimiter.ts` | modify | Wallet, door-sync, and question/sponsor buckets. | NFR-005 |
| `lib/i18n/index.ts` | create | Locale resolution and typed dictionary access. | FR-029, FR-030, FR-031 |
| `lib/i18n/en.ts`, `lib/i18n/fr.ts` | create | English/French copy for changed surfaces and system email. | FR-029, FR-031, NFR-011 |
| `lib/event-format.ts` | create | Event-aware currency/date/timezone formatting on top of `lib/format.ts`. | FR-027, FR-028 |
| `lib/offline/db.ts` | create | IndexedDB snapshot, queue, and metadata stores. | FR-009, FR-010, FR-012 |
| `lib/offline/sync.ts` | create | Queue replay, retry, and conflict marking. | FR-011, NFR-004 |
| `app/manifest.ts` | create | PWA manifest for installability. | FR-013 |
| `public/sw.js` | create | Versioned app-shell cache; never caches Convex/API JSON. | FR-013, NFR-012 |
| `components/locale-provider.tsx` | create | Client locale context and persistence. | FR-029 |
| `app/layout.tsx` | modify | `metadataBase` and locale provider mount. | FR-001, FR-029 |
| `app/(public)/events/[slug]/page.tsx` | modify | Server wrapper with `generateMetadata`. | FR-001 |
| `app/(public)/events/[slug]/event-detail.tsx` | create | Existing interactive event body moved behind the server wrapper. | FR-001 |
| `app/(public)/events/[slug]/opengraph-image.tsx` | create | 1200×630 `ImageResponse` with fallback. | FR-002 |
| `app/(public)/events/[slug]/_components/event-json-ld.tsx` | create | Escaped `schema.org/Event` JSON-LD. | FR-003 |
| `app/(public)/events/[slug]/_components/sponsor-strip.tsx` | create | Public ordered sponsor logos. | FR-004 |
| `app/(public)/events/[slug]/_components/register-modal.tsx` | modify | Custom questions, privacy note, locale-aware copy. | FR-021, FR-024 |
| `convex/events.ts` | modify | Create/settings mutation for sponsors, questions, currency, country, timezone, wallet/door flags. | FR-004, FR-005, FR-020, FR-022, FR-026 |
| `app/(main)/create-event/page.tsx` | modify | Currency, full country/state/city, timezone, sponsor and question setup. | FR-005, FR-020, FR-026 |
| `app/(main)/my-events/[eventId]/page.tsx` | modify | Door entry point and focused settings links. | FR-006, FR-020 |
| `app/(main)/my-events/[eventId]/door/page.tsx` | create | Dedicated door-mode route. | FR-006, FR-007 |
| `app/(main)/my-events/[eventId]/_components/door-dashboard.tsx` | create | Live counters, recent check-ins, scanner/manual search. | FR-006, FR-007, FR-008 |
| `app/(main)/my-events/[eventId]/_components/offline-controls.tsx` | create | Cache opt-in, age/count, queue status, clear action. | FR-009, FR-012 |
| `app/(main)/my-events/[eventId]/_components/sponsor-editor.tsx` | create | Add/reorder/remove sponsors with validation. | FR-005 |
| `app/(main)/my-events/[eventId]/_components/question-builder.tsx` | create | Add/edit/reorder/archive questions and preview. | FR-020, FR-022 |
| `convex/door.ts` | create | Snapshot, attendee search, batch offline sync. | FR-006, FR-007, FR-011 |
| `convex/registrations.ts` | modify | Answers, wallet state, locale, distinct check-in outcomes. | FR-016, FR-017, FR-021 |
| `convex/wallet.ts` | create | Public issue/void mutations with eligibility and rate limits. | FR-014, FR-015, FR-017, FR-018 |
| `convex/walletNode.ts` | create | Server-only Google Wallet provider, OAuth token, save JWT, REST calls. | FR-014, FR-015, NFR-002 |
| `convex/lifecycleTemplates.ts` | modify | English/French lifecycle email copy. | FR-029, FR-031 |
| `convex/lifecycleEmails.ts` | modify | Select locale from the registration snapshot. | FR-029 |
| `convex/exports.ts` | modify | Dynamic question columns, archived labels, stable order. | FR-023 |
| `convex/platform.ts` | modify | `defaultLocale` and supported-currency validation. | FR-025 |
| `app/admin/settings/page.tsx` | modify | Locale/currency defaults with validation. | FR-025 |
| `app/(main)/my-tickets/page.tsx` | modify | Google Wallet control, answers, event timezone/locale. | FR-015, FR-019, FR-024 |
| `convex/audit.ts` | modify | Wallet/sponsor/question/settings action unions and logging. | NFR-013 |

## Data Model

All fields are additive and optional. Existing rows keep working with platform
defaults; there is no required backfill.

### `events` (update)

| Field | Type | Action | Notes |
|---|---|---|---|
| `currency` | `string` | add | ISO 4217; new writes limited to NGN/USD/GBP/EUR. |
| `countryCode` | `string` | add | ISO 3166-1 alpha-2; existing `country` display string remains. |
| `sponsors` | `array<object>` | add | Max 6; `{ id, name, logoStorageId, url?, alt, order }`. |
| `registrationQuestions` | `array<object>` | add | Max 10 active; versioned definitions with `archived`. |
| `walletEnabled` | `boolean` | add | Per-event Google Wallet eligibility. |
| `doorModeEnabled` | `boolean` | add | Per-event door-mode availability. |

### `registrations` (update)

| Field | Type | Action | Notes |
|---|---|---|---|
| `answers` | `array<object>` | add | `{ questionId, value }`; value is string, number, or string[]. |
| `wallet` | `object` | add | `{ provider: "google", objectId, status, issuedAt?, updatedAt?, lastError? }`. |
| `locale` | `string` | add | Locale captured at registration for system email. |
| `offlineScannedAt` | `number` | add | Device capture time for audit; `checkedInAt` is server receipt time. |
| `by_event_checkedIn` | `index(eventId, checkedIn)` | add | Door counts. |
| `by_event_checkedInAt` | `index(eventId, checkedInAt)` | add | Recent check-ins. |
| `search_attendee` | `searchIndex(attendeeName, filter eventId)` | add | Door attendee search. |

### `platformSettings` (update)

| Field | Type | Action | Notes |
|---|---|---|---|
| `defaultLocale` | `string` | add | `en` or `fr`; absent means `en`. |
| `defaultCurrency` | `string` | no_change | Existing field; new writes validated against the four supported currencies. |

### `auditLogs` (update)

| Field | Type | Action | Notes |
|---|---|---|---|
| `action` | `union` | modify | Add `wallet.issued`, `wallet.voided`, `event.sponsors_updated`, `event.questions_updated`. |
| `targetType` | `union` | no_change | Existing `event` and `registration` are sufficient. |

**Flow:** schema deploys first; reads fall back to platform defaults. The public
event page queries `getEventBySlug`; door queries use `by_event_checkedIn`,
`by_event_checkedInAt`, and `search_attendee`; wallet state lives on the
registration row; question definitions live on the event row and are versioned on
edit; exports read current and archived definitions to build stable columns. No
new table is required for offline data; IndexedDB owns the device-local snapshot
and queue.

## API Contracts

| Method | Path | Action | Auth | Requirements |
|---|---|---|---|---|
| GET | `app/(public)/events/[slug]/page` | modify | no | FR-001 |
| GET | `app/(public)/events/[slug]/opengraph-image` | create | no | FR-002 |
| GET | `convex/events:getEventBySlug` | reuse | no | FR-001, FR-003 |
| POST | `convex/events:createEvent` | modify | yes | FR-020, FR-026 |
| POST | `convex/events:updateEventSettings` | create | yes | FR-004, FR-005, FR-020, FR-022, FR-026 |
| GET | `convex/door:getDoorSnapshot` | create | yes | FR-006 |
| GET | `convex/door:searchDoorAttendees` | create | yes | FR-007 |
| POST | `convex/door:syncOfflineCheckIns` | create | yes | FR-011 |
| POST | `convex/registrations:checkInAttendee` | modify | yes | FR-007 |
| POST | `convex/registrations:registerForEvent` | modify | yes | FR-021, FR-024 |
| POST | `convex/registrations:cancelRegistration` | modify | yes | FR-017 |
| POST | `convex/wallet:issueWalletPass` | create | yes | FR-014, FR-015 |
| POST | `convex/wallet:voidWalletPass` | create | yes | FR-017 |
| POST | `convex/walletNode:issueGooglePass` | create | no | FR-014, FR-015 |
| POST | `convex/exports:generate` | modify | yes | FR-023 |
| POST | `convex/platform:updateSettings` | modify | yes | FR-025 |
| GET | `convex/platform:getOptions` | modify | yes | FR-025 |

## Key Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-001 | One feature, one branch, five product items | CON-606/607 require one branch per feature; the five items share the event/registration spine. |
| D-002 | Add a focused `updateEventSettings` mutation, not general event editing | Sponsors/questions/currency need a post-create surface, but title/date/reschedule editing remains BP-009. |
| D-003 | Google Wallet only; Apple unavailable | Apple Pass Type ID and signing credentials do not exist; the UI must not promise Apple. |
| D-004 | Offline is check-in only, one event per device | Keeps the PII and conflict surface bounded; registration stays online. |
| D-005 | Raw IndexedDB + service worker, no PWA package | Avoids a new runtime dependency and keeps the queue transparent. |
| D-006 | Typed English/French dictionaries + cookie, no i18n package | The initial locale set is small; a package would add routing/config surface without benefit. |
| D-007 | Store amount + currency; no FX | Existing `ticketPrice` stays a major-unit number; changing currency never rewrites it. |
| D-008 | Server-derived counts; client queue is idempotent | The first successful check-in wins; duplicate scans return the original timestamp. |
| D-009 | Question definitions are versioned and archived, not deleted in place | Historical answers must remain exportable with their original labels. |
| D-010 | Use `next/og` for social images, with a static fallback | Built into Next.js 16; no external image service. |
| D-011 | Node `crypto` + REST for Google Wallet; no new dependency | Keeps signing server-side without adding an unapproved package. If the provider needs a library, stop and request approval. |
| D-012 | No test tasks; testing belongs to `/sdrive:test` | Traceability test IDs stay empty until the Test Agent runs. |

## Work Breakdown

### P0 — Foundation, schema, and shared contracts

- **T1.1** Extend the Convex schema and audit unions.
- **T1.2** Add shared constants, validators, and typed contracts.
- **T1.3** Enforce authorization and rate-limit buckets for new mutations.
- **T1.4** Add English/French dictionary scaffolding and locale resolution.
- **T1.5** Add event-aware currency/date formatting helpers.

### P1 — Share-ready event page and sponsors

- **T2.1** Add server metadata to the public event route.
- **T2.2** Generate per-event Open Graph images.
- **T2.3** Add escaped `schema.org/Event` JSON-LD.
- **T2.4** Add sponsor persistence and upload validation.
- **T2.5** Build the sponsor editor and public sponsor strip.

### P2 — Live and offline door mode

- **T3.1** Add indexed door snapshot and attendee search queries.
- **T3.2** Extend check-in outcomes and add idempotent batch sync.
- **T3.3** Build the live door-mode dashboard.
- **T3.4** Add the web manifest and service worker.
- **T3.5** Add the IndexedDB attendee cache and opt-in flow.
- **T3.6** Add the offline scan queue and sync client.
- **T3.7** Add offline data cleanup and expiry.

### P3 — Google Wallet passes

- **T4.1** Add the server-only Google Wallet provider and credential handling.
- **T4.2** Add idempotent pass issuance and registration wallet state.
- **T4.3** Add pass void/expire on cancellation and event deletion.
- **T4.4** Add the ticket wallet control and unavailable-Apple state.

### P4 — Custom registration questions

- **T5.1** Add question definition validation, versioning, and event persistence.
- **T5.2** Build the organizer question builder and preview.
- **T5.3** Add answer validation, storage, and the registration form fields.
- **T5.4** Add per-question columns to the registration CSV export.

### P5 — Currency, locations, and localization

- **T6.1** Add platform locale/currency settings and admin controls.
- **T6.2** Add event currency, country code, and full location/timezone selection.
- **T6.3** Migrate event surfaces to event-aware currency and timezone formatting.
- **T6.4** Add the UI locale switcher, cookie persistence, and French dictionary.
- **T6.5** Localize lifecycle email templates and select the registration locale.
- **T6.6** Add fallback notices and French layout safeguards.

### P6 — Verification and governance

- **T7.1** Run formatter, linter, and typecheck.
- **T7.2** Run governance validation and `sdrive verify`.
- **T7.3** Manually check responsive, keyboard, and French layouts.
- **T7.4** Confirm HTTPS/HSTS and PWA deployment prerequisites.

## Security Plan

| Control | Plan |
|---|---|
| CON-511 Authentication | All new Convex functions use `secureQuery`/`secureMutation`; public metadata reads only the public event query. |
| CON-512 Authorization | `requireEventOrganizer` checks the event owner for door, sponsors, questions, and wallet; settings use `requireAdmin`. |
| CON-514 Rate limiting | New buckets for wallet issuance, door sync, and question/sponsor writes; existing check-in bucket remains. |
| CON-515 Input validation | `convex/validators.ts` and Zod validate question definitions, answers, sponsors, currencies, locales, and offline items. |
| CON-517 XSS | JSON-LD escapes `<`; sponsor URLs are HTTP(S) only; no `dangerouslySetInnerHTML`; React escaping elsewhere. |
| CON-519 Environment security | Google credentials live in server env/Convex dashboard; `.env.example` documents names only; no secrets in logs or client bundles. |
| CON-520 HTTPS/HSTS | PWA installability requires production HTTPS; HSTS remains at the hosting layer and is confirmed in T7.4. |

Additional controls:

- Offline cache is opt-in, single-event, visible, and cleared on sign-out/expiry.
- Wallet save tokens are short-lived and audience-bound; object IDs are not
  exposed in public metadata.
- CSV exports reuse `lib/csv.ts` injection protection; question labels and
  answers are escaped.
- Audit entries record wallet, sponsor, question, and settings changes.

## Performance Plan

| NFR | Strategy |
|---|---|
| NFR-007 | Server metadata uses the existing public query; OG images are cached by event `updatedAt` and fall back to a static image. |
| NFR-008 | Door counts use `by_event_checkedIn`; recent rows use `by_event_checkedInAt` with a limit; sync batches cap at 500 items. |
| NFR-004 | Idempotency keys/registration state prevent duplicate passes and check-ins on retry. |
| NFR-014 | Counts are derived from registrations; exports read definitions once and build columns in order. |
| NFR-010 | Additive optional fields and platform-default fallbacks avoid a blocking migration. |
| NFR-012 | Service worker caches only versioned static assets; Convex/API traffic is network-only. |

## Dependencies

| Dependency | Type | Action | Notes |
|---|---|---|---|
| Google Wallet API | external | add | New service integration; issuer account + service account required. No npm package; use Node `crypto` + `fetch`. Skill expected: none. |
| Apple Wallet / PassKit | external | no_change | Blocked; no Apple credentials, no code. |
| `next/og` (`ImageResponse`) | library | no_change | Built into Next.js 16. |
| Next.js metadata/manifest conventions | library | no_change | Built in; use bundled docs. |
| `country-state-city` | library | no_change | Already installed. |
| Convex file storage | service | no_change | Already used for uploads. |
| `@convex-dev/rate-limiter` | library | no_change | Existing shared limiter. |
| Node `crypto` | internal | no_change | Built-in; service-account and save-JWT signing. |
| Browser APIs (IndexedDB, Service Worker, Manifest, Intl) | internal | no_change | No package. |
| Existing internal utilities | internal | no_change | `lib/csv.ts`, `lib/format.ts`, `convex/helpers.ts`, `convex/platformData.ts`. |
| schema.org Event | external | no_change | Vocabulary only. |
| Hosting HTTPS/HSTS | service | no_change | Production prerequisite; confirmed in T7.4. |

**No `action: "add"` library dependency is planned.** If Google Wallet cannot be
implemented with Node `crypto` + `fetch`, the Implementation Agent must stop and
request approval for a signing library before adding it.

## Risks

| Risk | Mitigation |
|---|---|
| Apple Wallet cannot ship without credentials | Keep Apple unavailable; no Apple control; revisit when credentials exist. |
| Google Wallet onboarding/API changes delay launch | Gate wallet ACs on credentials; keep QR ticket primary; isolate provider. |
| Offline PII on a shared device | Opt-in, one-event cache, visible age, sign-out/expiry clear, manual clear. |
| Stale service worker serves an old shell | Versioned caches, update activation that preserves the queue, kill switch. |
| French copy incomplete or overflows | Typed dictionaries, coverage check, fallback, 360/768/1280 review. |
| Currency change mistaken for FX | Store amount + currency; document display-only; never rewrite amounts. |
| OG generation latency | Cache by `updatedAt`, static fallback, limited fonts/assets. |
| Legacy rows break on additive schema | Optional fields, platform defaults, no destructive backfill. |
| Question edits orphan answers | Stable IDs, versioned definitions, archive not delete, archived export columns. |
| Door queries expensive at scale | Indexed counts, limited recent/search rows, capped sync batch. |

## Testing Handoff

This plan deliberately contains **no test-authoring and no test-execution tasks**.
`/sdrive:test` owns test design, test files, and test execution. The traceability
matrix keeps `taskIds` for production work and leaves `testIds` empty until the
Test Agent fills them. The verification phase is limited to formatter, linter,
typecheck, governance validation, `sdrive verify`, and manual responsive/keyboard/
French checks.

## Traceability

`traceability.json` is updated with the phase and task IDs for every FR and NFR.
The mapping is generated from `tasks.json` so a task cannot silently claim a
requirement it does not list, and every requirement must have at least one task.
