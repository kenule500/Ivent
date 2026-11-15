# Review: Event Platform Expansion (v1)

**Status: FAIL**

| | |
|---|---|
| Feature | `event-platform-expansion` |
| Version | v1 |
| Reviewed commit | `90f79f4673495075f765dd3b8515080def9fda90` |
| Base | `main` (merge-base `47794a6`) |
| Branch | `feature/event-platform-expansion` |
| Reviewed by | `kenule500` (admin) |
| Reviewed at | 2026-11-15T08:52:09+01:00 |
| Lifecycle location | `.sdrive/specs/ongoing/event-platform-expansion/v1` |
| Remediation round | 1 |

## Verdict Summary

The feature itself is complete and green: **34/34 acceptance criteria pass, 100% traceability
coverage, fresh test report, clean lint, no secrets, no vulnerable dependencies.** Every one of
the 18 audit criteria that concerns the feature's own scope passes.

The review nevertheless fails, because **this branch breaks previously approved features.** The
repository suite is red — 31 of 257 tests fail across 11 files in six other feature suites — and
`npx tsc --noEmit` exits 1 with 8 errors. Both are directly caused by changes on this branch.
Two tasks (T7.3, T7.4) remain open by design, and three NFRs carry measurable targets with no
evidence behind them.

This is not a case of a feature that does not work. It is a case of a feature that works while
regressing its neighbours. Approving it would ship 31 broken tests into `main`.

## Criteria

| # | Criterion | Verdict |
|---|---|---|
| 1 | Spec Convergence | **pass** |
| 2 | Task Completion | warn |
| 3 | Traceability | **pass** |
| 4 | Coverage | **pass** |
| 5 | Test Report | **pass** |
| 6 | Test Evidence | **pass** |
| 7 | Change Scope | **fail** |
| 8 | Test Quality | **pass** (red/green not required) |
| 9 | Code Quality | **fail** |
| 10 | Security | **pass** |
| 11 | Testing | **fail** |
| 12 | Documentation | warn |
| 13 | NFR Evidence | **fail** |
| 14 | Definition of Done | warn |
| 15 | Spec-to-Code Verification | **pass** |
| 16 | CI | not_verified |
| 17 | Permission | **pass** |
| 18 | Reviewer Independence | **pass** |

### 1. Spec Convergence — pass

All 34 acceptance criteria (AC-001..AC-034) across 9 user stories, 31 functional requirements,
and 14 non-functional requirements are implemented and exercised. No criterion is withdrawn;
the withdrawn set is empty.

### 2. Task Completion — warn

33 of 35 tasks are complete in both `tasks.json` and `tasks.md`. The two open tasks are
deliberate deferrals that cannot be satisfied from this checkout:

- **T7.3** Manual responsive/keyboard/French pass — needs a human at 360/768/1280 in both locales
  against a running deployment.
- **T7.4** HTTPS/HSTS and PWA deployment prerequisites — set by the production host.

Both are recorded as deferred with reasons, so this is a warn rather than a fail.

### 3. Traceability — pass

`traceability.json` holds 45 rows, **all** with `status: complete`, and zero gaps. Every
acceptance criterion carries at least one `TEST-###` id (TEST-054 .. TEST-087).

### 4. Coverage — pass

`coverage = (34 tested ACs / 34 in-scope ACs) × 100 = 100%`. No AC lacks a linked complete
test. Withdrawn criteria: none, so nothing is excluded from the denominator.

### 5. Test Report — pass

`.sdrive/reports/tests/test-report-event-platform-expansion-v1-2026-11-15.md` exists and is
newer than both `spec.md` and `plan.md` (both 2026-11-11), so it is not stale.

### 6. Test Evidence — pass

`test-evidence.json` records `exitCode: 0`, `summary.failed: 0`, `summary.total: 34`, and
`commit: 90f79f4…` which equals `HEAD`. The evidence is bound to the reviewed commit.

### 7. Change Scope — fail

Mechanically the diff is well-behaved. 14 commits, 92 files, +15718/−560 — all of it attributable
to this feature's plan. The branch is based on the recorded base (`47794a6` is an ancestor of
`HEAD`), no other feature's commits are present, and no stray files are untracked.

It fails on the substantive requirement: **the change does not leave the rest of the repository
green.** Six previously approved suites are collateral damage (see criterion 11).

### 8. Test Quality — pass

No `.only`, `xit`, `xdescribe`, `.skip`, or `it.todo` in any of the 13 feature test files. All 34
AC IDs appear in test names (68 AC references total), so failures are traceable to requirements.

Red-before-green is **not required** here: `.sdrive/config.json` declares no
`governance.requireRedGreen`, and `test-evidence.json` contains no `redGreen[]` array. Recorded as
not-required, not as a silent pass.

### 9. Code Quality — fail

- `npm run lint` → **pass**, exit 0, 20 warnings, 0 errors (CON-204 satisfied).
- `npx tsc --noEmit` → **fail**, exit 1, eight `TS2741` errors.

This branch changed `EventPageProps` so `params` is a required `Promise<{ slug: string }>`. That
change is **correct** — `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`
specifies `params: Promise<{ slug: string }>` for Next 16.4.3, and CON-705 requires following the
bundled docs. But the existing test file was not updated, so it renders the page with no props:

```
test/event-discovery-and-registration/event-detail.test.tsx
  98, 111, 119, 127, 135, 145, 151, 160
  error TS2741: Property 'params' is missing in type '{}' but required in type 'EventPageProps'.
```

The fix is to update the call sites, **not** to revert the type. Reverting would violate CON-705.

### 10. Security — pass

No secret material in the diff. No `.env*` file is tracked. A regex sweep for common credential
shapes over non-test source returned no hits. `npm audit --omit=dev` reports 0 critical, 0 high,
0 moderate, 0 low across 1066 dependencies, and `package.json` is unchanged so no dependency was
added by this branch.

All nine CON-51x baseline controls were checked individually and recorded in `review.json`:

| Control | Status | Note |
|---|---|---|
| CON-511 Authentication | pass | Clerk JWT validated by Convex |
| CON-512 Authorization | pass | No new raw exports; secure wrappers + `requireAdmin` |
| CON-513 Headers | n/a | Helmet is Express-specific; no Express server |
| CON-514 Rate Limiting | pass | Limiter wired in wallet, door, events, registrations |
| CON-515 Input Validation | pass | `convex/values` validators on new fields |
| CON-516 Injection | n/a | Typed, parameterized Convex queries |
| CON-517 XSS | pass | See note below |
| CON-518 CSRF | n/a | Convex mutations + Clerk token, no cookie form posts |
| CON-519 Environment | pass | Wallet signing material read server-side only |

**CON-517 deserves the reviewer's attention.** The branch *does* introduce
`dangerouslySetInnerHTML` — in `app/(public)/events/[slug]/_components/event-json-ld.tsx`. It is
safe: the JSON-LD payload escapes `<`, `>`, `&`, U+2028, and U+2029 before embedding, which is
exactly the pattern required to prevent a title such as `</script>` from breaking out of the
script element. Verified by reading the file, not by trusting the comment.

### 11. Testing — fail

The feature suite is green: **34 passed, 0 failed, 0 skipped**. The repository suite is not:

```
success=False  total=257  passed=226  failed=31  pending=0
```

None of the 31 failures are in `test/event-platform-expansion/`. The failure set is spread across
six other features, and — critically — **none of those six test directories were modified on this
branch** (`git diff 47794a6...HEAD --name-only -- test/<each dir>` is empty for all six). So these
are not stale tests that were already broken; they are regressions this branch introduced.

| Suite | Failing tests | Mechanism |
|---|---|---|
| `event-discovery-and-registration/event-detail` | 8 | `EventPageProps.params` now required |
| `event-management-and-check-in/event-dashboard` | 5 | `useI18n` outside `LocaleProvider` |
| `event-management-and-check-in/create-event-form` | 3 | `useI18n` outside `LocaleProvider` |
| `registration-ux-polish/register-modal-pending` | 3 | `useI18n` outside `LocaleProvider` |
| `event-discovery-and-registration/my-tickets` | 2 | `useI18n` outside `LocaleProvider` |
| `accessibility-and-performance-hardening/announcements` | 2 | `useI18n` outside `LocaleProvider` |
| `event-management-and-check-in/check-in` | 2 | Split QR messages |
| `registration-ux-polish/optimistic-cancel` | 2 | `useI18n` outside `LocaleProvider` |
| `admin-dashboard-update/settings-page` | 2 | Page reads `platform.getSettings`; mock omits `platform` |
| `admin-dashboard-update/platform` | 1 | `getPublicStatus` now returns `defaultLocale` |
| `ai-event-creation/review-before-saving` | 1 | `useI18n` outside `LocaleProvider` |

Four distinct root causes:

1. **`LocaleProvider` context (18 tests / 7 files).** This branch added
   `components/locale-provider.tsx` — whose `useI18n()` throws at line 88 when no provider is
   present — and wrapped the app in `app/layout.tsx`. Pages such as
   `app/(main)/my-events/[eventId]/page.tsx` now call `useI18n()`. Existing tests render those
   pages directly, bypassing the layout, so they have no provider. `test/setup.ts` exports no
   shared render helper, so there is no single place to fix this. **Production is correct; the
   test fixtures are stale.**
2. **`EventPageProps.params` (8 tests).** Same root as criterion 9.
3. **QR message split (2 tests).** `convex/registrations.ts` now distinguishes `"Invalid QR code"`
   from `"This registration was cancelled"` instead of the old combined message, and the test
   still asserts `/invalid or cancelled/i`. The production change is a genuine usability
   improvement; the test must be updated to the new behaviour.
4. **`getPublicStatus` shape (1 test).** The query returns `defaultLocale` now, breaking a deep
   equality assertion.

None of these fixes require touching application source. All four are test-side updates, which is
why the remediation routes to `/sdrive:test`.

### 12. Documentation — warn

`README.md` was updated (+18 lines) and covers the PWA, wallet, and deployment prerequisites.
`CHANGELOG.md` exists in the repository but was **not** updated for these user-facing additions
(sponsors, custom registration questions, offline door mode, Wallet passes, currency and locale
switching).

### 13. NFR Evidence — fail

Three NFRs declare measurable targets and have no evidence behind them. No performance or
accessibility report exists for this feature under `.sdrive/reports/` — the reports present there
all belong to `accessibility-and-performance-hardening` and `admin-dashboard-update`.

| NFR | Declared target | Measured |
|---|---|---|
| NFR-007 | cached OG ≤ 1.5s p95, uncached ≤ 3s p95 | not measured |
| NFR-008 | live count ≤ 2s p95, offline ack ≤ 150ms, 500-item sync ≤ 5s | not measured |
| NFR-009 | WCAG 2.1 AA | unit-level assertions only; no axe or manual audit |

I have not invented a target that the spec does not state, and I have not recorded these as
passing. They are `not_verified` with reasons, exactly as reported in `review.json`.

### 14. Definition of Done — warn

The constitution contains no standalone Definition of Done section, so DoD is evaluated as the
union of the CON-2xx/3xx/5xx/7xx rules. CON-204 (lint) and CON-207 (validators) hold. **CON-703
fails on its typecheck half** — it requires `npx tsc --noEmit` after writing code. CON-705 is
satisfied and was actively verified against the bundled Next 16.4.3 docs.

### 15. Spec-to-Code Verification — pass

`sdrive verify event-platform-expansion --json` returns `warn` with `matched: 90`, **`missing: 0`**,
`renamed: 0`, `extra: 85`, `withdrawn: 0`. Zero missing mappings; the 85 extras are pre-existing
identifiers. `warn` with no gaps is acceptable; only `fail` blocks.

### 16. CI — not_verified

The repository has no `.github/workflows` directory, and `gh run list --branch
feature/event-platform-expansion` returns zero runs. **CI not verified.** Recorded as such rather
than assumed green.

### 17. Permission — pass

`node .sdrive/scripts/check-permission.js slash /sdrive:review` →
`✅ User "kenule500" (admin) is allowed.`

### 18. Reviewer Independence — pass

Reviewer `kenule500` versus the feature's assignee. The feature record in `workflow-state.json`
carries no `assignee` field, so there is no second party to compare against and no conflict to
escalate. Noted rather than claimed as an independent review.

## Withdrawn Criteria

**None.** The withdrawn set is empty, so the coverage denominator is the full 34 ACs.

## Consolidated CLI Results

| Command | Result |
|---|---|
| `sdrive check --json` | `blockers: []`, `warnings: []`, exit 0 |
| `sdrive validate --json` | pass |
| `sdrive verify event-platform-expansion --json` | `warn`, missing 0 |
| `sdrive audit:verify --json` | `ok: true`, 61 hashed events verified, exit 0 |
| `check-permission.js slash /sdrive:review` | allowed |

## Findings

| # | Severity | Issue | Route |
|---|---|---|---|
| F1 | high | 31 cross-feature test failures introduced by this branch | `/sdrive:test` → T8.1 |
| F2 | high | `tsc --noEmit` exits 1 with 8 `TS2741` errors | `/sdrive:test` → T8.1 |
| F3 | medium | NFR-007/008/009 have no measured evidence | `/sdrive:performance` → T8.2 |
| F4 | medium | T7.3 and T7.4 deferred to human/host verification | human sign-off |
| F5 | low | `CHANGELOG.md` not updated | `/sdrive:apply` → T8.3 |
| F6 | info | No `gitleaks`/`trufflehog`; secret scan was manual | tooling |
| F7 | info | CI not verified | CI setup |

## Remediation — Round 1

Fixes are routed to the specialist agents. This review is audit-only and did **not** modify
application source, configuration, or dependencies. Three remediation tasks were added (T8.1,
T8.2, T8.3) and the traceability rows were left untouched, since no row was confirmed incomplete.

1. **T8.1 → `/sdrive:test`** — Repair the four root causes. Wrap rendered pages in
   `LocaleProvider`, pass `params` to `EventPageProps`, and assert the new QR messages and
   `getPublicStatus` shape. Assert the new intended behaviour; do not weaken assertions. Finish
   when `npx tsc --noEmit` exits 0 and the full suite is green.
2. **T8.2 → `/sdrive:performance`** — Measure NFR-007, NFR-008, and NFR-009 and record reports.
3. **T8.3 → `/sdrive:apply`** — Add the `CHANGELOG.md` entry.
4. **Human** — Complete T7.3 (visual/keyboard/French pass) and T7.4 (HTTPS/HSTS on the host).

This is round 1 of a maximum of 3. A third failed round hands the feature to a human reviewer.

## Lifecycle

The feature remains in `.sdrive/specs/ongoing/event-platform-expansion/v1`. Per the audit-failure
rule the folder is **not** moved, and no merge or archive was performed. The `review` gate stays
`pending` — approving it is the user's action (`sdrive approve event-platform-expansion review`),
and it must not be approved while this review reads FAIL.
