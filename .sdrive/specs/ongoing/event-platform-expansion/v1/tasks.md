# Tasks: Event Platform Expansion (v1)

> Production tasks only. Test authoring and test execution are owned by
> `/sdrive:test`; no task below writes or runs a test file.

## P0 — Foundation, schema, and shared contracts

- [ ] **T1.1** Extend the Convex schema and audit unions — FR-004, FR-009, FR-016, FR-020, FR-025, FR-026 / NFR-010, NFR-014 / AC-004, AC-010, AC-016, AC-020, AC-026, AC-027, AC-030
- [ ] **T1.2** Add shared constants, validators, and typed contracts — FR-020, FR-025, FR-026, FR-027, FR-028 / NFR-006 / AC-020, AC-026, AC-027, AC-034
- [ ] **T1.3** Enforce authorization and rate-limit buckets for new mutations — FR-008, FR-018 / NFR-001, NFR-005 / AC-009, AC-018
- [ ] **T1.4** Add English/French dictionary scaffolding and locale resolution — FR-029, FR-030, FR-031 / NFR-011 / AC-031, AC-032, AC-033, AC-034
- [ ] **T1.5** Add event-aware currency/date formatting helpers — FR-027, FR-028 / AC-028, AC-029

## P1 — Share-ready event page and sponsors

- [ ] **T2.1** Add server metadata to the public event route — FR-001 / NFR-007 / AC-001
- [ ] **T2.2** Generate per-event Open Graph images — FR-002 / NFR-007 / AC-002
- [ ] **T2.3** Add escaped `schema.org/Event` JSON-LD — FR-003 / NFR-006 / AC-003
- [ ] **T2.4** Add sponsor persistence and upload validation — FR-004, FR-005 / NFR-006, NFR-013 / AC-004, AC-005, AC-006
- [ ] **T2.5** Build the sponsor editor and public sponsor strip — FR-004, FR-005 / NFR-009 / AC-004, AC-005, AC-006

## P2 — Live and offline door mode

- [ ] **T3.1** Add indexed door snapshot and attendee search queries — FR-006, FR-007 / NFR-008, NFR-014 / AC-007, AC-008
- [ ] **T3.2** Extend check-in outcomes and add idempotent batch sync — FR-007, FR-011 / NFR-004, NFR-005, NFR-014 / AC-008, AC-012
- [ ] **T3.3** Build the live door-mode dashboard — FR-006, FR-007, FR-008 / NFR-009 / AC-007, AC-008, AC-009
- [ ] **T3.4** Add the web manifest and service worker — FR-013 / NFR-012 / AC-014
- [ ] **T3.5** Add the IndexedDB attendee cache and opt-in flow — FR-009 / NFR-003 / AC-010, AC-013
- [ ] **T3.6** Add the offline scan queue and sync client — FR-010, FR-011 / NFR-004, NFR-008 / AC-011, AC-012
- [ ] **T3.7** Add offline data cleanup and expiry — FR-012 / NFR-003 / AC-013

## P3 — Google Wallet passes

- [ ] **T4.1** Add the server-only Google Wallet provider and credential handling — FR-014, FR-015 / NFR-002 / AC-015, AC-018
- [ ] **T4.2** Add idempotent pass issuance and registration wallet state — FR-015, FR-016 / NFR-004 / AC-015, AC-016
- [ ] **T4.3** Add pass void/expire on cancellation and event deletion — FR-017, FR-018 / NFR-013 / AC-017, AC-018
- [ ] **T4.4** Add the ticket wallet control and unavailable-Apple state — FR-014, FR-019 / AC-015, AC-018, AC-019

## P4 — Custom registration questions

- [ ] **T5.1** Add question definition validation, versioning, and event persistence — FR-020, FR-022 / NFR-001, NFR-006, NFR-013 / AC-020, AC-021
- [ ] **T5.2** Build the organizer question builder and preview — FR-020, FR-022 / NFR-009 / AC-020, AC-021
- [ ] **T5.3** Add answer validation, storage, and the registration form fields — FR-021, FR-024 / NFR-006, NFR-009 / AC-023, AC-024, AC-025
- [ ] **T5.4** Add per-question columns to the registration CSV export — FR-023 / NFR-006, NFR-014 / AC-022

## P5 — Currency, locations, and localization

- [ ] **T6.1** Add platform locale/currency settings and admin controls — FR-025 / NFR-010, NFR-013 / AC-026, AC-030
- [ ] **T6.2** Add event currency, country code, and full location/timezone selection — FR-026 / NFR-010 / AC-027, AC-030
- [ ] **T6.3** Migrate event surfaces to event-aware currency and timezone formatting — FR-027, FR-028 / AC-028, AC-029
- [ ] **T6.4** Add the UI locale switcher, cookie persistence, and French dictionary — FR-029, FR-030 / NFR-011 / AC-031, AC-032, AC-034
- [ ] **T6.5** Localize lifecycle email templates and select the registration locale — FR-029, FR-031 / NFR-011 / AC-031, AC-033
- [ ] **T6.6** Add fallback notices and French layout safeguards — FR-030, FR-031 / NFR-009, NFR-011 / AC-032, AC-034

## P6 — Verification and governance

- [ ] **T7.1** Run formatter, linter, and typecheck — NFR-006, NFR-009, NFR-010
- [ ] **T7.2** Run governance validation and `sdrive verify` — NFR-001, NFR-010
- [ ] **T7.3** Manually check responsive, keyboard, and French layouts — NFR-009, NFR-011 / AC-032
- [ ] **T7.4** Confirm HTTPS/HSTS and PWA deployment prerequisites — NFR-012 / AC-014
