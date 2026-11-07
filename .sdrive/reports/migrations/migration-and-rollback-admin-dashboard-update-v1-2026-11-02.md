# Migration & Rollback Notes: Admin Dashboard Update (v1)

**Task:** T7.4 — Record migration and rollback notes for the Convex schema change
**Date:** 2026-11-02
**Feature version:** v1
**Scope:** `convex/schema.ts` and the backend functions that write to it.

## 1. Summary

This release is **additive and forward-compatible**. The Convex schema grew from
5 tables to 12: seven tables and six indexes added, one index added to an existing
table, and two union validators (`auditLogs.action`, `auditLogs.targetType`)
extended with new literals. No existing table, column, index, or literal was
removed or renamed, and **no data backfill is required or performed**. Rolling the
application code back after a schema deploy is safe; rolling the *schema* back is
only safe before any new rows are written (see §4).

## 2. What Changed

### 2.1 Tables added (7)
| Table | Purpose | Written by |
|-------|---------|-----------|
| `platformSettings` | singleton (`key = "global"`) platform defaults, flags, maintenance mode | `convex/platform.ts` |
| `announcements` | broadcast record (audience, counts, status) | `convex/announcements.ts` |
| `announcementDeliveries` | per-recipient delivery outcome | `convex/announcements.ts` |
| `feedback` | support/abuse reports with admin notes and status | `convex/feedback.ts` |
| `emailEvents` | email delivery log (invite + announcement) | `convex/emailLog.ts` |
| `cronRuns` | cron heartbeat (last run, status, processed) | `convex/crons.ts` |
| `rateLimitRejections` | rate-limit rejection signal for health | `convex/helpers.ts` (`consumeRateLimit`) |

### 2.2 Indexes added
New tables: `platformSettings.by_key`; `announcements.by_createdAt`, `announcements.by_status`;
`announcementDeliveries.by_announcement`, `announcementDeliveries.by_status_createdAt`;
`feedback.by_status_createdAt`, `feedback.by_type`, `feedback.by_event`, `feedback.by_user`;
`emailEvents.by_createdAt`, `emailEvents.by_status_createdAt`; `cronRuns.by_name`.

Existing table: **`users.by_createdAt`** (`users` already existed on `main`; only this
index is new). Note: the plan also listed `registrations.by_registeredAt` and
`registrations.by_event_status` — those **already existed on `main`** and are reused,
not added.

### 2.3 Union validators extended (existing table, additive only)
`auditLogs.action` += `settings.updated`, `announcement.sent`, `feedback.updated`,
`feedback.deleted`, `export.generated`, `maintenance.changed`.
`auditLogs.targetType` += `settings`, `announcement`, `feedback`, `export`.

A Convex union validator is checked at write time. Adding literals **widens** what a
new write may contain; it does not invalidate any existing row, because existing rows
were written under the narrower union and remain a subset of the wider one. This is
the reason the change is safe — and the reason the deploy order in §3 still matters.

## 3. Deploy Order (required)

1. **Deploy the schema first** (`convex deploy` / push), then the application code.
   If code that writes `announcement.sent` lands before the schema widens
   `auditLogs.action`, those writes are **rejected by the validator** — this is
   exactly `RISK-003` in `spec.json` ("Adding literals to the auditLogs unions is a
   schema change that can reject old documents if deployed out of order"), and its
   stated mitigation is "deploy schema first".
2. Because the unions are only **widened**, the schema deploy is backward-compatible
   with the currently-running `main` code, so there is no window in which old code
   breaks. A single `convex deploy` that includes both is acceptable; a schema-only
   deploy followed by an app deploy is not required, but is safe.
3. **No backfill.** No existing row needs rewriting; `RISK-003`'s mitigation says
   "backfill no existing rows". Do not run a migration script for this release.
4. **New tables start empty.** `platformSettings` is a singleton created lazily on
   first save (`convex/platform.ts` `updateSettings`); until then every reader falls
   back to USD / UTC defaults (`getPlatformTimezone` returns `"UTC"` when the row is
   absent). This is the intended first-run behaviour (edge case EC-016), not an error.

## 4. Rollback

### 4.1 Application-code rollback (safe at any time)
Reverting the app code to `main` (or redeploying the previous build) is safe:
- The new tables are simply not queried by old code; extra unused tables are inert.
- The widened `auditLogs` unions accept everything old code writes, because old code
  only writes the original literals, which remain in the union.
- Existing behaviour (`users`, `events`, `registrations`, `adminInvites`, `auditLogs`)
  is unchanged by this feature.
No data repair is needed after a code rollback.

### 4.2 Schema rollback (only safe if no new rows were written)
Rolling `convex/schema.ts` back to the `main` version removes the 7 tables and the
added literals. Convex **does not delete data on a schema change**, so:
- If **no** documents exist in the removed tables and **no** audit rows use the new
  literals: the schema rollback is clean.
- If new rows *were* written: do not roll the schema back expecting them to vanish.
  The safest rollback is to **leave the schema as-is and roll back only the app code**
  (§4.1). Removing a table from the schema while documents still exist leaves those
  documents unreachable-or-invalid, which is worse than an unused table.

**Recommended rollback in production:** revert the application deployment; keep the
additive schema. Delete the new tables' contents only if a privacy/retention decision
requires it (see §6), via an audited admin action — not by editing the schema.

### 4.3 Feature-flag kill switches (preferred over rollback)
The feature ships flags in `platformSettings.featureFlags`
(`commandPalette`, `reports`, `broadcasts`, `feedbackInbox`, `systemHealth`) plus
`maintenanceMode`. To disable a misbehaving module **without** a deploy or rollback,
turn its flag off: `FR-026` requires a disabled flag to hide the module from
navigation **and** reject its server query. On the server that rejection is
`requireModuleEnabled` in `convex/platformData.ts`, which throws
"This module is not enabled (feature flag: <name>)." before the handler runs. This is the first response to a runtime
problem in any new module, ahead of any rollback.

## 5. Verification After Deploy

1. `convex deploy` completes without a validator error.
2. A super-admin save on `/admin/platform` creates the `platformSettings` singleton
   and writes a `settings.updated` audit row (proves the widened union is live).
3. Each new module opens once: announcements, feedback, health, reports — proves the
   new tables are readable.
4. Confirm the six named indexes exist in the Convex dashboard (Data → Indexes).
5. Run `sdrive verify admin-dashboard-update` — see the known `T6.1` blind spot;
   it does not scan `convex/`, so a `fail` here is the recorded false negative, not
   this migration.

## 6. Data Retention (unchanged by this task)

Per the spec, `feedback` and `announcements` are internal operational data retained
until an **explicit, audited** deletion (NFR-016). This migration introduces no TTL
and no automatic purge: do not add one without a retention decision, and audit every
deletion (`feedback.deleted` is already in the union).

## 7. Residual Risk

- **RISK-003** (schema/union ordering) is mitigated by the deploy order in §3 and by
  the additive-only change; the mitigation is documented, not code-enforced.
- No migration script exists or is needed; therefore there is nothing to fail halfway.
- These notes are a **record**, not a tested migration: no Convex deployment was
  available in this environment, so the deploy in §5 has **not** been executed here.
