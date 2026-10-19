# Test Report: Admin Console and Governance (v1)

## 1. Summary
- **Date:** 2026-10-19
- **Feature:** admin-console-and-governance
- **Version:** v1
- **Total ACs:** 11
- **Tested ACs:** 11
- **Coverage:** 100%
- **Tests Passed:** 38/38

## 2. AC → Test Mapping
| AC ID | Test ID | File | Status |
|-------|---------|------|--------|
| AC-001 | TEST-001 | test/admin-console-and-governance/access.test.ts | ✅ Pass |
| AC-002 | TEST-002 | test/admin-console-and-governance/dashboard.test.ts | ✅ Pass |
| AC-003 | TEST-003 | test/admin-console-and-governance/users.test.ts | ✅ Pass |
| AC-004 | TEST-004 | test/admin-console-and-governance/events.test.ts | ✅ Pass |
| AC-005 | TEST-005 | test/admin-console-and-governance/registrations.test.tsx | ✅ Pass |
| AC-006 | TEST-006 | test/admin-console-and-governance/invites.test.ts | ✅ Pass |
| AC-007 | TEST-007 | test/admin-console-and-governance/invites.test.ts | ✅ Pass |
| AC-008 | TEST-008 | test/admin-console-and-governance/invites.test.ts | ✅ Pass |
| AC-009 | TEST-009 | test/admin-console-and-governance/audit.test.ts | ✅ Pass |
| AC-010 | TEST-010 | test/admin-console-and-governance/analytics.test.ts | ✅ Pass |
| AC-011 | TEST-011 | test/admin-console-and-governance/settings.test.ts | ✅ Pass |

## 3. Failures
| Test | Reason | Blocking |
|------|--------|----------|
| — | No failing tests. | — |

## 4. Notes
- AC-001 is covered twice: the guard component (admin, super admin, ordinary user, signed-out) and `requireAdmin` at the Convex boundary.
- AC-002 is covered by the dashboard page (totals, loading, access-denied with redirect) and the stats query.
- AC-005 renders the real registrations table and the real cancel-confirmation dialog, then asserts the mutation payload.
- AC-004's destructive-action confirmation on the admin events page, and AC-006's actual Resend email send, were not driven end-to-end; the cascade delete, audit fields, invite expiry/rate limit and audit entries are covered at the Convex boundary.
- Observed but outside the AC wording: `verifyInviteCode` patches an expired invite to `expired` and then throws, so the patch is rolled back. The invite is still rejected correctly, and the nightly cron is what actually persists the expired status (tested).
