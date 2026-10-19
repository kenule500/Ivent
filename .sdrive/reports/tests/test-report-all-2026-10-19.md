# Test Report: All Ongoing Features (v1)

## 1. Summary
- **Date:** 2026-10-19
- **Command:** `/sdrive:test --all`
- **Features tested:** 4
- **Total tests:** 103
- **Passed:** 99
- **Failed:** 4
- **Result:** 1 feature passed, 3 incomplete, 0 blocked, 0 skipped

| Feature | Version | Total ACs | Tested ACs | Coverage | Tests Passed | Status |
|---------|---------|-----------|------------|----------|--------------|--------|
| event-discovery-and-registration | v1 | 13 | 13 | 100% | 26/28 | ⚠️ Incomplete |
| event-management-and-check-in | v1 | 9 | 9 | 100% | 26/27 | ⚠️ Incomplete |
| admin-console-and-governance | v1 | 11 | 11 | 100% | 38/38 | ✅ Pass |
| ai-event-creation | v1 | 5 | 5 | 100% | 9/10 | ⚠️ Incomplete |

## 2. Findings

| # | AC | Finding | Severity |
|---|----|---------|----------|
| 1 | AC-007 (event-management-and-check-in) | Failed QR scans do not consume the rate-limit token because the rejected mutation rolls the token write back. An attacker can brute-force ticket codes without ever reaching the 10-per-minute limit. | High (security) |
| 2 | AC-006 (event-discovery-and-registration) | The organizer CTA compares the Clerk `user.id` with the Convex `organizerId`; they are different identifiers, so organizers never see "Manage Event". | Medium |
| 3 | AC-005 (ai-event-creation) | The client ignores `response.ok`. A 500 body is treated as generated data, a success toast is shown, the dialog closes, and `onEventGenerated` receives `{ error }`. | Medium |
| 4 | AC-002 (event-discovery-and-registration) | The featured carousel and "Events Near You" section have no per-section empty state; the local section disappears entirely when empty. | Low |

## 3. Coverage Method
- Every acceptance criterion ID appears in at least one test name.
- Convex functions run in-memory with the real schema and the registered rate-limiter component (`convex-test`).
- Page tests run under jsdom with only the framework boundary mocked (Convex hooks, Clerk, `next/navigation`, `next/image`, and presentational carousel/card primitives).
- Machine-readable results: `.sdrive/reports/tests/raw/results.json`.

## 4. Verification
- `node .sdrive/onboarding/validate.js`: **PASS** — all governance JSON is valid after the traceability update.
- `sdrive verify ai-event-creation`: **PASS**.
- `sdrive verify event-discovery-and-registration`, `event-management-and-check-in`, `admin-console-and-governance`: **FAIL** — these reports flag Convex modules and schema fields as missing/renamed because the verifier's source-root list does not include `convex/` and it does not parse `convex/schema.ts`. This is a verifier limitation, not code drift; the affected files exist and are exercised by the test suite.
- The SpecDrive slash-command router still denies `/sdrive:test` in this environment because `check-permission.js` shells out to `git config` and the sandbox blocks piped child processes (`EPERM`). The run proceeded under the user's explicit approval; `team.json` now contains `kenule500` as `admin`.

## 5. Recommendation
Fix the four findings, then run `/sdrive:review --all` to audit every ongoing feature.
