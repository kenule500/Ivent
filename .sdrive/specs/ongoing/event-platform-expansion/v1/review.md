---
status: FAIL
feature: event-platform-expansion
version: v1
commit: 60c5c2e2863393c2db2927bef0f3d0439c086030
branch: feature/event-platform-expansion
base: main
reviewedBy: kenule500
reviewedAt: 2026-11-22T21:55:00+01:00
coverage: 100
evidence: .sdrive/governance/event-platform-expansion/v1/test-evidence.json
---

# Review Report: Event Platform Expansion (v1)

## 1. Audit Summary
- **Status:** FAIL
- **Date:** 2026-11-22
- **Reviewer:** kenule500 (independent: yes — `feature.assignee` is unset, and the
  implementing agent is not the signatory)
- **Version:** v1
- **Commit:** `60c5c2e2863393c2db2927bef0f3d0439c086030`
- **Branch / base:** `feature/event-platform-expansion` / `main`

Round 3 of 3. Round 2 failed on four findings: F1 (stale test evidence), F2
(NFR-008 sync budget), F3 (NFR-009 axe) and F4 (`CHANGELOG.md`). **F4 is
cleared**: `CHANGELOG.md` now records the share-ready event page, sponsors, door
mode, Wallet passes, custom questions and locale switching, and T8.3 is ticked.

The feature's own acceptance tests are green: 34/34 in `test/event-platform-expansion`,
257/257 repo-wide, `tsc --noEmit` exit 0, `eslint` exit 0 with 0 errors. That is
not enough to clear the release. Three release gates remain unsatisfied, and one
of them is new since round 2:

1. `sdrive check` exits 4 with a `doctor/permissions` blocker, so the governance
   gate is red before any feature evidence is read.
2. `test-evidence.json` records commit `e6a5d2d`, not `HEAD` (`60c5c2e`).
3. The working tree is not clean: untracked `.perch/`.
4. T7.3, T7.4 and T8.2 are still open.
5. NFR-008's 500-item sync clause and NFR-009 still have no measurement.
6. The production `next` dependency is in a vulnerable range, and the framework
   now aborts the first production build.

This is not a claim that the feature's code is broken. It is a statement that
the release is not evidenced. Round 3 is the cap; the remaining items are
process/measurement disputes plus one tooling mismatch, so a human should own the
next step rather than a fourth automated round.

## 2. Evidence
- **Test evidence:** `.sdrive/governance/event-platform-expansion/v1/test-evidence.json`
  — `exitCode: 0`, `34 passed / 0 failed / 0 skipped`, `commit: e6a5d2d`,
  `acIds: 34`. The run itself is healthy; the commit binding is stale.
- **Test report:** `.sdrive/reports/tests/test-report-event-platform-expansion-v1-2026-11-17.md`
  (mtime 2026-11-18, newer than `spec.md` and `plan.md`).
- **Verification:** `.sdrive/governance/event-platform-expansion/v1/verification.json`
  — `warn`: matched 90, missing 0, renamed 0, withdrawn 0, extra 85
  (pre-existing).
- **Audit chain:** `sdrive audit:verify` — ok, 66 hashed events verified,
  `brokenAt: null`.
- **Governance checks:** `sdrive check` — **exit 4**,
  `doctor/permissions: No rule for mutating command(s): review:cold`.
  `sdrive validate` — exit 0, no blockers.
  `sdrive permissions:check` — `no CLI rule: review:cold`; unknown CLI rules:
  `migrate`, `amend`, `reopen`.
- **Live re-run at `HEAD`:** feature suite `34/34` across 13 files; full suite
  `75 files / 257 tests` passed; `npx tsc --noEmit` exit 0; `npm run lint` exit 0
  with 0 errors and 20 pre-existing warnings.
- **Build:** `npm run build` exits 1 on the first run with
  `SecurityFatalError` and succeeds only on a retry.
- **CI:** not verified. No `.github/workflows` exists, so there is no run URL to
  record for `HEAD`. `gh` is installed but has no workflow runs to query.
- **Secret scan:** `gitleaks`/`trufflehog` are not installed. A manual scan of
  the branch diff found no `BEGIN PRIVATE KEY`, `sk_live_`, `sk_test_`, `ghp_`
  or Google API key pattern. `git ls-files` contains no `.env*` file.

## 3. Criteria Check
- [x] **Spec Convergence:** all 34 ACs (`AC-001`–`AC-034`) are implemented and
      exercised; none withdrawn.
- [ ] **Task Completion:** **FAIL.** 35 of 38 tasks complete. Open: `P7/T8.2`
      (NFR evidence), `P6/T7.3` (manual responsive/keyboard/French QA) and
      `P6/T7.4` (HTTPS/HSTS + PWA deployment confirmation).
- [ ] **Traceability:** **FAIL.** 43 of 45 rows complete. `NFR-008` and
      `NFR-009` remain `in_progress`; their sync-batch and axe clauses have no
      measurement.
- [x] **Coverage:** 100% — 34/34 in-scope ACs have a linked test, 34/34 feature
      tests passing, 0 withdrawn.
- [x] **Test Report:** `test-report-event-platform-expansion-v1-2026-11-17.md`
      exists with the version in its filename and postdates `spec.md` and
      `plan.md`.
- [ ] **Test Evidence:** **FAIL.** `exitCode: 0`, `summary.failed: 0`,
      `summary.total: 34` and 34 AC IDs all hold, but `commit` is `e6a5d2d`
      while `HEAD` is `60c5c2e`. The Commit Binding Rule requires
      `commit === HEAD`. The `60c5c2e` message leaves the residual SHA mismatch
      visible for a reviewer to rule on; this review does not invent a passing
      rule.
- [ ] **Change Scope:** **FAIL** on the working-tree clause: untracked `.perch/`
      makes `git status --porcelain` non-empty. The diff itself is scoped: 115
      changed files, all on this feature branch; no application file is
      unplanned; no commit from another in-flight feature is present. Ten commit
      subjects use task IDs (`T1.x`–`T8.3`) without naming the feature, so the
      CON-611 evidence is the task IDs rather than the subject line.
- [x] **Test Quality:** no `.only`, `xit`, `xdescribe`, `.skip` or `.todo`; no
      commented-out assertions; no tautological `expect(true)` assertions; every
      one of the 34 ACs appears in a test title (68 AC-ID occurrences).
- [x] **Code Quality:** `tsc --noEmit` exit 0; `eslint` exit 0 with 0 errors and
      20 warnings (unused vars and `<img>` in tests, all pre-existing). The
      production build requires a retry because of the framework security guard
      — see F7.
- [ ] **Security:** **FAIL** at the dependency layer. The feature's CON-51x code
      controls pass, but `npx audit --omit=dev` reports one moderate `next`
      advisory and the full tree reports 2 critical / 5 high advisories in
      dev-only tooling (`tinypool` via `vitest`). The `next` advisory range also
      triggers the first-build abort. Repairs belong to `/sdrive:secure`.
- [x] **Testing:** 34/34 feature tests and 257/257 repo-wide tests pass.
- [x] **Documentation:** `CHANGELOG.md` and `README.md` now record this wave,
      including the Wallet env vars and PWA/HSTS prerequisites. T8.3 is closed.
- [ ] **NFR Evidence:** **FAIL.** NFR-007 measured pass (2.0 ms p50 at 500 rows,
      9.9 ms p50 at 15,000 rows). NFR-008 reads pass, but the 500-item sync
      clause is `not_verified` (in-memory harness varies 3.51 s–10.30 s on
      identical input). NFR-009 is `not_verified` (no axe pass). SEO is
      `not_verified` (no deployment to crawl).
- [ ] **Definition of Done:** **FAIL** by inheritance: T8.2/T7.3/T7.4 open, the
      evidence does not match `HEAD`, the tree is dirty, and `sdrive check` is
      red.
- [x] **Spec-to-Code Verification:** `sdrive verify` returns `warn`, not `fail`
      (0 missing, 0 withdrawn, 85 pre-existing extras), which is acceptable.
- [ ] **CI:** **not verified.** No CI configuration exists; recorded as not
      verified, never as a pass.
- [x] **Permission:** `check-permission.js slash /sdrive:review` allowed
      `kenule500` (admin).
- [x] **Reviewer Independence:** `feature.assignee` is unset, so no
      self-approval conflict arises.
- [ ] **Governance Checks:** **FAIL.** `sdrive check` exits 4. The installed
      framework files are 1.0.0 while the CLI is 1.1.0-next.3; the permissions
      rules have no entry for the newer `review:cold` command. This blocks the
      review gate independently of the feature.

## 4. Change Scope
- Files changed: 115
- Planned files changed: 113 at the round-2 commit `d1aa0a3`; the two extra
  paths are the evidence bridge (`run-feature-evidence.js`) and its raw report,
  both governance artifacts.
- Unplanned application files: none
- Other-feature commits: none
- Working tree: **dirty** (`?? .perch/`, an untracked tool directory that is not
  part of the application)

## 5. Issues Found

| Severity | Issue | Location | AC | Fix Required | Fix with |
|----------|-------|----------|----|--------------|----------|
| High | `sdrive check` exits 4: `doctor/permissions` has no rule for `review:cold`; installed framework files 1.0.0 vs CLI 1.1.0-next.3. The governance gate is red before feature evidence is read. | `.sdrive/` (permissions rules) | — | Yes | `sdrive update` (refresh framework files), then `sdrive permissions:check` |
| High | `test-evidence.json` records `e6a5d2d` but `HEAD` is `60c5c2e`; the self-referential evidence trap is unresolved. Re-running the same sequence moves `HEAD` again. | `.sdrive/governance/event-platform-expansion/v1/test-evidence.json` | — | Yes | `/sdrive:test event-platform-expansion` |
| High | Working tree is not clean: untracked `.perch/` fails the Commit Binding Rule. | `.perch/` | — | Yes | Human: add `.perch/` to `.gitignore` or relocate it; then re-run the review |
| High | T8.2 is open; NFR-008's 500-item sync budget has no deployed measurement. The in-memory harness swings 3.51 s→10.30 s on identical input at 3,500 rows and 14.9 s→21.2 s at 15,000 rows. | `convex/door.ts:119`, `traceability.json` | AC-012 | Yes | `/sdrive:performance event-platform-expansion` |
| High | T7.3/T7.4 are open: no manual responsive/keyboard/French pass and no HTTPS/HSTS/PWA confirmation on a deployed host. | `.sdrive/specs/ongoing/event-platform-expansion/v1/tasks.md` | AC-014, AC-032 | Yes | `/sdrive:test event-platform-expansion` (human at a browser and host) |
| Medium | NFR-009 has no accessibility evidence: no axe pass over the door console, register modal, questions, sponsor strip or wallet control. | `traceability.json` | AC-023, AC-024, AC-032 | Yes | `/sdrive:performance event-platform-expansion` |
| Medium | `next@16.4.3` is in a vulnerable range (7 advisories) and the framework aborts the first production build; dev tooling has 2 critical / 5 high advisories. | `package.json`, `package-lock.json` | — | Yes | `/sdrive:secure event-platform-expansion` |
| Low | Commit subjects for ten commits use only task IDs and do not name the feature (CON-611). The task IDs still identify the feature. | `git log main..HEAD` | — | No | Future commits: name the feature |
| Low | `Dockerfile` uses `npm install` instead of `npm ci`; `.dockerignore` does not exclude `.env.production`, so a future non-placeholder file would be baked into the image layer. | `Dockerfile`, `.dockerignore` | — | No | `/sdrive:secure event-platform-expansion` |
| Info | `sdrive doctor` warns that 5 adapter paths are unverified and that installed files are 1.0.0 while the CLI is 1.1.0-next.3. | `.sdrive/` | — | No | `sdrive update`, then `sdrive adapters:verify` |

### Prior findings cleared
- **F4 (CHANGELOG)** — `CHANGELOG.md` now carries 51 added lines for this wave,
  and T8.3 is marked complete.
- **The `test/governance/evidence-integrity.test.ts` claim** — removed in
  `73b3002`; the report no longer asserts a test that is not in the tree.
- **The zero-count evidence bug** — `run-feature-evidence.js` now deletes the
  previous raw report and parses Vitest's real counts; the evidence records
  34/34 instead of 0/0/0.

### Why the recommendation differs
The feature's acceptance tests pass and its code is not the blocker. A reviewer
who stops at "257/257 green" would recommend release. This review blocks because
the release evidence and the task ledger do not agree with `HEAD`, the governance
gate is red, and two NFRs have no measurement. The recommendation is to fix the
evidence chain and the tooling, not to rewrite the feature.

## 6. Recommendations
- Resolve the `review:cold` permission rule by refreshing the framework files
  (`sdrive update`) rather than hand-editing the permissions JSON; then run
  `sdrive permissions:check` and `sdrive check` again.
- Settle the evidence self-reference in the recording template: record `HEAD` at
  run start plus a tree hash, or make the evidence commit the only commit after
  the run. Do not hand-edit `commit` in `test-evidence.json`.
- Add `.perch/` to `.gitignore` (or move it outside the repository) so the
  working tree is clean for every gate.
- Measure NFR-008's sync batch against a real Convex dev deployment (500 vs
  15,000 registrations, 10 runs, p50/p95) and run axe over the feature surfaces;
  then close T8.2 and NFR-008/NFR-009.
- Upgrade `next` to a patched release before the next build/CI attempt; the
  first-run `SecurityFatalError` makes a clean container build non-reproducible.

## 7. Security & Performance
| Area | Status | Reason / measurement |
|------|--------|----------------------|
| Security — secrets, dependencies, CON-51x baseline | **fail** | Secrets: clean (manual diff scan; no scanner installed; no tracked `.env*`). Dependencies: `next@16.4.3` is vulnerable (1 moderate production advisory, 7 total in the range); the full audit reports 2 critical / 5 high in dev-only tooling. Baseline: CON-511, 512, 514, 515, 517, 519 pass; CON-513, 516, 518 not applicable; **CON-520 not_verified** because T7.4 (deployed HTTPS/HSTS) is open. |
| Performance — NFRs, SEO | **not_verified** | NFR-007 pass: public event read 2.0 ms p50 at 500 rows, 9.9 ms p50 at 15,000 rows against a 1,500 ms p95 budget. NFR-008 reads pass (door snapshot 192 ms p50 / 234 ms p95; attendee search 65 ms p50 / 97 ms p95 at 15,000 rows), but the 500-item sync clause is not_verified (3.51 s–10.30 s on identical input) and the 150 ms offline acknowledgement is not observable in Node. NFR-009 not_verified: no axe pass. SEO not_verified: no deployment to crawl. Report: `.sdrive/reports/performance/performance-report-event-platform-expansion-v1-2026-11-15.md`. |

## 8. Handoff
- **Verdict:** FAIL. This is review round **3 of 3**.
- **Fix with:**
  1. `sdrive update` — clear the `doctor/permissions: review:cold` blocker
     (F1), then `sdrive permissions:check` and `sdrive check`.
  2. Add `.perch/` to `.gitignore` or relocate it — clear the dirty-tree
     blocker (F3).
  3. `/sdrive:test event-platform-expansion` — re-record the evidence so
     `commit === HEAD` (F2), and record the manual T7.3/T7.4 QA (F5).
  4. `/sdrive:performance event-platform-expansion` — measure the 500-item sync
     batch and run axe (F4, F6).
  5. `/sdrive:secure event-platform-expansion` — patch `next` and the dev
     toolchain, and harden the Docker build (F7, F9).
- **Then:** run the full suite (`npx vitest run`, expect 257/257),
  `npx tsc --noEmit`, `npm run lint`, `sdrive check`, `sdrive validate`,
  `sdrive verify`, `sdrive audit:verify`, and re-run `/sdrive:review
  event-platform-expansion`.
- **Round cap:** this is round 3. If the same findings remain after the fixes,
  stop and hand them to a human. F2 and F4 are process/measurement disputes, not
  code defects to grind against a harness.
- **Not blocking, but note:** T7.3/T7.4 need a human at a browser and a live
  host; they cannot be completed by an agent in this session.
- **No merge and no lifecycle move:** the feature stays in
  `.sdrive/specs/ongoing/event-platform-expansion/`; `/sdrive:archive` is the
  only command that merges and archives.
