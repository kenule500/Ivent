---
title: Admin Console and Governance
status: completed
version: v1
created: 2026-10-18
updated: 2026-10-18
retroactive: true
---

# Admin Console and Governance

> **Retroactive document.** Written after the fact from the existing
> implementation. It records current behaviour, not a new product decision.

## Overview

- **Problem Statement**: Operators need a restricted back office to manage users,
  events, registrations, and admin access, and to answer "who did what" without
  reading the database by hand.
- **Proposed Solution**: A role-gated `/admin` area (Clerk sign-in, invite-only
  signup, client guard plus server `requireAdmin`), dashboard totals, user/event/
  registration management, a rate-limited invite lifecycle with Resend email and
  a daily expiry cron, an append-only audit log, analytics queries, and admin
  email preferences.
- **Target Audience**: Ivent staff with the `admin` or `super_admin` role.
- **Assumptions**:
  - `super_admin` is the only role that may change roles, generate/revoke/delete/
    resend invites; `admin` can view and moderate non-admin users.
  - Invite emails are sent by the client after the invite record is generated.
  - Analytics are computed on read over full collections; no warehouse exists.
- **Out of Scope**:
  - Editing an event from the admin console.
  - Granular per-permission roles beyond `user`, `admin`, `super_admin`.
  - Exporting audit logs or analytics.

## User Stories

### US-001: Restrict the back office to administrators
As an operator, I want the admin area restricted, so that ordinary users cannot read or change platform data.

**Acceptance Criteria:**
- AC-001: Given a signed-out visitor or a `user`, then `/admin/*` redirects to `/admin` and the guard renders no protected content; given `admin` or `super_admin`, then the console renders; every admin Convex function also calls `requireAdmin`.

### US-002: See platform totals
As an admin, I want a dashboard, so that I can see the size of the platform at a glance.

**Acceptance Criteria:**
- AC-002: Given I open `/admin/dashboard`, then I see total users, total events, total registrations, and upcoming event counts, with a loading state and an access-denied state on error.

### US-003: Moderate users
As an admin, I want to search users and control bans and roles, so that abusive accounts and staffing changes are handled.

**Acceptance Criteria:**
- AC-003: Given the users page, then I can search by name or email and see role and ban state; I can ban/unban a non-admin user, while banning another admin is rejected; only a `super_admin` can change a user's role.

### US-004: Oversee events
As an admin, I want to inspect and delete any event, so that policy violations can be removed.

**Acceptance Criteria:**
- AC-004: Given the events page, then events are listed and searchable by title; deleting one requires confirmation, removes its registrations, and writes an `event.deleted` audit entry.

### US-005: Oversee registrations
As an admin, I want to review registrations and cancel a ticket, so that attendance can be corrected.

**Acceptance Criteria:**
- AC-005: Given the registrations page, then rows show attendee, event, and status, and a confirmed row offers a cancel action with confirmation.

### US-006: Invite new administrators
As a super admin, I want to invite admins by email, so that access is granted deliberately.

**Acceptance Criteria:**
- AC-006: Given a super admin submits an email, then a pending invite with a 7-day expiry is created or refreshed, generation is limited to ten per minute, and the invites page can send the code by email through Resend.

### US-007: Accept an invite
As an invited person, I want to sign up with my code, so that I become an admin.

**Acceptance Criteria:**
- AC-007: Given a signed-in user submits an email and matching pending, unexpired code, then the invite becomes accepted and the user's role becomes `admin`; missing, accepted, revoked, expired, or mismatched codes are rejected.

### US-008: Manage the invite lifecycle
As a super admin, I want to revoke, delete, resend, and expire invites, so that access does not linger.

**Acceptance Criteria:**
- AC-008: Given a pending or expired invite, a super admin can revoke it, delete it, or resend a new code with a new expiry; accepted invites cannot be revoked, deleted, or resent; the daily cron marks pending invites past their expiry as expired.

### US-009: Audit administrative actions
As an admin, I want an audit trail, so that changes are attributable.

**Acceptance Criteria:**
- AC-009: Given an administrative mutation, then an `auditLogs` entry records actor, action, target, label, optional metadata, and time; the audit page supports text search and action filtering and shows total, 24-hour, and 7-day counts.

### US-010: Read analytics
As an admin, I want analytics, so that growth and demand are visible.

**Acceptance Criteria:**
- AC-010: Given the analytics page, then user growth, event growth, registration trend, events by category, top events, events by city, and summary metrics are available for the selected window.

### US-011: Control admin email preferences
As an admin, I want to choose which notification emails I receive, so that my inbox stays useful.

**Acceptance Criteria:**
- AC-011: Given the settings page, then I can view and update the four boolean preferences (`emailOnNewEvent`, `emailOnNewRegistration`, `emailOnNewAdminInvite`, `emailOnNewUser`) and they persist on my user record.

## Requirements

### Functional Requirements
- FR-001: The admin area MUST be restricted to `admin` and `super_admin` on both the client and the Convex server. (AC-001)
- FR-002: The dashboard MUST report total users, events, registrations, and upcoming events. (AC-002)
- FR-003: User management MUST support search, ban/unban, and role change with the documented role rules. (AC-003)
- FR-004: Event management MUST support listing, search, cascading delete, and audit logging. (AC-004)
- FR-005: Registration management MUST list registrations and expose a confirmed-row cancel action. (AC-005)
- FR-006: Invite generation MUST be super-admin-only, rate-limited, seven-day expiring, and emailable. (AC-006)
- FR-007: Invite acceptance MUST validate status, expiry, and code before promoting the user to `admin`. (AC-007)
- FR-008: Invite lifecycle MUST support revoke, delete, resend, and daily expiry. (AC-008)
- FR-009: Administrative mutations MUST write audit entries, and the audit page MUST support search, filter, and summary counts. (AC-009)
- FR-010: Analytics MUST expose growth, trend, category, top-event, city, and summary queries. (AC-010)
- FR-011: Admin settings MUST persist the four email preferences. (AC-011)

### Non-Functional Requirements
- NFR-001: Every admin Convex function MUST call `requireAdmin`; the client guard is defense in depth only. (AC-001)
- NFR-002: Invite generation MUST be rate-limited and invites MUST expire after seven days. (AC-006)
- NFR-003: Administrative mutations that change users, events, invites, or registrations MUST create an audit entry. (AC-004, AC-009)
- NFR-004: Admin screens MUST remain usable at a 360px viewport with loading and empty states. (AC-002, AC-005)
- NFR-005: The feature MUST pass ESLint, TypeScript checking, and SpecDrive governance validation. (AC-002)

## UI/UX & Data Requirements

- **UI/UX**: Admin sidebar (desktop) and drawer (mobile); tables with search, badges, pagination, and confirmation modals; stat cards; Recharts analytics; settings switches; toast feedback.
- **Data**: `users.role`/`banned`/`preferences`, `adminInvites` (status, expiry, creator, acceptor, revoker), `auditLogs` (actor, action, target, label, metadata, time).

## Edge Cases & Error States

- EC-001: A non-admin calls an admin function → "Admin access required".
- EC-002: An admin tries to ban another admin → rejected.
- EC-003: A non-super-admin tries to change a role or manage invites → rejected.
- EC-004: An invite is accepted, revoked, or expired → the relevant action is rejected.
- EC-005: An invite email fails to send → the invite record remains; the failure surfaces to the caller.
- EC-006: No users, events, registrations, or audit entries → empty states render.
- EC-007: An admin cancels another user's registration → the attendee ownership check currently rejects it (known gap; see risks).

## Dependencies & Risks

- Clerk (admin sign-in), Convex (data, cron, rate limiter), Resend (invite email), Recharts (analytics), date-fns, Tailwind.
- RISK-001: The admin registrations page calls the attendee `cancelRegistration` mutation, which requires `registration.userId === ctx.user._id`; an admin therefore cannot cancel another user's ticket, and no `registration.cancelled` audit entry is written.
- RISK-002: `getAllUsers` searches only the first 100 users returned by the query, so search can miss accounts once the user base grows.
- RISK-003: `requireAdmin` re-queries the user on every call; acceptable at current scale but a hot path as data grows.
- RISK-004: Analytics reads whole collections on each query; this will not scale indefinitely.

## Verification Status (2026-10-18)

- SpecDrive governance validation: **passes** for spec, plan, tasks, and traceability.
- `npx tsc --noEmit`: **passes** (exit 0).
- `npm run lint`: **passes** with 0 errors and 14 warnings after the follow-up
  fix in this session (ignore `.sdrive/**` and `convex/_generated/**` in the flat
  config, and defer the carousel's initial select to the next frame). NFR-005 is
  recorded as `complete`.
