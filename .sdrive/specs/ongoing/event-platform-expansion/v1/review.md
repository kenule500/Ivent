---
status: FAIL
feature: event-platform-expansion
version: v1
commit: d1aa0a35616805e68d5924e929b08c6674730891
branch: feature/event-platform-expansion
base: main
reviewedBy: kenule500
reviewedAt: 2026-11-17T11:55:00+01:00
coverage: 100
evidence: .sdrive/governance/event-platform-expansion/v1/test-evidence.json
remediationRound: 2
---

# Review Report: Event Platform Expansion (v1)

## 1. Audit Summary
- **Status:** FAIL
- **Date:** 2026-11-17
- **Reviewer:** kenule500 (independent: yes -- feature assignee is unset in workflow-state, and the implementing agent is not the signatory)
- **Version:** v1
- **Commit:** d1aa0a35616805e68d5924e929b08c6674730891
- **Branch / base:** feature/event-platform-expansion / main

Round 2 of 3. Round 1 (commit 8f1541c) failed on four findings, F1 and F2
(high) owned by T8.1 and F3/F4 by T8.2 and T8.3.

T8.1 is cleared: the 31 cross-feature regressions and the 8 TS2741 errors are
gone, the full suite is green at 257/257, and `tsc --noEmit` now exits 0.

T8.2 is **partially** cleared and T8.3 is **not** cleared. The feature tests all
pass and coverage computes to 100%, but two governance requirements that gate a
release cannot be satisfied by the evidence present: the recorded test evidence
does not belong to the commit being reviewed, and two of the four remediation
tasks are still open. A FAIL here is not a claim that the product is broken; it
is a statement that the release is not evidenced.

## 2. Evidence
- Test evidence: `.sdrive/governance/event-platform-expansion/v1/test-evidence.json`
  -- exit code 0, 34 passed / 0 failed / 0 skipped, **commit `e722562`**, which is
  NOT `HEAD` (`d1aa0a3`). **STALE.**
- Test report: `.sdrive/reports/tests/test-report-event-platform-expansion-v1-2026-11-15.md`
- Verification: `sdrive verify` -- `warn`, matched 90, missing 0, renamed 0,
  withdrawn 0, extra 85 (pre-existing, unrelated endpoints and components).
- Audit chain: `sdrive audit:verify` -- ok, 63 hashed events verified, `brokenAt: null`.
- Live re-run for this review: `npx vitest run test/event-platform-expansion` exited
  0 with **34 passed / 13 files passed**. `npx tsc --noEmit` exited 0.
  `npm run lint` exited 0 with 20 warnings and 0 errors.
- CI: **not verified**. No CI configuration exists in the repository
  (`.github/workflows`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `.circleci` all
  absent), so there is no run URL to record.

## 3. Criteria Check
- [x] Spec Convergence: all 34 ACs have tests; the feature suite exercises
      AC-001 to AC-034. No withdrawn criteria.
- [ ] Task Completion: **FAIL.** 34 of 38 tasks complete. Open: `P6/T7.3`,
      `P6/T7.4` (both recorded as deferred to human/host access),
      **`P7/T8.2`** and **`P7/T8.3`**. T8.2 and T8.3 are the round-1 remediation
      items and are not deferred -- they are unfinished.
- [ ] Traceability: **FAIL.** 43 of 45 rows are `complete`. `NFR-008` and
      `NFR-009` are `in_progress`, which is the honest state: their sync-batch and
      axe clauses have no measurement. They were not flipped to `complete` to
      make the gate green.
- [x] Coverage: 100% (34/34 ACs in scope tested, 0 withdrawn; 34/34 tests passing).
- [x] Test Report: `.sdrive/reports/tests/test-report-event-platform-expansion-v1-2026-11-15.md`
      exists with the version in its filename and postdates `spec.md`/`plan.md`.
- [ ] Test Evidence: **FAIL.** `exitCode: 0`, `summary.failed: 0`, `summary.total: 34`
      all hold, but `commit` is `e722562` and `HEAD` is `d1aa0a3`. The Commit Binding
      Rule requires `commit === HEAD`; two commits have landed since the evidence
      was recorded (the evidence re-record itself, and this round's performance work).
- [x] Change Scope: 19 commits on the branch, all naming this feature. No commit
      from another in-flight feature. Merge-base `47794a6` is on `main`, so the
      branch is based on its recorded base (CON-612). Working tree clean.
- [x] Test Quality: no `.only`, `xit`, or `.skip` in the feature tests; no
      commented-out assertions; 68 AC-ID occurrences across the titles carry the
      AC they cover. Red-before-green is not required by this project's config,
      so no `redGreen[]` entry is expected.
- [x] Code Quality: `tsc --noEmit` exit 0; `lint` exit 0, 0 errors, 20 warnings
      (CON-204 passes on exit code; the warnings are pre-existing unused vars).
- [x] Security: no tracked `.env*` (`git ls-files` clean), no secret matches in
      the branch diff. CON-512 holds: no raw `query(`/`mutation(` functions were
      added to `events.ts`/`platform.ts`/`audit.ts`/`exports.ts`/`registrations.ts`;
      door and wallet route through `secureQuery`/`secureMutation` with
      `requireEventOrganizer`. CON-514 holds: `doorSyncRateLimit` and
      `walletIssueRateLimit` buckets consume before work. CON-517 holds: JSON-LD
      escapes `<` as `\u003c`. No high or critical advisory. One moderate advisory
      is recorded under Findings as F5 (non-blocking).
- [x] Testing: 34/34 feature tests, 257/257 repo-wide.
- [ ] Documentation: **FAIL.** `CHANGELOG.md` is unchanged on this branch and its
      `[Unreleased]` section mentions none of sponsors, Google Wallet passes,
      offline door mode, custom registration questions, or locale switching. T8.3
      exists precisely to close this and is unticked.
- [ ] NFR Evidence: **FAIL.** NFR-007 has a measured PASS. NFR-008 has measured
      PASS for its read paths but its 500-item sync clause is **not_verified**; the
      in-memory harness varies by more than 2x between runs of an identical input
      above a few thousand stored rows, so it cannot establish or refute the 5 s
      budget, and only a deployed measurement can. NFR-009 has **not_verified** --
      no axe pass ran over the feature surfaces.
- [ ] Definition of Done: **FAIL** by inheritance. T8.2 and T8.3 are open, the
      evidence is stale against `HEAD`, and the per-file completion flags in
      `tasks.json` are not all true.
- [x] Spec-to-Code Verification: `sdrive verify` returns `warn` (not `fail`),
      which is acceptable: 0 missing means every AC resolves to a test.
- [ ] CI: **not verified.** No CI is configured, so no green run exists queryable
      for `HEAD`. Recorded as not verified, never as a pass.
- [x] Permission: `check-permission.js slash /sdrive:review` allowed
      `kenule500` (admin).
- [x] Reviewer Independence: `feature.assignee` is unset, so no self-approval conflict arises.

## 4. Change Scope
- Files changed: 113
- Planned files changed: 113
- Unplanned files: none (untracked: none since the last commit; working tree clean)
- Other-feature commits: none
- Working tree: clean

## 5. Findings to fix

### F1. high -- Test evidence is bound to a commit that is not `HEAD` (blocks release)

`.sdrive/governance/event-platform-expansion/v1/test-evidence.json` records
`commit: "e722562..."` (and `recordedAt: 2026-11-15T10:11:46Z`) but `HEAD` is
`d1aa0a3...`. Two commits landed after the run: `1beea8b` (a re-record of the same
evidence) and `d1aa0a3` (this round's benchmark harness and report).

The self-referential trap is the root cause, and it will recur until it is named.
Evidence must record the commit it ran against, and evidence is itself committed,
so a record inside a commit can never equal that commit's own SHA. `1beea8b` was
an attempt to fix this by recording `e722562` before committing -- which produced
exactly the same one-commit-behind state. Re-running the same sequence moves
`HEAD` again and stays stale.

The first consequence, in fairness, is that the recorded evidence is **not wrong
about the code it measured**. `e722562` and `1beea8b` differ only in governance
JSON, and `d1aa0a3` touches no `app/`, `components/`, `convex/`, or `lib/` file.
But the rule is `commit === HEAD`, and more importantly a reader of
`test-evidence.json` is entitled to know that what they are looking at was run
on the tree in front of them. Today that reader would be guessing.

Fix: `/sdrive:test event-platform-expansion`. That command owns the test evidence.
It must resolve the self-reference -- either by recording the evidence against
`HEAD` after the artifacts are committed and accepting a documented follow-up
commit, or by having the evidence tool record `HEAD` at run start together with a
tree hash so a reviewer can prove the tree is unchanged. Do not hand-edit.
`commit` here; the value must come from an actual run.

### F2. high -- NFR-008's 500-item sync budget has no measuring evidence

`traceability.json` records NFR-008 as `in_progress`. The read paths are measured
and pass with wide margins (`getDoorSnapshot` 192 ms p50 / 234 ms p95 and attendee
search 65 ms p50 / 97 ms p95 at 15,000 rows, against 2,000 ms). The write path
does not have evidence:

| Rows | 500-item sync p50, across runs |
|---|---|
| 500 | 1.18 s (also 0.55 s) |
| 3,500 | 3.51 s PASS, 5.01 s FAIL, 10.30 s FAIL |
| 15,000 | 14.87 s, 19.31 s, 21.19 s |

With a byte-identical 500-item argument the same job crosses the 5 s budget in
different directions on the same machine. That variance is larger than the
margin to the budget, so no verdict can be read from it -- in either direction.
The handler `syncOfflineCheckIns` does one indexed `.unique()` per item and one
`patch`, so no missing index explains it; the in-memory `convex-test` simulation
is the standing explanation, and it is untested.

The reason this is a blocking finding rather than a note is the asymmetry: we
cannot release on "probably fast in production", and we cannot hold forever on
"possibly slow in a simulator". One deployed measurement closes it either way.

Fix: `/sdrive:performance event-platform-expansion`. Measurement against a real
Convex dev deployment, 500 vs 15,000 registrations, 10 runs each, recording p50
and p95. **No production code change** -- in particular `convex/door.ts` stays
untouched until that number exists. If the deployed p50 is flat and under budget,
record it and close NFR-008 as met.

### F3. medium -- NFR-009 has no accessibility evidence

`traceability.json` records NFR-009 as `in_progress`. No axe pass ran over the
feature's surfaces (door console, register modal and custom questions, sponsor
strip, wallet save button), so the WCAG 2.1 AA claim rests on unit-level screen
assertions. Report: `.sdrive/reports/performance/performance-report-event-platform-expansion-v1-2026-11-15.md`,
section 3.2 item 3.

Fix: `/sdrive:performance event-platform-expansion` (it owns the axe run and the
`review.json.performance` record). Until then, NFR-009 is `not_verified`, not
met.

### F4. medium -- `CHANGELOG.md` does not record this branch's user-facing additions

`git diff --name-only main...HEAD -- CHANGELOG.md` is empty, and the
`[Unreleased]` section does not mention sponsors, Google Wallet passes, offline
door mode, custom registration questions, or locale switching. The one pass is
`currency`, which is an older published entry, not this branch.

This is T8.3, raised in round 1 and still unticked. A user-facing feature set
that cannot be found in the changelog is not documentable at release time.

Fix: `/sdrive:apply event-platform-expansion`.

## 6. Recommendations (non-blocking)

- **F5. low -- moderate advisory in a direct dependency.**
  `npm audit --omit=dev` reports 1 moderate in 1,066 production dependencies:
  GHSA-mfr8-8qww-v76h, "Information disclosure across root params when a `use
  cache` function is called through `unstable_cache()`", affecting `next`
  16.3.0 -- 16.4.4 (we are on 16.4.3). No high or critical advisory. It does not
  block: this app is not known to call `unstable_cache()` through `use cache`,
  and the fix is a Next.js patch bump owned by `/sdrive:secure`, not by this
  review. Recorded as `review.json.security.dependencies = "clean"` with this
  note so the next reader is not surprised by the word "clean" next to
  `moderate`.
- **F6. info -- the self-referencing evidence trap will recur** unless the
  `/sdrive:test` change in F1 also changes the recording template. Fix the
  template, not this file.
- **F7. low -- three benchmark runs overwrote each other's raw JSON** before
  the volume-tagged files were added (`nfr-007-008-raw-500.json`,
  `-3500.json`, `-15k.json`). The tagged set is complete and the numbers in the
  performance report came from a `summarise` pass over all four files. Keep the
  one-file-per-volume convention so a later run cannot silently replace the
  evidence a conclusion rested on.

## 7. Security & Performance

| Area | Status | Reason / measurement |
|------|--------|----------------------|
| Security -- secrets, dependencies, CON-51x baseline | pass | No tracked `.env*`; no secret pattern in the branch diff; `gitleaks`/`trufflehog` not installed, so a manual scan (above) was the evidence and it found nothing. 0 high / 0 critical advisories; 1 moderate `next` advisory recorded as non-blocking F5. CON-511/512/514/515/517/519 verified wired into the request path (secure wrappers, `requireEventOrganizer`, rate-limit buckets, Convex validators, JSON-LD `<` escaping, git-ignored `.env*`). |
| Performance -- NFRs, SEO | not_verified | NFR-007 measured PASS (2.0 ms p50 at 500 rows, 9.9 ms p50 at 15,000 rows, target 1,500 ms p95). NFR-008 reads measured PASS; the 500-item sync clause is **not_verified** -- the only available harness is in-memory and swings >2x between runs of an identical input from 3.5 s to 10.3 s, so it neither proves nor refutes the 5 s budget (F2). NFR-008's 150 ms offline acknowledgement is a client IndexedDB write and was not measurable in Node. NFR-009 **not_verified** -- no axe run (F3). SEO **not_verified** -- no deployment to crawl; the metadata/JSON-LD/robots code paths were read, not measured. |

## Performance audit record

- **Method:** 7 iterations per case, a fresh in-memory backend seeded per
  iteration (the earlier 40 s figure came from a shared backend and was a
  fixture-growth artefact; withdrawn). Discard highest and lowest, report p50;
  p95 over all 7.
- **Environment:** local Node v24.20.0, `convex-test`, no deployment. Absolute
  latencies describe the simulator, not Convex's servers.
- **NFRs:** `NFR-007` pass, `NFR-008` not_verified (sync clause), `NFR-009`
  not_verified  No target was invented; each comes from `spec.json`.
- **SEO:** not_verified, with the reason above. No score is claimed.
- **Report:** `.sdrive/reports/performance/performance-report-event-platform-expansion-v1-2026-11-15.md`.

## 8. Handoff

- **Fix with:**
  1. `/sdrive:test event-platform-expansion` -- F1: re-record the evidence so
     `commit === HEAD`, and settle the self-reference in the template so it does
     not recur.
  2. `/sdrive:performance event-platform-expansion` -- F2 and F3: measure the
     sync batch on a deployed backend and run the axe pass. Do not change
     `convex/door.ts` before F2 has a number.
  3. `/sdrive:apply event-platform-expansion` -- F4: write the `CHANGELOG.md`
     entry.
- **Then:** run the full suite (`npx vitest run`, expect 257/257), `npx tsc --noEmit`,
  `npm run lint`, `sdrive verify`, `sdrive audit:verify`, and re-run
  `/sdrive:review event-platform-expansion` (round 3 of 3).
- **Round cap:** this is round 2. If round 3 fails on the same finding, stop and
  hand it to a human -- F1 and F2 are process/measurement disputes, not code
  defects to grind against a harness.
- **Not blocking, but note:** T7.3 (manual responsive, keyboard, French QA) and
  T7.4 (HTTPS/HSTS, PWA at deployment) stay deferred; both need a human at a
  live deployment, and both are recorded as deferred rather than passed.
- This feature is **not** archived and **not** merged. The review gate remains
  `pending`; it is the user's to approve, and only after a review returns PASS.
