# Technical Plan: Admin Console and Governance

> Retroactive plan reconstructed from the existing implementation.

## Approach

The `/admin` route segment is a client-rendered console guarded by `AdminGuard`
(which redirects non-admins to `/admin`) and by `requireAdmin` inside every
admin-only Convex function. Clerk supplies the session; Convex stores roles on
the `users` row. Invitations, audit logging, analytics, and preferences are plain
Convex modules. Resend sends invite email from a Convex action, and a daily cron
expires pending invites.

## Components

| Component | Action | Responsibility |
| --- | --- | --- |
| `app/admin/layout.tsx` | reuse | Sidebar/drawer shell and guard wiring. |
| `components/AdminGuard.tsx` | reuse | Client-side role gate and redirect. |
| `components/AdminSidebar.tsx` | reuse | Admin navigation. |
| `app/admin/page.tsx` | reuse | Clerk sign-in for admins. |
| `app/admin/signup/page.tsx` | reuse | Invite-code admin signup. |
| `app/admin/dashboard/page.tsx` | reuse | Platform totals. |
| `app/admin/users/page.tsx` | reuse | User table, ban and role actions. |
| `app/admin/events/page.tsx` | reuse | Event table, details, delete. |
| `app/admin/registrations/page.tsx` | reuse | Registration table and cancel action. |
| `app/admin/invites/page.tsx` | reuse | Invite generation and lifecycle UI. |
| `app/admin/audit/page.tsx` | reuse | Audit search, filter, and stats. |
| `app/admin/analytics/page.tsx` | reuse | Analytics charts and summary cards. |
| `app/admin/settings/page.tsx` | reuse | Admin profile and email preferences. |
| `convex/admin.ts` | reuse | Totals, users, events, registrations, invites. |
| `convex/audit.ts` | reuse | `logAdminAction` and audit queries. |
| `convex/analytics.ts` | reuse | Growth, trend, category, top, city, summary. |
| `convex/settings.ts` | reuse | Admin profile and preference update. |
| `convex/emails.ts` | reuse | Resend invite email action. |
| `convex/crons.ts` | reuse | Daily expiry of pending invites. |
| `convex/helpers.ts` | reuse | `requireAdmin` and authenticated user resolution. |
| `components/admin/*` | reuse | Tables, stat cards, pagination, modals, charts. |

## Data Model

- `users`: `role` (`user|admin|super_admin`), `banned`, `preferences` (four
  booleans), `updatedAt`. No new fields are required.
- `adminInvites`: `email`, `inviteCode`, `status`
  (`pending|accepted|expired|revoked`), `createdBy`, `createdAt`, `expiresAt`,
  `acceptedBy`, `acceptedAt`, `revokedBy`, `revokedAt`.
- `auditLogs`: `actorId`, `actorName`, `actorEmail`, `action` (nine literals),
  `targetType`, `targetId`, `targetLabel`, `metadata`, `createdAt`.

## Flow

1. A visitor signs in at `/admin`; `AdminGuard` reads the current user and
   redirects anyone whose role is not `admin`/`super_admin`.
2. Admin pages call Convex functions, each of which calls `requireAdmin` before
   returning data or mutating.
3. A super admin generates an invite; the invites page can call
   `emails.sendInviteEmail`. The invited user signs up at `/admin/signup`; the
   code is verified and the role becomes `admin`.
4. Mutations that change users, events, or invites call `logAdminAction`.
5. The cron marks pending invites past `expiresAt` as `expired` daily at 00:00 UTC.

## Security

- NFR-001: `requireAdmin` re-reads the user through `by_token` and checks the
  role on every call; the client guard is not the authorization boundary.
- NFR-002: `generateInviteRateLimit` is a fixed window of 10 requests/60s, and
  every invite carries `now + 7 days`.
- Invite codes are `ADMIN-<timestamp>-<8 random UUID chars>`.

## Performance

- Admin list queries cap at 100 rows by default and filter in memory.
- Analytics and audit read full collections; acceptable at current volume.

## Dependencies

Clerk, Convex, Resend, Recharts, date-fns, lucide-react. All are installed.

## Risks

- Admin cancellation currently routes through the attendee mutation, so it fails
  for another user's ticket and is not audited.
- User search is limited to the first 100 rows.
