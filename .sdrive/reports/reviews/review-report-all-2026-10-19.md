# Review Report: All Ongoing Features (v1)

## 1. Run Summary
- **Date:** 2026-10-19
- **Command:** `/sdrive:review --all`
- **Total features:** 4
- **Passed:** 0
- **Failed:** 4
- **Skipped:** 0
- **Verdict:** Release blocked for every feature.

| Feature | Version | Audit Status | Coverage | Recommended Next Step |
|---------|---------|--------------|----------|-----------------------|
| event-discovery-and-registration | v1 | ❌ FAIL | 85% (11/13) | Fix T5.1/T5.2, then `/sdrive:test` and re-review |
| event-management-and-check-in | v1 | ❌ FAIL | 89% (8/9) | Fix T5.1, then `/sdrive:test` and re-review |
| admin-console-and-governance | v1 | ❌ FAIL | 100% (11/11) | Clear T6.1/T6.2, then re-review |
| ai-event-creation | v1 | ❌ FAIL | 80% (4/5) | Fix T4.1, then `/sdrive:test` and re-review |

## 2. Shared Blockers

| Blocker | Evidence | Fix task |
|---------|----------|----------|
| Critical/high dependency advisories | `npm audit`: 5 critical, 29 high (3 critical, 27 high with `--omit=dev`); critical production packages include `next`, `proxy-addr`, `shell-quote`. | T6.2 (admin-console-and-governance) |
| Spec-to-code verification cannot pass Convex features | `sdrive verify` fails for three features because `.sdrive/scripts/verify.js` does not scan `convex/` or resolve `convex/schema.ts`; the fourth (ai-event-creation) passes. | T6.1 (admin-console-and-governance) |

## 3. Per-Feature Findings

### event-discovery-and-registration — FAIL
- AC-002: the featured carousel and "Events Near You" have no per-section empty state; the local section is hidden when empty.
- AC-006: organizer CTA compares the Clerk user id with the Convex organizer id, so "Manage Event" is unreachable for organizers.
- Coverage 85%; tests 26/28.

### event-management-and-check-in — FAIL
- AC-007: rejected check-in mutations roll back their rate-limit token, so invalid QR guesses never hit the 10-per-minute limit.
- Coverage 89%; tests 26/27.

### admin-console-and-governance — FAIL
- No functional or test failures (38/38 pass, 11/11 ACs).
- Blocked only by the shared dependency advisories and the verifier limitation.
- Coverage 100%.

### ai-event-creation — FAIL
- AC-005: `AIEventCreator` ignores `response.ok`; a 500 populates the form with an error payload, shows success, and closes the dialog.
- Server route failure handling (missing key, provider error, malformed JSON) passes.
- Coverage 80%; tests 9/10.

## 4. Governance State
- Fix phases were appended to each `tasks.md`/`tasks.json`; the new tasks are unchecked.
- `traceability.json` rows that own the failing ACs remain `in_progress` and now reference the fix tasks.
- `workflow-state.json` review gates were set to `rejected` for all four features.
- Canonical `review.md` files were written to `.sdrive/specs/ongoing/<feature>/v1/review.md`.
- No feature folder was moved, nothing was merged, and no branches were touched.
- Governance validation passes after the updates.
- Lint (`npm run lint`): 0 errors, 24 warnings. Typecheck (`npx tsc --noEmit`): exit 0. Neither is the blocker.

## 5. Recommended Order
1. Clear T6.2 (dependency upgrades) and re-run `npm audit`; this unblocks the security criterion for all four features.
2. Clear T6.1 (verifier support for `convex/`) so Convex-backed features can verify.
3. Fix the feature-local code tasks: T5.1/T5.2 (discovery), T5.1 (management), T4.1 (AI).
4. Re-run `/sdrive:test --all`, then `/sdrive:review --all`.
5. Only after a PASS should a feature be handed to `/sdrive:archive <feature>`. Given every feature is currently a retroactive `phase: completed` record living in `specs/ongoing/`, confirm whether archiving is even desired before running the archive command.
