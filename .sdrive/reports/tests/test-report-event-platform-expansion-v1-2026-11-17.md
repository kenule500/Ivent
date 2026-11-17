# Test Report: Event Platform Expansion (v1)

## 1. Summary
- **Date:** 2026-11-17
- **Feature:** event-platform-expansion
- **Version:** v1
- **Total ACs:** 34
- **Tested ACs:** 34
- **Coverage:** 100%
- **Tests Passed:** 34/34

## 2. AC → Test Mapping
| AC ID | Test ID | File | Status |
|-------|---------|------|--------|
| AC-001 | TEST-054 | test/event-platform-expansion/share-card.test.tsx | ✅ Pass |
| AC-002 | TEST-055 | test/event-platform-expansion/share-card.test.tsx | ✅ Pass |
| AC-003 | TEST-056 | test/event-platform-expansion/share-card.test.tsx | ✅ Pass |
| AC-004 | TEST-057 | test/event-platform-expansion/sponsors.test.tsx | ✅ Pass |
| AC-005 | TEST-058 | test/event-platform-expansion/sponsors-server.test.ts | ✅ Pass |
| AC-006 | TEST-059 | test/event-platform-expansion/sponsors-server.test.ts | ✅ Pass |
| AC-007 | TEST-060 | test/event-platform-expansion/door-mode.test.ts | ✅ Pass |
| AC-008 | TEST-061 | test/event-platform-expansion/door-mode.test.ts | ✅ Pass |
| AC-009 | TEST-062 | test/event-platform-expansion/door-mode.test.ts | ✅ Pass |
| AC-010 | TEST-063 | test/event-platform-expansion/offline-door.test.tsx | ✅ Pass |
| AC-011 | TEST-064 | test/event-platform-expansion/offline-door.test.tsx | ✅ Pass |
| AC-012 | TEST-065 | test/event-platform-expansion/offline-sync.test.ts | ✅ Pass |
| AC-013 | TEST-066 | test/event-platform-expansion/offline-door.test.tsx | ✅ Pass |
| AC-014 | TEST-067 | test/event-platform-expansion/offline-shell.test.ts | ✅ Pass |
| AC-015 | TEST-068 | test/event-platform-expansion/wallet.test.ts | ✅ Pass |
| AC-016 | TEST-069 | test/event-platform-expansion/wallet.test.ts | ✅ Pass |
| AC-017 | TEST-070 | test/event-platform-expansion/wallet.test.ts | ✅ Pass |
| AC-018 | TEST-071 | test/event-platform-expansion/wallet.test.ts | ✅ Pass |
| AC-019 | TEST-072 | test/event-platform-expansion/wallet-ui.test.tsx | ✅ Pass |
| AC-020 | TEST-073 | test/event-platform-expansion/questions-ui.test.tsx | ✅ Pass |
| AC-021 | TEST-074 | test/event-platform-expansion/questions-server.test.ts | ✅ Pass |
| AC-022 | TEST-075 | test/event-platform-expansion/questions-server.test.ts | ✅ Pass |
| AC-023 | TEST-076 | test/event-platform-expansion/questions-ui.test.tsx | ✅ Pass |
| AC-024 | TEST-077 | test/event-platform-expansion/questions-ui.test.tsx | ✅ Pass |
| AC-025 | TEST-078 | test/event-platform-expansion/questions-server.test.ts | ✅ Pass |
| AC-026 | TEST-079 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-027 | TEST-080 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-028 | TEST-081 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-029 | TEST-082 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-030 | TEST-083 | test/event-platform-expansion/localization.test.ts | ✅ Pass |
| AC-031 | TEST-084 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |
| AC-032 | TEST-085 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |
| AC-033 | TEST-086 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |
| AC-034 | TEST-087 | test/event-platform-expansion/localization-ui.test.tsx | ✅ Pass |

## 3. Failures
| Test | Reason | Blocking |
|------|--------|----------|
| — | None. Feature suite exits 0 at 34/34 across 13 files. | No |

## 4. Notes

### 4.1 This run added no tests
It was opened to answer review round 2's F1. Before writing anything I
re-audited the three coverage gaps I had proposed in the plan, and two of them
did not survive contact with the code:

- **Sync conflict outcomes: already covered.** AC-012
  (`offline-sync.test.ts:35`) calls the real handler with one item per outcome
  and asserts `["synced", "already_checked_in", "cancelled", "wrong_event",
  "not_found"]` in order, then replays the batch to prove idempotence and checks
  the door counts. A new AC-035 would have duplicated it. Proposed, then dropped.
- **Legacy events rendering platform defaults: false claim.** `formatEventPrice`
  and `formatEventDateRange` (`lib/event-format.ts`) fall back to function-local
  constants, `normalizeCurrency` resolving to `USD` -- not to platform settings. No
  code path reads platform defaults for event display, and AC-030 already asserts
  the opposite, that changing a platform default does not rewrite an event. A test
  asserting platform defaults would have been asserting a guarantee the code does
  not make. **Recorded here rather than written**, for the reviewer to rule on:
  NFR-010's wording ("continue to work with platform defaults") promises something
  the display path does not implement. That is a spec-wording question, not a
  test-authoring one.

The only genuine hole was F1 itself, and closing it needed a guard, not a new AC.

### 4.2 The structural trap behind F1, and why a guard now covers it
Evidence must name the commit it ran against, and evidence is committed, so a
record can never name the commit that carries it. "Record HEAD, then commit"
yields `commit !== HEAD` on every single round, forever. That is why F1 has now
been raised twice and would have been raised a third time.

`test/governance/evidence-integrity.test.ts` therefore treats the recorded SHA
as a claim to check rather than a field to fill in, and passes it when either holds:

- recorded commit equals HEAD; or
- every file between the recorded commit and HEAD is a governance/artifact file
  under `.sdrive/`, meaning the scored run measured exactly the product code
  HEAD ships and only the paperwork moved.

The second branch is the one this commit exercises: 18 files differ between
`e722562` and HEAD, and the guard confirmed all 18 live under `.sdrive/`, so no
`app/`, `components/`, `convex/`, `lib/` or `test/` file changed after the
recorded run. It reports that as `EVIDENCE-DRIFT` on stderr rather than passing
silently, because the weaker claim should be visible to whoever reads the
verdict. If a product file ever changes after a recorded run, the guard fails and
names the file. That is the condition a reviewer actually cares about.

The guard lives in `test/governance/`, not `test/event-platform-expansion/`, so
it is not counted as feature coverage for AC-001..AC-034.

### 4.3 NFR-002 boundary confirmed, not newly tested
Review round 2's finding that wallet credentials never cross to the client is
supported at the code level: `convex/wallet.ts` declares no credential in its
`args`, signing happens in `convex/walletNode.ts`, and no client module imports
`walletNode` (only Convex's generated `api.d.ts` references it). This was verified
by import-graph inspection. No bundle-grep test was added: the claim is about what
compiles into a client lightweight chunk, and this harness has no build step, so
such a test would assert the copy of the code the runner could read rather than the
one a browser receives.

### 4.4 Verification
- Feature suite: `npx vitest run test/event-platform-expansion` -> exit 0,
  34 passed, 0 failed, 0 skipped, 13 files.
- Integrity guard: `npx vitest run test/governance` -> exit 0, 1 passed.
- `npx tsc --noEmit` -> exit 0.
- `npm run lint` -> exit 0, 0 errors, 20 warnings.
- `node .sdrive/scripts/validate-governance.js` -> all files valid.
- `npx sdrive verify event-platform-expansion` -> exit 0, warn,
  matched 90, missing 0, renamed 0, extra 85, withdrawn 0.
- `sdrive audit:verify` -> ok, 63 hashed events, brokenAt null.

### 4.5 Withdrawn Criteria
None. All 34 criteria in `spec.json` remain in scope.
