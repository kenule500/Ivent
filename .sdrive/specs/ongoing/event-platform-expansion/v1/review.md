---
status: FAIL
feature: event-platform-expansion
version: v1
commit: dc2f9bd9c3bc78513b3cd111b4bf407a6e8f98ab
branch: feature/event-platform-expansion
base: main
reviewedBy: kenule500
reviewedAt: 2026-11-23T03:15:58+01:00
coverage: 100
evidence: .sdrive/governance/event-platform-expansion/v1/test-evidence.json
---

# Review Report: Event Platform Expansion (v1)

## 1. Audit Summary
- **Status:** FAIL
- **Date:** 2026-11-23
- **Reviewer:** kenule500 (independent: yes — `feature.assignee` is unset)
- **Version:** v1
- **Commit:** `dc2f9bd9c3bc78513b3cd111b4bf407a6e8f98ab`
- **Branch / base:** `feature/event-platform-expansion` / `main`

Round 4, opened under explicit human authorization after the round-3 cap: the
user re-invoked `/sdrive:review` following the performance, test and debug work.
Round 3's F1 (governance gate red), F3 (dirty tree), F4 (NFR-008 sync), F6
(NFR-009 axe) and F7 (vulnerable `next`) are cleared. F2 (evidence binding) is
recorded as a documented parent-commit exception. T8.2 is now complete.

The feature is still **not release-ready** for one high-severity, non-code
reason: **T7.3 and T7.4 remain open**. They need a human at a browser and a live
host. Everything the automation can prove is green:

- 34/34 ACs covered, 39/39 feature tests, 262/262 repo-wide tests.
- `tsc --noEmit` exit 0; `eslint` exit 0 with 0 errors; `next build` exit 0.
- NFR-007, NFR-008 and NFR-009 all have measured evidence (the deployed sync
  p95 is 2,480 ms at 500 rows and 2,322 ms at 15,000 rows; the axe suite is 5/5).
- `sdrive check`, `sdrive validate` and `sdrive audit:verify` pass.

The verdict is FAIL because the release evidence cannot be completed by an
agent, not because the feature's acceptance tests fail.

## 2. Evidence
- **Test evidence:** `.sdrive/governance/event-platform-expansion/v1/test-evidence.json`
  — `exitCode: 0`, `39 passed / 0 failed / 0 skipped`, `acIds: 34`, recorded at
  `541c503`. `HEAD` is `dc2f9bd`; the diff `541c503..HEAD` touches only
  `.sdrive/` artifacts (audit log, evidence, traceability, verification,
  handoff, raw JSON, test report). No application code differs. This review
  records a **documented parent-commit exception** rather than the impossible
  `commit === HEAD` self-reference. The exception is transparent in
  `review.json.criteria[test_evidence]` and does **not** clear the release: the
  verdict is FAIL on T7.3/T7.4.
- **Test report:** `.sdrive/reports/tests/test-report-event-platform-expansion-v1-2026-11-23.md`
  (newer than `spec.md` and `plan.md`).
- **Verification:** `.sdrive/governance/event-platform-expansion/v1/verification.json`
  — `warn`: matched 90, missing 0, renamed 0, withdrawn 0, extra 85
  (pre-existing).
- **Audit chain:** `sdrive audit:verify` — ok, 67 hashed events, `brokenAt: null`.
- **Governance checks:** `sdrive check` exit 0; `sdrive validate` exit 0 after
  this review's task update; `sdrive permissions` allows `review:cold`.
- **Live re-run at `HEAD`:** feature suite 39/39 across 13 files; full suite
  262/262 across 75 files; `npx tsc --noEmit` exit 0; `npm run lint` exit 0 with
  0 errors and 20 pre-existing warnings; `npm run build` exit 0.
- **CI:** not verified. There is no `.github/workflows`; `gh` is installed but
  has no run to query for `HEAD`.
- **Secret scan:** `gitleaks`/`trufflehog` are not installed. A manual scan of
  the branch diff found 0 private-key, `sk_live_`, `sk_test_`, `ghp_` or Google
  API key patterns. `git ls-files` contains no `.env*` file.
- **Dependencies:** `npm audit --omit=dev` → 0 vulnerabilities. Full
  `npm audit` → 15 advisories (2 critical, 5 high) in dev-only tooling
  (`tinypool` via `vitest`); fixing requires a breaking vitest upgrade.

## 3. Criteria Check
- [x] **Spec Convergence:** all 34 ACs (`AC-001`–`AC-034`) are implemented and
      exercised; none withdrawn.
- [ ] **Task Completion:** **FAIL.** 36 of 38 tasks complete. Open: `P6/T7.3`
      (manual responsive/keyboard/French QA) and `P6/T7.4` (deployed
      HTTPS/HSTS/PWA confirmation). `P7/T8.2` is now complete from the
      performance and test evidence.
- [x] **Traceability:** 45 of 45 rows complete. NFR-008 has the deployed sync
      and 150 ms acknowledgement evidence; NFR-009 has 5/5 axe tests.
- [x] **Coverage:** 100% — 34/34 in-scope ACs have a linked test, 0 withdrawn,
      39/39 feature tests passing.
- [x] **Test Report:** `test-report-event-platform-expansion-v1-2026-11-23.md`
      exists with the version in its filename and postdates `spec.md` and
      `plan.md`.
- [x] **Test Evidence:** `exitCode: 0`, 39 passed / 0 failed, 34 AC IDs. The
      evidence commit is the parent of `HEAD`; the diff is `.sdrive/`-only, so a
      documented parent-commit exception is recorded. The verdict remains FAIL,
      so the exception does not clear the release.
- [x] **Change Scope:** 149 files, 34 commits, all on this branch; no
      other-feature commit, no unplanned application file. 90 matched / 85
      pre-existing verify extras. `next` 16.4.6 and `@base-ui/react` 1.9.0 are
      maintenance fixes. The tree was clean at bind; this review adds only its
      tasks/review artifacts.
- [x] **Test Quality:** no `.only`, `xit`, `xdescribe`, `.skip` or `.todo`; no
      commented-out assertions; every feature test carries an AC or NFR ID.
- [x] **Code Quality:** `tsc --noEmit` exit 0; `eslint` exit 0 with 0 errors and
      20 pre-existing warnings; production build exit 0.
- [ ] **Security:** **FAIL** at the dependency layer. Production audit is clean;
      the full audit reports 2 critical / 5 high in dev-only tooling. Secrets are
      clean (manual scan; no scanner installed). CON-51x controls pass except
      **CON-520 not_verified** because T7.4 is open.
- [x] **Testing:** 39/39 feature tests and 262/262 repo-wide tests pass.
- [x] **Documentation:** `CHANGELOG.md` and `README.md` record this wave; T8.3 is
      closed. The Base UI dependency fix is not user-facing.
- [ ] **NFR Evidence:** **WARN.** NFR-007 pass; NFR-008 pass on the deployed dev
      deployment (sync p95 2,480 ms at 500 rows, 2,322 ms at 15,000 rows; offline
      ack p95 32.76 ms); NFR-009 axe 5/5. Real Safari/VoiceOver still exposes an
      unnamed Base UI focus guard, and auth-gated contrast is unmeasured, so the
      NFR-009 claim is limited to the tested surfaces. SEO pass (Lighthouse
      1.00).
- [ ] **Definition of Done:** **FAIL.** T7.3/T7.4 are open; the evidence binding
      uses the documented parent-commit exception; dev-only critical advisories
      remain. Everything else is green.
- [x] **Spec-to-Code Verification:** `sdrive verify` returns `warn`, not `fail`
      (matched 90, missing 0, extra 85 pre-existing).
- [ ] **CI:** **not verified.** No CI configuration exists; recorded as not
      verified, never as a pass.
- [x] **Permission:** `check-permission.js slash /sdrive:review` allowed
      `kenule500` (admin).
- [x] **Reviewer Independence:** `feature.assignee` is unset, so no
      self-approval conflict arises.
- [x] **Governance Checks:** `sdrive check` exit 0; `sdrive validate` exit 0;
      `sdrive audit:verify` 67 verified. Doctor still warns about 5 adapter paths
      and 1 modified framework file (info).

## 4. Change Scope
- Files changed: 149
- Commits on the branch: 34 (base `main`, merge-base `47794a6`)
- Planned/feature files: no unplanned application file; 90 matched/85
  pre-existing verify extras
- Other-feature commits: none
- Working tree: clean at bind; this review adds only `tasks.md`, `tasks.json`,
  `review.md` and `review.json`
- Maintenance outside the feature plan: `next` 16.4.6 and `@base-ui/react` 1.9.0
  (security and accessibility fixes); 15 of 34 commit subjects do not name the
  feature (low, CON-611).

## 5. Issues Found
| Severity | Issue | Location | AC | Fix Required | Fix with |
|----------|-------|----------|----|--------------|----------|
| High | T7.3/T7.4 remain open: no manual responsive/keyboard/French pass and no deployed HTTPS/HSTS/PWA confirmation. | `tasks.md` | AC-014, AC-032 | Yes | Human at a browser and host |
| Medium | Full `npm audit` reports 2 critical / 5 high dev-only advisories (`tinypool` via `vitest`); production audit is clean. | `package-lock.json` | — | Yes | `/sdrive:secure` |
| Low | 15 of 34 commit subjects do not name the feature (CON-611). | `git log main..HEAD` | — | No | Future commits |
| Low | `Dockerfile` uses `npm install`; `.dockerignore` does not exclude `.env.production`. | `Dockerfile`, `.dockerignore` | — | No | `/sdrive:secure` |
| Low | `npm run a11y` points at the non-existent `test/a11y`. | `package.json` | — | No | `/sdrive:debug` |
| Info | Doctor warns about 5 unverified adapter paths and 1 modified framework file. | `.sdrive/` | — | No | `sdrive update` / `sdrive adapters:verify` |
| Info | Evidence commit `541c503` is the parent of `HEAD` `dc2f9bd`; a documented parent-commit exception is recorded. | `test-evidence.json` | — | No | Governance decision (tree hash or exception) |

### Prior findings cleared
- **F1** — `sdrive check` now exits 0; the `review:cold` permission rule and the
  framework update are in place.
- **F3** — the working tree is clean; `.perch/` is ignored.
- **F4** — NFR-008's 500-item sync now has a deployed measurement: 2,480 ms p95
  at 500 rows and 2,322 ms p95 at 15,000 rows, both under 5,000 ms.
- **F6** — NFR-009 axe coverage exists: 5/5 tests on the door console, register
  modal, question builder, sponsor strip and wallet screen.
- **F7** — `next` is 16.4.6; the production audit is clean and the first build no
  longer aborts.
- **F2** — evidence binding is handled by the documented parent-commit exception;
  the self-reference trap is not silently marked as a pass.
- **T8.2** — complete: NFR-007, NFR-008 and NFR-009 evidence is recorded.

## 6. Recommendations
- Complete **T7.3** (360/768/1280, English/French, keyboard-only, visible focus)
  and **T7.4** (deployed HTTPS/HSTS, same-origin manifest/service worker, PWA
  install prerequisites, wallet credential status) with a human at the browser
  and host. These are the only release blockers.
- Settle the evidence self-reference in governance: record the run's tree hash,
  or make the parent-commit exception a documented rule instead of a one-off.
  Do not hand-edit `commit` in `test-evidence.json`.
- Run `/sdrive:secure` for the dev-only `tinypool`/`vitest` advisories and the
  Dockerfile hardening; the production audit is already clean.
- Fix `npm run a11y` so the documented accessibility gate runs the real axe
  suite.
- Name the feature in future commit subjects (CON-611).
- Known but out of this review's scope: `events:deleteEvent` still hits the
  4,096-read limit on a 15,000-registration event (found during the NFR-008
  benchmark; handed off).
- Add CI: the repository has no `.github/workflows`, so CI cannot be verified.

## 7. Security & Performance
| Area | Status | Reason / measurement |
|------|--------|----------------------|
| Security — secrets, dependencies, CON-51x baseline | **fail** | Secrets clean (manual diff scan; no scanner installed; no tracked `.env*`). Dependencies: production audit 0; full audit 15 (2 critical / 5 high) in dev-only `tinypool`/`vitest`. Baseline: CON-511, 512, 514, 515, 517, 519 pass; CON-513, 516, 518 not applicable; **CON-520 not_verified** because T7.4 is open. |
| Performance — NFRs, SEO | **pass** | NFR-007 pass (cached 1.3/230.9 ms p95 at 500 rows, 6.8/135.0 ms at 15,000; uncached 0.5/1.4 and 6.5/10.2 ms). NFR-008 pass: door snapshot 1,610.6 ms p95 and attendee search 73.6 ms p95 at 15,000 rows; deployed 500-item sync p95 2,480 ms at 500 rows and 2,322 ms at 15,000; offline ack 32.76 ms p95. NFR-009 axe 5/5; Lighthouse accessibility 0.96, SEO 1.00. Safari/VoiceOver focus guard and auth-gated contrast remain a limitation for T7.3. Report: `.sdrive/reports/performance/performance-report-event-platform-expansion-v1-2026-11-22.md`. |

## 8. Handoff
- **Verdict:** FAIL. This is review round **4**, opened with explicit human
  authorization after the round-3 cap. The remaining high finding is manual.
- **Fix with:**
  1. Human: complete T7.3/T7.4 at a browser and a live host.
  2. `/sdrive:secure event-platform-expansion` — dev-only vitest/tinypool
     advisories and Dockerfile hardening.
  3. Fix `npm run a11y` (package script).
  4. After T7.3/T7.4, run `sdrive test event-platform-expansion` and then
     `/sdrive:review event-platform-expansion`. Do not hand-edit the evidence
     commit; the parent-commit exception is the documented bridge.
- **Round cap:** the only automated work left is optional (`/sdrive:secure`,
  a11y script). The blocking items need a human, so another automated review
  round before they are done would fail again.
- **No merge and no lifecycle move:** the feature stays in
  `.sdrive/specs/ongoing/event-platform-expansion/`; `/sdrive:archive` is the
  only command that merges and archives, and it requires a PASS.
