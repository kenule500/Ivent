# Execution Tasks: Admin Console and Governance

> Retroactive record: every task documents work already present in the codebase
> or a gate check performed on 2026-10-18, so all tasks are marked complete.

## P1 — Access control

- [x] **T1.1** Build the admin shell, sign-in, signup, and client guard.
  - Linked: FR-001, NFR-001, AC-001
  - Layout, sidebar/drawer, `/admin` sign-in, invite signup, redirect behaviour.
- [x] **T1.2** Enforce `requireAdmin` in every admin Convex function.
  - Linked: FR-001, NFR-001, AC-001
  - Token lookup, role check, and consistent error messages.

## P2 — Moderation

- [x] **T2.1** Build the dashboard totals.
  - Linked: FR-002, NFR-004, AC-002
  - Users, events, registrations, upcoming events, loading and error states.
- [x] **T2.2** Build user management.
  - Linked: FR-003, AC-003
  - Search, ban/unban with admin protection, super-admin-only role change.
- [x] **T2.3** Build event oversight.
  - Linked: FR-004, NFR-003, AC-004
  - Search, detail dialog, cascading delete, `event.deleted` audit entry.
- [x] **T2.4** Build registration oversight.
  - Linked: FR-005, NFR-004, AC-005
  - Status listing, filtering, and confirmed-row cancel action.

## P3 — Invitations

- [x] **T3.1** Implement invite generation and email.
  - Linked: FR-006, NFR-002, NFR-003, AC-006
  - Super-admin check, rate limit, seven-day expiry, upsert by email, Resend action.
- [x] **T3.2** Implement invite acceptance.
  - Linked: FR-007, NFR-003, AC-007
  - Status/expiry/code validation and promotion to `admin`.
- [x] **T3.3** Implement revoke, delete, and resend.
  - Linked: FR-008, NFR-003, AC-008
  - Super-admin checks, accepted-invite protection, code regeneration, audit entries.
- [x] **T3.4** Add the daily expiry cron.
  - Linked: FR-008, NFR-002, AC-008
  - Mark pending invites past `expiresAt` as expired at 00:00 UTC.

## P4 — Observability and settings

- [x] **T4.1** Build the audit log.
  - Linked: FR-009, NFR-003, AC-009
  - Append-only entries, search, action filter, total/24h/7d counts.
- [x] **T4.2** Build analytics.
  - Linked: FR-010, AC-010
  - User/event growth, registration trend, category, top events, city, summary.
- [x] **T4.3** Build admin settings.
  - Linked: FR-011, AC-011
  - Profile display and four email preferences with persistence.

## P5 — Verification

- [x] **T5.1** Run ESLint.
  - Linked: NFR-005
  - Result (2026-10-18): passes with 0 errors and 14 warnings after ignoring
    `.sdrive/**` and `convex/_generated/**` and deferring the carousel's initial
    select to the next frame.
- [x] **T5.2** Run TypeScript checking.
  - Linked: NFR-005
  - Result: `npx tsc --noEmit` exits 0.
- [x] **T5.3** Run SpecDrive governance validation.
  - Linked: NFR-005
  - Result: all present artifacts valid.


## P6 — Fix review findings

- [x] **T6.1** Extend spec-to-code verification to convex/.
  - Linked: NFR-005
  - Add convex/ to the verifier source roots and resolve Convex schema fields so verify reports pass for Convex-backed features.
- [x] **T6.2** Upgrade dependencies with critical or high advisories.
  - Linked: NFR-003
  - Upgrade next, undici, proxy-addr, shell-quote, image-size, js-yaml, fast-uri and related transitive packages, then re-run npm audit until no critical or high production advisories remain.
