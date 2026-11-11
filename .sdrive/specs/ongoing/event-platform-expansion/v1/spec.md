---
id: event-platform-expansion
name: event-platform-expansion
productItems:
  - BP-005
  - BP-004
  - BP-003
  - BP-007
  - BP-014
version: v1
status: proposed
created: 2026-11-11
updated: 2026-11-11
owner: kenule500
source: .sdrive/product/backlog.md
branch: feature/event-platform-expansion
base: main
---

# Spec: Event Platform Expansion

> **Gate 1 — Specification.** This document and its machine-readable companions
> (`spec.json`, `traceability.json`) are the review unit. `plan.md` and `tasks.md`
> are intentionally absent until this gate is approved.
>
> RFC 2119 keywords (`MUST`, `MUST NOT`, `SHOULD`, `MAY`) are used deliberately.
> Every acceptance criterion is traced to at least one functional or
> non-functional requirement in `traceability.json`.

## Overview

### Problem Statement

Ivent's public event page is a client-rendered screen with a hardcoded naira
symbol, no per-event Open Graph image, no structured event data, and no sponsor
surface. A shared link therefore looks generic, search engines cannot read the
event reliably, and a sponsor has nothing to point at. At the door, the existing
check-in dashboard is a client-side list with a QR scanner and a browser CSV
download: it has no dedicated live view, no throughput signal, and no way to keep
checking people in when the venue network drops. Ticketing stops at the in-app
QR code; there is no wallet pass, no update/void path, and no way to hand an
attendee a ticket that survives an app uninstall. Registration asks only for the
signed-in identity, so organizers cannot collect the questions their event
actually needs, and every price, date, and location is framed for Nigeria even
when the event is elsewhere.

These are five backlog candidates that share one architectural spine: the event
record, the registration record, and the public/event-operations surfaces. They
are proposed as **one feature** so the branch carries one coherent review unit,
one schema migration, and one release, while each item keeps its own
acceptance criteria and traceability. The five items are BP-005, BP-004, BP-003,
BP-007, and BP-014.

### Goals

- Make every public event page share-ready: per-event metadata, a generated
  Open Graph/Twitter image, valid `schema.org/Event` JSON-LD, and sponsor logos.
- Give organizers a dedicated live door mode with throughput, search, manual
  check-in, duplicate handling, and an offline-capable check-in queue that syncs
  idempotently.
- Issue Google Wallet event-ticket passes for confirmed registrations, update or
  void them when the registration or event changes, and keep the QR ticket
  usable when the wallet provider is unavailable.
- Let organizers define ordered custom registration questions (six core types)
  and answer them safely, with per-question CSV export and historical-answer
  preservation.
- Support event-level currency and international locations, English/French UI
  and system copy, and locale-aware price/date formatting without FX conversion.
- Keep every new surface additive and backward compatible: existing events and
  registrations MUST continue to render and operate with platform defaults.

### Non-Goals

- Replacing the in-app QR ticket. Wallet passes are an additional delivery
  channel, not a replacement.
- Offline registration, offline payment, or offline event creation.
- Event editing, rescheduling, or cancellation (BP-009). Wallet updates for a
  rescheduled event wait for that feature.
- Apple Wallet issuance in this version. BP-003 asked for Apple and Google; the
  Apple Pass Type ID certificate and signing credentials are not available, so
  Apple is explicitly out of scope and MUST NOT be presented as available.
- Machine translation of organizer-entered event content.
- Currency conversion, crypto payments, tax/VAT calculation, or payment
  processing changes.
- File-upload questions, conditional question logic, waitlists, or quotas.
- Sponsor analytics, ad serving, or impression billing.
- Full offline attendee registration or multi-event offline caching.

### Existing Surface

- `app/(public)/events/[slug]/page.tsx` — client event page; hardcoded `₦`;
  no `generateMetadata`, no `opengraph-image`, no JSON-LD, no sponsors.
- `app/(main)/my-events/[eventId]/page.tsx` — organizer event dashboard with a
  client-side attendee table, QR scanner modal, CSV download, and a live
  registration count. No dedicated door route and no offline queue.
- `app/(public)/events/[slug]/_components/register-modal.tsx` — registration
  dialog; only identity fields, no custom questions.
- `convex/schema.ts` — `events` has `timezone`, `country`, `ticketType`,
  `ticketPrice`, `coverImage`, `themeColor`; no currency, sponsors, questions,
  wallet, or offline fields. `registrations` has `qrCode`, `checkedIn`,
  `checkedInAt`, `status`; no answers or wallet fields.
- `convex/registrations.ts` — `registerForEvent`, `cancelRegistration`,
  `checkInAttendee` (organizer-only, idempotent duplicate handling, rate-limited).
- `convex/exports.ts`, `lib/csv.ts` — CSV serialization with OWASP injection
  protection.
- `lib/format.ts` — locale/currency/timezone formatters; currently used mostly
  by admin surfaces.
- `convex/platformData.ts` — platform defaults and supported currency/timezone
  helpers; `defaultCountry`, `defaultCurrency`, `defaultTimezone` exist, but no
  `defaultLocale`.
- `convex/helpers.ts`, `convex/rateLimiter.ts` — `secureQuery`/`secureMutation`,
  ownership checks, and the shared rate-limiter registry.
- `convex/lifecycleEmails.ts` — English lifecycle email templates; the locale
  path for system email does not exist yet.
- `app/layout.tsx` — static `metadata`; no `metadataBase`.
- `next.config.ts` — no headers or PWA configuration; `next/og` is available
  through Next.js 16.

### Impact

- **Organizers** get a credible public page, a door tool that survives bad
  connectivity, a wallet delivery channel, the questions their event needs, and
  pricing/locations that match their market.
- **Attendees** get a shareable page, a wallet ticket, a localized interface, and
  a registration form that explains what is being asked and why.
- **Sponsors** get a visible, accessible credit on the event page.
- **Administrators** get platform-level locale/currency defaults and audit
  visibility into wallet and event-definition changes.
- **The product** moves from a Nigeria-only, app-only event flow to a
  share-ready, door-ready, internationally legible platform without rewriting
  the core registration model.

### Product Items in This Feature

| Item | Milestone | Scope in this version | Status |
|---|---|---|---|
| BP-005 | M1 — Trust and polish | Per-event OG/SEO metadata, JSON-LD, generated social image, up to six sponsor logos with organizer management. | Full |
| BP-004 | M2 — Premium ticket | Dedicated live door dashboard, manual/QR check-in, offline PWA check-in for one event, idempotent sync. | Full; check-in only offline |
| BP-003 | M2 — Premium ticket | Google Wallet event-ticket issuance with update/void support. Apple Wallet explicitly unavailable. | Google only; Apple blocked |
| BP-007 | M3 — Organizer toolkit | Up to ten custom questions across six core types, required/optional, reorder, preview, per-question CSV columns, archived answers. | Full; no file upload |
| BP-014 | M4 — Global readiness | English/French UI and system copy; event currency in NGN/USD/GBP/EUR; full country/state/city data; event timezone; no FX. | Full; en/fr only |

## User Stories

### US-001: Share an event that looks credible

As an organizer, I want every event page to produce a rich preview and valid event structured data, so that a shared link looks trustworthy and search engines can surface the event.

**Acceptance Criteria:**
- AC-001: Given a public event with a title, start/end date, and location, the page emits a unique `<title>`, meta description, canonical URL, `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `twitter:card`, `twitter:title`, `twitter:description`, and `twitter:image` derived from that event, with no site-wide placeholder text.
- AC-002: Given an event with a cover image, the Open Graph/Twitter image is a 1200×630 generated card containing the event title, date, city/country, organizer name, and cover image; given an event without a cover image, a branded fallback card with the title and date is generated instead.
- AC-003: Given a public event, the page includes valid `schema.org/Event` JSON-LD with `name`, `startDate`, `endDate`, `eventStatus`, `location`, `image`, `organizer`, and `offers` (`price` and `priceCurrency`, or a free offer) whose values match the event and use ISO 8601 dates in the event timezone.
- AC-004: Given an event with sponsor logos, the public page renders up to six sponsors in organizer order with a visible name and alt text; a sponsor with a URL links to it in a new tab with `rel="noopener noreferrer"`, and the sponsor section is omitted when there are no sponsors.

### US-002: Credit the sponsors who made the event possible

As an organizer, I want to add, reorder, and remove sponsor logos, so that the public page credits them accurately.

**Acceptance Criteria:**
- AC-005: Given the event management surface, the organizer can add up to six sponsors with a name, logo upload, optional URL, and alt text; the save rejects an empty name, an unsupported image type, an image over the size limit, or a non-HTTP(S) URL with an inline, accessible error.
- AC-006: Given a sponsor added, reordered, or removed, the public event page reflects the current order on the next load; removing one sponsor MUST NOT remove the event or any other sponsor, and the change is attributed to the acting organizer.

### US-003: Run the door from one live screen

As an organizer, I want a dedicated live check-in dashboard for one event, so that I can see throughput and intervene at the door.

**Acceptance Criteria:**
- AC-007: Given a door-mode route for an event, the organizer sees the checked-in count, confirmed total, check-in rate, last check-in time, connection status, and the ten most recent check-ins; a check-in made on another device is reflected within 2 seconds without a manual refresh.
- AC-008: Given a QR code, ticket code, or attendee-name search, the organizer can check in a confirmed attendee; a duplicate check-in returns "already checked in" with the original timestamp and does not increment the checked-in count; a cancelled or unknown ticket is rejected with a distinct message.
- AC-009: Given a caller who is not the event organizer, every door-mode query and mutation is denied server-side; an unauthenticated caller receives an authentication error, and hiding the UI is never the only control.

### US-004: Keep checking people in when the network drops

As a door operator, I want check-in to keep working offline and reconcile when connectivity returns, so that a queue does not stop because the venue Wi-Fi failed.

**Acceptance Criteria:**
- AC-010: Given the organizer explicitly enables offline mode for one event while online, the app caches the confirmed attendee snapshot (name, ticket code, QR code, confirmation status) in IndexedDB and shows the cache age, attendee count, and event name.
- AC-011: Given offline mode is enabled and the device loses connectivity, scanning a cached confirmed ticket records a local check-in with a pending state and a captured timestamp; scanning an unknown or cancelled ticket shows the appropriate error and writes nothing.
- AC-012: Given queued offline check-ins and restored connectivity, the app syncs them idempotently; every item resolves to checked-in, already-checked-in, cancelled, not-found, or wrong-event, the server count equals the union of successful check-ins, and no registration is counted twice.
- AC-013: Given sign-out, 24 hours after the event ends, or an explicit "clear offline data" action, the cached attendee snapshot and pending queue are deleted; the app MUST NOT cache more than one event at a time.
- AC-014: Given the app is installed or the door route is opened offline, the door route shell and the cached attendee list load without a network request; an uncached route shows an offline fallback instead of a browser network error.

### US-005: Carry the ticket in Google Wallet

As an attendee, I want to add my ticket to Google Wallet, so that I can enter without opening the app or finding an email.

**Acceptance Criteria:**
- AC-015: Given a confirmed registration for a wallet-enabled event and a configured Google Wallet issuer, the ticket screen shows an "Add to Google Wallet" control whose save link is a signed JWT containing the event title, start/end in the event timezone, venue/city, attendee name, ticket code, and a scannable barcode.
- AC-016: Given a pass already issued for a registration, a repeat request returns the same Google Wallet object and does not create a duplicate; the registration stores the provider, object ID, status, and issued/updated timestamps.
- AC-017: Given a registration cancellation or an event deletion, the corresponding Google Wallet object is expired or voided within 60 seconds so that it no longer admits entry; a provider failure is recorded and retried within a bounded budget without blocking the cancellation.
- AC-018: Given missing or invalid Google Wallet credentials, a provider timeout, or a quota error, the wallet control is hidden or shows a recoverable error, the in-app QR ticket remains usable, and no secret appears in the client, logs, or the error message.
- AC-019: Given an Apple device, no Apple Wallet control is shown in this version; the wallet provider surface reports Apple as `unavailable`, and the specification records Apple as blocked pending credentials.

### US-006: Ask the questions my event needs

As an organizer, I want to define custom registration questions, so that I collect the information my event actually requires.

**Acceptance Criteria:**
- AC-020: Given the event management surface, the organizer can define up to ten active questions, choose one of `short_text`, `long_text`, `single_select`, `multi_select`, `number`, or `date`, mark each required or optional, add options and help text for choice types, reorder them, and preview the attendee form; an empty label, a choice question with fewer than two unique options, or a duplicate active label is rejected inline and server-side.
- AC-021: Given a question edited or removed after answers exist, the existing answers remain readable and exportable under the question's original label and stable ID; the edit creates a new definition version and archives the old one, removal requires confirmation, and new registrations see only the current definitions.
- AC-022: Given a registration export, the CSV includes one column per current and archived question in stable order, with headers derived from the question labels and values escaped by the existing CSV serializer; no answer appears in another attendee's row.

### US-007: Answer only what is asked, with confidence

As an attendee, I want to understand and answer the organizer's questions, so that I can complete registration without guessing or exposing my answers to other attendees.

**Acceptance Criteria:**
- AC-023: Given an event with custom questions, the registration form renders the current questions in order with their label, optional help text, required marker, and a plain-language privacy note; answers are not submitted until the attendee confirms registration.
- AC-024: Given an invalid required answer, an answer outside the allowed options, or a malformed number/date, the form shows an accessible error next to the field, keeps the entered values, and does not create a registration; the same validation runs server-side.
- AC-025: Given a successful registration, answers are stored keyed by stable question ID and are visible to the attendee on their own registration/ticket, to the event organizer, and to administrators; they are not visible to other attendees.

### US-008: Price and locate the event in my market

As an organizer, I want to choose my event currency and real location, so that the event is correct for the market it is in.

**Acceptance Criteria:**
- AC-026: Given platform settings, an administrator can set the default locale (`en` or `fr`), default currency (`NGN`, `USD`, `GBP`, or `EUR`), default country, and default timezone; unsupported values are rejected with a clear message.
- AC-027: Given event creation or editing, the organizer can choose one of the four supported currencies and any country/state/city from the full `country-state-city` dataset; the event stores its currency, ISO country code, and IANA timezone, and no FX conversion is performed.
- AC-028: Given a published event, every price display uses the event currency and selected locale with locale-aware formatting (for example `₦5,000`, `$5,000`, `£5,000`, `€5,000`), never a hardcoded naira symbol; free events show a localized "Free".
- AC-029: Given an event, every date/time display on the event page, ticket, registration form, and door mode uses the event timezone and selected locale, shows the timezone explicitly, and is not shifted by the viewer's device timezone.
- AC-030: Given an existing event without the new currency/locale/country fields, the surfaces fall back to the platform defaults and continue to render; changing a platform default MUST NOT rewrite an existing event's stored currency, country, or timezone.

### US-009: Use the product in English or French

As an attendee or organizer, I want the interface and system email in my language, so that I can use the product without translating English in my head.

**Acceptance Criteria:**
- AC-031: Given a locale selection of English or French (or an `Accept-Language` preference when no selection exists), the public event page, ticket, registration form, door mode, and system-generated lifecycle emails render copy in that language; the selection persists across navigation and sessions.
- AC-032: Given French copy, the new and changed surfaces do not overflow or clip at 360px, 768px, and 1280px; dates, numbers, and currency use locale-aware formatting, and every control keeps an accessible name.
- AC-033: Given organizer-entered event content, the system shows it exactly as entered and does not machine-translate it; only the product chrome and system-generated copy are localized.
- AC-034: Given an unsupported locale or currency, the system falls back to the platform default and shows a non-blocking notice; it MUST NOT render raw translation keys, crash, or display a blank price/date.

## Requirements

### Functional Requirements

#### Public event page and sponsors (BP-005)

- FR-001: The public event route MUST expose server-generated metadata (title, description, canonical URL, Open Graph, Twitter card) derived from the event, not a client-only or site-wide placeholder. (AC-001)
- FR-002: The app MUST generate a deterministic 1200×630 Open Graph/Twitter image per event from the event title, date, location, organizer, and optional cover image, with a branded fallback when no cover exists. (AC-002)
- FR-003: The public event page MUST render `schema.org/Event` JSON-LD with ISO 8601 dates, location, organizer, image, `eventStatus`, and an `Offer` with price/currency or a free offer. (AC-003)
- FR-004: The `events` record and public page MUST support up to six ordered sponsors, each with a stable id, name, logo storage reference, optional HTTP(S) URL, and alt text; the public page MUST omit the section when the list is empty. (AC-004, AC-006)
- FR-005: The organizer event surface MUST allow adding, reordering, and removing sponsors, MUST validate image type/size and URL scheme on the client and server, and MUST preserve the event and remaining sponsors when one is removed. (AC-005, AC-006)

#### Live door mode (BP-004)

- FR-006: A dedicated organizer door-mode route MUST show checked-in count, confirmed total, check-in rate, last check-in time, connection state, and the ten most recent check-ins from a reactive event-scoped query. (AC-007)
- FR-007: Door mode MUST support QR scanning, ticket-code entry, and attendee-name search, and MUST use one server mutation for check-in that distinguishes success, already-checked-in, cancelled, unknown, and wrong-event outcomes. (AC-008)
- FR-008: Every door-mode query and mutation MUST verify that the caller is the event organizer (or an authorized administrator through an explicit admin path) server-side; no UI-only guard is sufficient. (AC-009)
- FR-009: The organizer MUST be able to opt in to offline mode for exactly one event while online; the client MUST cache only that event's confirmed attendee snapshot in IndexedDB and display its age and count. (AC-010, AC-013)
- FR-010: Offline scans MUST write a local pending check-in with an idempotency key and captured timestamp, and MUST NOT write for unknown, cancelled, or wrong-event tickets. (AC-011)
- FR-011: A batch sync mutation MUST accept queued check-ins, validate each item against the event and registration, apply the first successful check-in, return a per-item outcome, and keep server counts derived from registrations rather than a denormalized counter. (AC-012)
- FR-012: The client MUST delete offline attendee data and the pending queue on sign-out, 24 hours after the event ends, or an explicit clear action, and MUST NOT retain more than one event's snapshot. (AC-013)
- FR-013: The app MUST expose a web app manifest and a service worker that caches the door route shell and static assets, serves the cached shell offline, and never caches authenticated JSON or Convex responses. (AC-014)

#### Google Wallet passes (BP-003)

- FR-014: Google Wallet configuration MUST be server-side only: issuer ID, service-account identity, and signing material MUST come from server environment configuration, and a per-event `walletEnabled` flag MUST gate eligibility. (AC-015, AC-018)
- FR-015: Issuance MUST create or reuse a Google Wallet event-ticket class and object with stable IDs, sign a save JWT, and return a save URL; repeated issuance for the same registration MUST be idempotent. (AC-015, AC-016)
- FR-016: The `registrations` record MUST store the wallet provider, object ID, pass status, and issued/updated timestamps so issuance, update, and void are traceable without re-deriving state. (AC-016)
- FR-017: Registration cancellation and event deletion MUST expire or void the corresponding Google Wallet object within 60 seconds; failures MUST be recorded and retried within a bounded budget without blocking the cancellation or deletion. (AC-017)
- FR-018: Wallet operations MUST be rate-limited, audited, and fail open for the ticket: a wallet failure MUST NOT invalidate the in-app QR ticket, and no secret may reach the client or logs. (AC-018)
- FR-019: Apple Wallet MUST NOT be offered while credentials are absent; the provider registry MUST return `unavailable` for Apple and the UI MUST NOT render an Apple Wallet control. (AC-019)

#### Custom registration questions (BP-007)

- FR-020: Events MUST support an ordered `registrationQuestions` definition (maximum ten active) with stable IDs, six allowed types, required flag, optional help text, and unique options for choice types; the server MUST validate every definition. (AC-020)
- FR-021: Registration MUST validate submitted answers against the event's current active definitions (required, type, option membership, number/date shape), store accepted answers keyed by question ID, and reject the registration atomically on any invalid answer. (AC-023, AC-024, AC-025)
- FR-022: Editing a question with answers MUST create a new definition version and archive the old one; historical answers MUST remain readable and exportable, and removing a question with answers MUST require explicit organizer confirmation. (AC-021)
- FR-023: The registration export MUST add one column per current and archived question in stable order, use the question label as the header, and escape every value through the existing CSV serializer. (AC-022)
- FR-024: The registration form MUST render labels, help text, required markers, and a privacy note, and MUST make answer visibility limited to the attendee, the event organizer, and administrators. (AC-023, AC-025)

#### Currency, locations, and localization (BP-014)

- FR-025: Platform settings MUST add a default locale limited to `en`/`fr` and MUST validate the default currency against `NGN`/`USD`/`GBP`/`EUR`, while preserving the existing default country and timezone. (AC-026, AC-030)
- FR-026: Event creation and editing MUST persist `currency`, ISO `countryCode`, and IANA `timezone`, and the form MUST use the full `country-state-city` dataset and the four supported currencies. (AC-027, AC-030)
- FR-027: Every price display on public, ticket, registration, door, and export surfaces MUST use the event currency and selected locale through the shared formatter; no new hardcoded currency symbol is permitted. (AC-028)
- FR-028: Every event date/time display MUST use the event timezone and selected locale and MUST show the timezone explicitly; the viewer's device timezone MUST NOT silently override it. (AC-029)
- FR-029: UI chrome and system-generated lifecycle email copy MUST resolve from English and French dictionaries, with the locale selected from the user's choice, a persisted cookie, the platform default, or `Accept-Language`, in that order. (AC-031, AC-033)
- FR-030: Locale-aware layouts MUST remain usable at 360px, 768px, and 1280px, and an unsupported locale or currency MUST fall back to the platform default with a non-blocking notice rather than raw keys or a crash. (AC-032, AC-034)
- FR-031: Organizer-entered content MUST be rendered as entered and MUST NOT be machine-translated or rewritten by locale changes. (AC-033)

### Non-Functional Requirements

- NFR-001: Authorization: every new query and mutation MUST use the existing secure wrappers or `requireAdmin`, MUST check event ownership server-side, and MUST NOT trust a client-supplied user or organizer ID. (AC-009, AC-020, AC-022)
- NFR-002: Secret handling: Google Wallet signing material and any provider credentials MUST remain in server-side environment configuration, MUST NOT be committed, logged, or shipped to the browser, and signed save tokens MUST be short-lived and audience-bound. (AC-015, AC-018)
- NFR-003: Offline PII: the cache MUST contain only the selected event's confirmed attendee data, MUST require an explicit opt-in, MUST be deleted on sign-out or 24 hours after the event ends, and MUST NOT be written into the service-worker cache. (AC-010, AC-013)
- NFR-004: Idempotency: wallet issuance, offline check-in sync, and registration submission MUST be idempotent under retries; a repeat MUST return the original outcome rather than create a duplicate pass, check-in, or registration. (AC-012, AC-016)
- NFR-005: Rate limiting: wallet issuance, manual/batch check-in, and question/sponsor mutations MUST use the shared rate limiter with a clear retryable error when exhausted. (AC-008, AC-012, AC-018)
- NFR-006: Input safety: all new inputs MUST be validated with Convex validators and Zod where applicable; sponsor URLs MUST be HTTP(S) only; JSON-LD MUST escape `<`; CSV output MUST use the existing injection-safe serializer. (AC-005, AC-022, AC-024)
- NFR-007: Metadata performance: event metadata MUST be server-rendered without blocking the interactive body; a cached OG image SHOULD complete within 1.5 seconds at p95 and an uncached image within 3 seconds, with a static fallback if generation fails. (AC-001, AC-002)
- NFR-008: Door responsiveness: live counts SHOULD reflect a remote check-in within 2 seconds at p95, an offline scan SHOULD acknowledge within 150 milliseconds, and a 500-item sync batch SHOULD complete within 5 seconds. (AC-007, AC-011, AC-012)
- NFR-009: Accessibility: new and changed surfaces MUST meet WCAG 2.1 AA, including keyboard operation, visible focus, screen-reader labels, live-region announcements for check-in/sync results, non-color-only status, and 4.5:1 text contrast. (AC-023, AC-024, AC-032)
- NFR-010: Backward compatibility: schema changes MUST be additive and optional; existing events, registrations, exports, and pages MUST continue to work with platform defaults, and no destructive backfill may be required to deploy. (AC-026, AC-027, AC-030)
- NFR-011: Localization completeness: new and changed surfaces MUST NOT contain hardcoded user-facing English or French strings; a missing key MUST fall back to English and be reported, never rendered as a raw key. (AC-031, AC-034)
- NFR-012: PWA cache safety: the service worker MUST cache only the static app shell and explicitly versioned assets, MUST NOT cache authenticated JSON or Convex traffic, and MUST preserve the offline queue across an app-shell update. (AC-014)
- NFR-013: Auditability: wallet issue/void, question definition changes, sponsor changes, and platform locale/currency changes MUST be attributable to an actor with a timestamp and outcome. (AC-005, AC-017, AC-020, AC-026)
- NFR-014: Data integrity: check-in counts MUST be derived from registration rows, CSV columns MUST follow question order, archived questions MUST remain exportable, and changing a currency MUST NOT silently convert stored amounts. (AC-012, AC-022)

## UI/UX & Data Requirements

### Key Screens

- **Public event page** (`app/(public)/events/[slug]`) — server-generated metadata, generated social image, JSON-LD, sponsor strip, locale-aware price/date, and event-timezone label. Existing interactive RSVP/share behavior stays.
- **Organizer event surface** (`app/(main)/create-event`, `app/(main)/my-events/[eventId]`) — currency, country/state/city, timezone, sponsor editor, question builder with preview, and a "Door mode" entry point.
- **Door mode** (`app/(main)/my-events/[eventId]/door`) — live counters, connection badge, recent check-ins, scanner/manual search, offline toggle, cache age, pending/synced queue, and a clear-data action.
- **Ticket / registration detail** (`app/(main)/my-tickets`) — Google Wallet control (when eligible), QR ticket, event timezone, and the attendee's own answers.
- **Registration dialog** (`app/(public)/events/[slug]/_components/register-modal.tsx`) — custom questions in order, required markers, help text, privacy note, inline errors, and localized price/date.
- **Admin settings** (`app/admin/settings`) — default locale, currency, country, and timezone with validation and current-value display.
- **Admin audit** (`app/admin/audit`) — wallet, question, sponsor, and settings entries.

### Data Model Changes

All changes are additive and optional unless stated. Existing rows MUST render with platform defaults.

- `events` gains:
  - `currency?: string` — ISO 4217, limited to `NGN`, `USD`, `GBP`, `EUR` for new writes.
  - `countryCode?: string` — ISO 3166-1 alpha-2; the existing `country` display string remains for compatibility.
  - `sponsors?: Array<{ id: string; name: string; logoStorageId: string; url?: string; alt: string; order: number }>` — maximum six.
  - `registrationQuestions?: Array<{ id: string; label: string; type: "short_text" | "long_text" | "single_select" | "multi_select" | "number" | "date"; required: boolean; options?: string[]; helpText?: string; order: number; archived?: boolean; version: number }>` — maximum ten active.
  - `walletEnabled?: boolean` — per-event eligibility.
  - `doorModeEnabled?: boolean` — per-event door-mode availability.
- `registrations` gains:
  - `answers?: Array<{ questionId: string; value: string | number | string[] }>` — keyed by stable question ID.
  - `wallet?: { provider: "google"; objectId: string; status: "issued" | "voided" | "failed"; issuedAt?: number; updatedAt?: number; lastError?: string }`.
  - `locale?: string` — the attendee's selected locale at registration, used for system email.
  - `offlineScannedAt?: number` — device capture time for audit; `checkedInAt` remains the server receipt time.
- `platformSettings` gains:
  - `defaultLocale?: string` — `en` or `fr`; absent means `en`.
  - Existing `defaultCurrency` is validated against the four supported event currencies for new writes; existing unsupported values fall back with a notice.
- `registrations` indexes:
  - `by_event_checkedIn: ["eventId", "checkedIn"]` for counts.
  - `by_event_checkedInAt: ["eventId", "checkedInAt"]` for recent check-ins.
  - `search_attendee` search index on `attendeeName`, filtered by `eventId`, for door search.
- `auditLogs` gains actions `wallet.issued`, `wallet.voided`, `event.sponsors_updated`, and `event.questions_updated`; `targetType` already supports `event` and `registration`.
- No new table is required for offline data; the offline cache and queue live in IndexedDB on the device. No new table is required for wallet objects; the registration row carries the object ID.

### API / Surface Changes

- **Public metadata**: a server wrapper around the event route provides `generateMetadata`; `app/(public)/events/[slug]/opengraph-image.tsx` generates the image with `ImageResponse` from `next/og`; JSON-LD is emitted as a server-rendered script tag.
- **Door**: `getDoorSnapshot(eventId)` (reactive counts/recent), `searchDoorAttendees(eventId, query)`, existing `checkInAttendee(qrCode)` extended for door outcomes, and `syncOfflineCheckIns(eventId, items)` for batches.
- **Wallet**: `issueWalletPass(registrationId)` and `voidWalletPass(registrationId)` organizer/attendee-scoped mutations or actions; an internal action performs Google Wallet REST calls and JWT signing.
- **Questions**: event create/update accepts the question definitions; `registerForEvent` accepts `answers`; exports include dynamic question columns.
- **Sponsors**: event update accepts sponsor metadata; logo upload uses the existing Convex storage upload URL.
- **Settings**: `updatePlatformSettings` accepts `defaultLocale` and validates `defaultCurrency` against the supported set.
- **i18n**: a shared `lib/i18n` dictionary and locale resolver; no new runtime dependency is required for the initial English/French set.

### Offline Architecture

- **Manifest**: `app/manifest.ts` declares the app name, short name, start URL, display mode, theme/background colors, and icons.
- **Service worker**: `public/sw.js` (or a generated equivalent) caches a versioned app shell and static assets; navigation requests use network-first with a cached fallback; requests to Convex (`*.convex.cloud`, `*.convex.site`), `/api/*`, and authenticated JSON are never cached.
- **IndexedDB stores**:
  - `door_attendees` — one record per event snapshot: event ID, cached timestamp, expiry, and attendee rows (name, ticket code, QR code, status).
  - `door_queue` — one record per pending scan: idempotency key, event ID, QR code, scanned timestamp, local status.
  - `door_meta` — active event ID, cache age, last sync time, and queue count.
- **Enable flow**: online-only; the organizer confirms the event, the client fetches the confirmed snapshot, writes it to IndexedDB, and records the expiry.
- **Offline scan flow**: look up the QR/code in the snapshot; if confirmed, write a queue item with a generated idempotency key and a pending state; if unknown/cancelled, show the error without writing.
- **Sync flow**: on `online`, on door-route load while online, and on a bounded interval, send queue items in batches; the server returns per-item outcomes; successful and terminal items are removed; retryable failures stay queued; the UI shows pending/synced/conflict counts.
- **Conflict policy**: the server is authoritative; the first check-in wins, and a second device receives `already_checked_in` with the original timestamp. A cancelled registration is never checked in, even if the snapshot was stale.
- **Cleanup**: clear on Clerk sign-out, 24 hours after the event end, or an explicit action; a new event opt-in replaces the previous snapshot and queue only after confirmation.

### Currency, Location, and Localization Architecture

- **Supported event currencies**: `NGN`, `USD`, `GBP`, `EUR`. A single exported constant is the source of truth for forms, validators, and exports. Amounts remain stored in the currency's major unit in `ticketPrice`; the currency is stored separately; no FX conversion is performed.
- **Locations**: use `country-state-city` for country/state/city options; store the ISO country code alongside the existing display country. An event with no country code falls back to the platform default.
- **Timezones**: use the existing `supportedTimezones()` helper for the picker; store the IANA identifier; render with `Intl.DateTimeFormat` using the event timezone.
- **Locale resolution**: explicit user choice (cookie `ivent_locale`, one year) → platform `defaultLocale` → `Accept-Language` (`fr` if French is preferred, otherwise `en`) → `en`. Signed-in and anonymous users share the cookie path.
- **Dictionaries**: `lib/i18n/en.ts` and `lib/i18n/fr.ts` export the same key shape; a typed helper prevents missing keys at compile time. System email templates receive the registration locale and select the matching dictionary.
- **No machine translation**: event title, description, venue, sponsor names, question labels/help text, and answers are shown as entered.

### Event Page Metadata and Social Image

- The public route is restructured so metadata is generated on the server; the interactive body may remain a client component.
- `generateMetadata` reads the public event by slug and returns `title`, `description`, `alternates.canonical`, `openGraph` (title, description, url, siteName, type, images), and `twitter` (`summary_large_image`, title, description, images). A missing event returns `notFound()` and no stale metadata.
- `opengraph-image.tsx` exports `alt`, `size = { width: 1200, height: 630 }`, `contentType = "image/png"`, and an async image function. It uses the event title, localized date, city/country, organizer name, and cover image; it truncates long strings and uses the event `themeColor` for the fallback background.
- `metadataBase` is configured from the public app URL so canonical and image URLs are absolute in production.
- JSON-LD is serialized with `<` escaped to `\u003c` to avoid script injection; it includes `eventAttendanceMode` (`OfflineEventAttendanceMode` for physical, `OnlineEventAttendanceMode` for online), `eventStatus` (`EventScheduled`), and an `Offer` whose `price` is `0` for free events.
- Caching: the metadata query and the image generator SHOULD key on the event's `updatedAt` (or slug + updatedAt) to avoid regenerating on every request; a static fallback image is used if generation fails.

### Wallet Architecture

- **Provider**: Google Wallet event tickets (class + object) through the Google Wallet REST API. Apple PassKit is documented but not implemented.
- **Configuration**: `GOOGLE_WALLET_ISSUER_ID` and a server-only service-account credential (JSON or equivalent) are read in a Convex Node action. The private key MUST NOT be stored in the database or shipped to the client.
- **IDs**: class ID derived from the issuer and event, object ID derived from the issuer and registration; both are stable and stored on the registration when first issued.
- **Save link**: a short-lived JWT with `iss` = service-account email, `aud` = `google`, `typ` = `savetowallet`, the allowed origin(s), and the event-ticket object reference; the link is `https://pay.google.com/gp/v/save/<jwt>`.
- **Eligibility**: confirmed registration, event `walletEnabled`, configured issuer, and a supported event currency/locale. The button is absent when any condition fails.
- **Update/void**: cancellation and deletion call the void path. Event reschedule/update is out of scope until BP-009; the stored object ID makes that extension additive.
- **Failure handling**: bounded retry, `failed` status with a reason, ticket unaffected, audit entry, and a recoverable UI message. Apple returns `unavailable`.

### Security Baseline

| Control | How this feature addresses it |
|---|---|
| CON-511 Authentication | Clerk JWT continues to gate Convex; door, wallet, question, and sponsor mutations use `secureMutation`/`secureQuery`. |
| CON-512 Authorization | Event ownership is checked in Convex for door, sponsors, questions, and wallet; admin settings require `requireAdmin`; UI hiding is never the only control. |
| CON-513 Security headers | No new Express middleware; any needed headers are added through `next.config.ts` if the plan identifies a gap. |
| CON-514 Rate limiting | Wallet issuance, door check-in, offline sync, and question/sponsor writes use the shared limiter with retryable errors. |
| CON-515 Input validation | Convex validators + Zod for forms; question definitions, answers, sponsor URLs, currencies, locales, and timezones are validated server-side. |
| CON-516 NoSQL injection | Convex parameterized queries; no string-built queries. |
| CON-517 XSS | React escaping; JSON-LD escapes `<`; sponsor URLs restricted to HTTP(S); no `dangerouslySetInnerHTML` introduced. |
| CON-518 CSRF | Convex mutations use Clerk-authenticated tokens; no cookie-driven form posts. |
| CON-519 Environment security | Google Wallet credentials live in server env/Convex dashboard; `.env.example` only; no secrets in logs or client bundles. |
| CON-520 HTTPS/HSTS | PWA installability requires HTTPS in production; HSTS remains at the hosting layer. |

Additional feature-specific controls:

- Offline data is PII: explicit opt-in, single-event scope, visible cache age, sign-out/expiry cleanup, and no service-worker caching of attendee rows.
- Wallet save tokens are short-lived and audience-bound; object IDs are not secrets but are not exposed in public metadata.
- CSV exports continue to use the existing injection-safe serializer; question labels and answers are escaped.
- JSON-LD is generated from trusted event fields and escaped; no organizer-supplied HTML is inserted unescaped.

### Accessibility

- Door mode announces check-in success, duplicate, cancellation, and sync results through the existing live-region pattern; the scanner input is keyboard operable and the recent-check-in list is readable by screen readers.
- Question errors use `aria-invalid` and `aria-describedby`; required markers have text, not color alone; the privacy note is associated with the fieldset.
- Sponsor logos have alt text; the OG image has an `alt` export; status badges pair color with text/icons.
- French copy is tested at 360px, 768px, and 1280px; controls wrap rather than clip, and icon-only controls keep `aria-label`.
- The door dashboard keeps a loading, empty, offline, and error state per CON-304.

## Edge Cases & Error States

| ID | Scenario | Expected Behaviour |
|---|---|---|
| EC-001 | Event has no cover image | The OG image uses the branded fallback with the event title, date, and theme color; no broken image is emitted. |
| EC-002 | Event title/venue is very long or contains emoji/RTL text | Metadata remains valid; the OG card truncates with an ellipsis; the page layout does not overflow. |
| EC-003 | Google Wallet credentials are missing or invalid | The wallet control is hidden or shows a recoverable error; the QR ticket remains fully usable; the reason is logged without secrets. |
| EC-004 | Google Wallet API times out, returns 5xx, or hits quota | The pass status becomes `failed`, a bounded retry is scheduled, no duplicate object is created, and the ticket is unaffected. |
| EC-005 | Registration is cancelled after a pass is issued | The pass is voided/expired, the pass shows a cancelled state, and check-in rejects the ticket. |
| EC-006 | Event is deleted after a pass is issued | The pass is voided/expired, the public page returns 404, and the next offline sync clears the event cache. |
| EC-007 | An already-checked-in ticket is scanned offline | The local UI warns "already checked in" with the cached timestamp; sync returns `already_checked_in` and the count is unchanged. |
| EC-008 | The same ticket is scanned offline on two devices | The first sync wins; the second returns `already_checked_in` with the original timestamp; no double count. |
| EC-009 | Attendee cancels after the offline snapshot was cached | The offline scan may show the cached confirmed state; sync rejects it as cancelled and the UI marks the item for correction. |
| EC-010 | The service worker updates while the queue has pending items | The queue is preserved in IndexedDB; sync continues after activation; no pending scan is lost. |
| EC-011 | IndexedDB is unavailable, quota is exceeded, or the browser is in private mode | Enabling offline mode fails with a clear message; online door mode still works and no partial cache is left behind. |
| EC-012 | A required question is added after registrations exist | Existing registrations remain valid; only new registrations must answer it; older rows export a blank value. |
| EC-013 | A question with answers is removed | The organizer must confirm; the question is archived, historical answers remain exportable, and new registrations no longer see it. |
| EC-014 | A question has an empty label, duplicate label, or fewer than two choice options | The definition is rejected inline and server-side; the previous valid definition remains. |
| EC-015 | An event has an unsupported currency or locale | The surface falls back to the platform default, shows a non-blocking notice, and never renders a raw key or crash. |
| EC-016 | French copy overflows a button, table, or card at 360px | Text wraps or truncates with an accessible full label; no control is clipped or pushed off-screen. |
| EC-017 | Event timezone differs from the viewer's device timezone | The event page/ticket shows the event timezone explicitly and does not shift the time to the device zone. |
| EC-018 | Event is past or far in the future | ISO 8601 dates remain valid, the OG image still renders, and no 500 is produced. |
| EC-019 | Sponsor logo upload has a wrong type or is too large | The upload is rejected with an accessible message; existing sponsors and the event are unchanged. |
| EC-020 | A legacy event/registration lacks all new fields | Platform defaults apply; wallet/door/question controls are hidden or disabled until configured; no migration failure. |

## Dependencies & Risks

### Dependencies

- **Google Wallet API** (external service): event-ticket class/object, save JWT, update/void. Requires a Google Wallet issuer account and a service account. See `https://developers.google.com/wallet/tickets/events`.
- **Apple Wallet / PassKit** (external, blocked): documented at `https://developer.apple.com/wallet/` and `https://developer.apple.com/documentation/walletpasses`; no Apple credentials are available, so no Apple issuance is implemented in v1.
- **Next.js 16 `next/og`** (built-in): `ImageResponse` for the Open Graph image. See the bundled guide `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`.
- **Next.js metadata/manifest conventions** (built-in): `generateMetadata`, `app/manifest.ts`, `metadataBase`. See the bundled `generate-metadata.md` and `manifest.md` guides.
- **`country-state-city`** (installed): full country/state/city options; no new location package.
- **Convex file storage** (installed): sponsor logo uploads.
- **`@convex-dev/rate-limiter`** (installed): wallet, door, and question/sponsor rate limits.
- **Browser platform APIs** (no package): IndexedDB, Service Worker, Web App Manifest, `Intl`.
- **Existing internal utilities**: `lib/csv.ts`, `lib/format.ts`, `convex/helpers.ts`, `convex/rateLimiter.ts`, `convex/platformData.ts`.
- **schema.org Event** (external vocabulary): `https://schema.org/Event`.
- **No new runtime dependency is approved by this spec** for PWA, i18n, or OG images. If the plan finds that Google Wallet signing needs a library, that dependency must be called out and approved in the plan rather than added silently.

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| RISK-001 | Apple Wallet cannot be delivered without an Apple Developer Pass Type ID and certificate | High | Medium | Keep Apple explicitly unavailable in v1; do not show an Apple control; revisit when credentials exist. |
| RISK-002 | Google Wallet issuer onboarding/verification or API policy changes delay launch | Medium | High | Gate live issuance on credentials; keep the QR ticket as the primary path; isolate the provider behind one module. |
| RISK-003 | Offline attendee data is PII on a shared or lost device | Medium | High | Explicit opt-in, single-event cache, cache-age display, sign-out/expiry deletion, manual clear, and no service-worker caching of rows. |
| RISK-004 | A stale service worker serves an old app shell or blocks updates | Medium | High | Versioned caches, update activation that preserves the queue, a kill switch, and an update test in the plan. |
| RISK-005 | French copy is incomplete or breaks layouts | Medium | Medium | Typed dictionaries, no hardcoded strings, a coverage check, fallback to English, and 360/768/1280 review. |
| RISK-006 | Currency changes are mistaken for FX conversion | Medium | High | Store amount + currency; document "display only, no conversion"; never rewrite existing amounts on a currency change. |
| RISK-007 | OG image generation adds latency or cost | Medium | Medium | Cache by event `updatedAt`, use a static fallback, limit fonts/assets, and keep metadata independent of the interactive body. |
| RISK-008 | Additive schema changes still break legacy rows or exports | Medium | High | Optional fields, platform-default fallbacks, no destructive backfill, and legacy-row coverage in the plan. |
| RISK-009 | Question edits orphan historical answers | Medium | High | Stable IDs, versioned definitions, archive instead of delete, and archived-label export columns. |
| RISK-010 | Door live queries become expensive at large events | Medium | Medium | Indexed counts, paginated recent check-ins, capped search results, and a batch sync limit. |

## Out of Scope

- **Apple Wallet issuance.** No Apple Pass Type ID certificate or signing credentials; Apple is not presented as available.
- **Event editing, rescheduling, and cancellation (BP-009).** Wallet update/void for a rescheduled event waits for that feature; v1 covers registration cancellation and event deletion.
- **Offline registration, offline payment, and offline event creation.** Offline mode is check-in only.
- **FX conversion, crypto payments, tax/VAT, and payment-provider changes.**
- **Machine translation of organizer content.**
- **File-upload questions, conditional logic, question quotas, waitlists, and ticketing tiers.**
- **SMS, WhatsApp, or push notifications for door mode.**
- **Sponsor analytics, ad serving, impression billing, and sponsor self-service.**
- **Multi-event offline caching and offline attendee search beyond the cached snapshot.**
- **Smart Tap/NFC and rotating barcodes.** The in-app QR and Google Wallet static barcode are the supported redemption paths.
- **Template editing UI for lifecycle emails.**

## Assumptions & Open Questions

### Assumptions

1. The Google Wallet issuer account and service-account credential will be provisioned before wallet ACs are implemented; if not, the wallet control stays unavailable and the rest of the feature ships.
2. Apple Wallet credentials are not available; Apple remains out of scope for v1.
3. Supported UI/system locales are English (`en`) and French (`fr`); supported event currencies are `NGN`, `USD`, `GBP`, and `EUR`.
4. Amounts remain in the currency's major unit in `ticketPrice`; no FX conversion is performed when an organizer changes currency.
5. Offline mode is check-in only, for one event per device, and only for confirmed attendees.
6. Custom questions are limited to ten active definitions and six types; file upload and conditional logic are excluded.
7. Sponsors are limited to six per event; logos are uploaded through Convex storage and rendered with alt text.
8. Existing events without currency/locale/country fields fall back to platform defaults; no destructive migration is required.
9. The public event route can be restructured behind a server wrapper without changing its URL or interactive behavior.
10. No new runtime dependency is required for PWA, i18n, or OG images; any Google Wallet signing library must be approved in the plan.
11. No new billing/Pro gate is introduced in this version; wallet and door are per-event capabilities, not a paywall change.
12. Admins may view door data only through an explicit admin path if the plan adds one; the default door authorization is the event organizer.

### Open Questions for Gate 1 Review

1. Confirm the Google Wallet issuer account and test credentials are available; otherwise the wallet ACs should be marked blocked/withdrawn in a later revision.
2. Confirm the French copy review owner and whether French is the only additional locale for this release.
3. Confirm the sponsor logo limit (six), maximum file size (proposed 2 MB), and accepted formats (PNG/JPEG/WebP).
4. Confirm the offline cache retention window (24 hours after the event ends) and whether the organizer can extend it.
5. Confirm the active-question limit (ten) and whether archived questions should count toward it.
6. Confirm whether wallet and door should be gated to a Pro plan in this version; this spec assumes no new billing gate.
7. Confirm whether administrators need a read-only door view or full check-in access; this spec defaults to organizer-only.

## Research & Standards

- Google Wallet event tickets — `https://developers.google.com/wallet/tickets/events` and redemption methods — `https://developers.google.com/wallet/tickets/events/use-cases/redemption-methods`.
- Apple Wallet overview — `https://developer.apple.com/wallet/`; PassKit documentation — `https://developer.apple.com/documentation/walletpasses`.
- schema.org Event — `https://schema.org/Event` (properties `startDate`, `endDate`, `eventStatus`, `location`, `organizer`, `offers`, `image`, `eventAttendanceMode`).
- Next.js Open Graph image convention — bundled guide `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`.
- Next.js metadata — bundled guide `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`; manifest — `.../03-file-conventions/01-metadata/manifest.md`.
- PWA offline data — `https://web.dev/learn/pwa/offline-data/`; Service Worker API — `https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API`; IndexedDB — `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API`.
- CSV injection — OWASP CSV Injection — `https://owasp.org/www-community/attacks/CSV_Injection` (the existing `lib/csv.ts` already implements the mitigation).
- RFC 2119 — `https://www.rfc-editor.org/rfc/rfc2119`.
- Project constitution — `.sdrive/constitution.md` (CON-101…CON-706).
- Backlog definitions — `.sdrive/product/backlog.md` (BP-005, BP-004, BP-003, BP-007, BP-014).

## Traceability

- `traceability.json` contains one row per FR/NFR and maps each to its acceptance criteria.
- At Gate 1, `taskIds` and test IDs are intentionally empty: tasks belong to Gate 2, and tests belong to `/sdrive:test`. This spec does not author or execute tests.
- Coverage: 31 functional requirements, 14 non-functional requirements, and 34 acceptance criteria. Every acceptance criterion is linked to at least one requirement; every requirement links to at least one acceptance criterion.
- The machine-readable `spec.json` is the canonical structured copy; this Markdown document is the human review copy. If they differ, `spec.json` is authoritative for validation and this document MUST be corrected before approval.

## Gate 1 Checklist

- [x] Feature name, branch (`feature/event-platform-expansion`), and base (`main`) recorded.
- [x] Five product items recorded with scope boundaries.
- [x] Nine user stories and 34 acceptance criteria.
- [x] 31 functional requirements and 14 non-functional requirements.
- [x] Edge cases, dependencies, risks, assumptions, and open questions.
- [x] Security baseline and accessibility requirements.
- [x] Data model and surface changes identified.
- [x] `spec.json` and `traceability.json` written.
- [ ] Human approval of Gate 1 — **pending**. No `plan.md`, `tasks.md`, code, commit, or push until approved.
