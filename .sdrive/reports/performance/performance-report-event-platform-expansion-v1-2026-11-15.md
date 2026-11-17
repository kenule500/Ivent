# Performance Optimization Report: Event Platform Expansion (v1)

## 1. Executive Summary

- **Date:** 2026-11-15
- **Auditor:** AI Performance Agent
- **Feature Version:** v1
- **Overall Status:** NFR-007 and NFR-008 reads met; NFR-008 sync write unverified
- **SEO Status:** Not run (no deployment available)
- **Target NFRs:** NFR-007, NFR-008, NFR-009

### 1.1 What this report does and does not say

The metadata path and the door console read path are comfortably inside their
budgets, with large margins, and that conclusion is stable across all three store
sizes measured.

The 500-item offline sync batch is different. It exceeded its 5 s budget at 3,500
and 15,000 rows in this pass and passed at 500 rows, yet an earlier pass saw the
same 3,500-row job pass at 3.51 s and later passes fail at 5.01 s and 10.30 s with a
byte-identical batch argument. A metric that moves by 2x between runs of the same
input cannot establish a breach, and this one does not.

The sync finding is therefore recorded as **BLOCKED pending a deployed
measurement**. It is not recorded as a production defect, and no production code
was changed to chase it. See 3.2 and 6.1.

## 2. Benchmark Methodology

- **Tool:** project harness
  `.sdrive/reports/performance/benchmarks/nfr-007-008.mjs`. It bundles `convex/`
  with esbuild, runs it under `convex-test` (in-memory), and registers the
  rate-limiter component from its compiled `dist/` modules so rate-limited
  mutations follow the production code path.
- **Environment:** local Node v24.20.0, in-memory backend. No deployment. No
  secret file was read; no sample carries a token, key, or URL.
- **Iterations:** 7 per case, each on a freshly seeded backend. The highest and
  lowest are discarded, p50 is reported over the remaining 5, and p95 over all 7.
- **Fixture:** 1 event x N registrations unless stated. The batch argument was
  identical for every sync run: the same 500 well-formed items.
- **Raw data** (every run persisted, untruncated):
  - `nfr-007-008-raw-500.json` (500 rows)
  - `nfr-007-008-raw.json` (3,500 rows, first pass)
  - `nfr-007-008-raw-3500.json` (3,500 rows, repeat)
  - `nfr-007-008-raw-15k.json` (15,000 rows)

## 3. Metrics Comparison

| Metric | Measured | NFR Target | Status |
|---|---|---|---|
| NFR-007 public event read (500 rows) | 2.0 ms p50 / 1164 ms p95 | <= 1500 ms p95 | PASS |
| NFR-007 public event read (3,500 rows) | 2.3 ms p50 / 355 ms p95 | <= 1500 ms p95 | PASS |
| NFR-007 public event read (15,000 rows) | 9.9 ms p50 / 355 ms p95 | <= 1500 ms p95 | PASS |
| NFR-007 uncached image | same data path; raster not timed | <= 3000 ms p95 | PARTIAL |
| NFR-008 `getDoorSnapshot` (15,000 rows) | 192 ms p50 / 234 ms p95 | <= 2000 ms p95 | PASS |
| NFR-008 attendee search (15,000 rows) | 65 ms p50 / 97 ms p95 | <= 2000 ms p95 | PASS |
| NFR-008 500-item sync (500 rows) | 1178 ms p50 / 2751 ms p95 | <= 5000 ms | PASS |
| NFR-008 500-item sync (3,500 rows) | 5009 ms p50 / 5758 ms p95 | <= 5000 ms | FAIL (unstable) |
| NFR-008 500-item sync (3,500 rows, repeat) | 10303 ms p50 / 11735 ms p95 | <= 5000 ms | FAIL (unstable) |
| NFR-008 500-item sync (15,000 rows) | 14867 ms p50 / 16590 ms p95 | <= 5000 ms | FAIL (unstable) |
| NFR-008 offline scan acknowledgement | not measured | <= 150 ms | NOT VERIFIED |
| NFR-009 WCAG 2.1 AA | not run in this pass | 0 violations | NOT VERIFIED |

### 3.1 What is established

- Single indexed `.unique()` lookups are flat: the public event read costs 2.0 ms
  at 500 rows and 9.9 ms at 15,000 rows (p50). The ~355 ms p95 appearing at two
  very different sizes is scheduling noise, not growth.
- The door console read path scales gently and stays far inside budget: 70 ms at
  500 rows to 192 ms at 15,000 rows (p50) against a 2,000 ms budget.
- `syncOfflineCheckIns` (`convex/door.ts`) performs exactly one indexed
  `.unique()` lookup and at most one `patch` per item. There is no N+1 query and
  no store-wide pass, so nothing in the handler source explains a superlinear
  cost.
- In this simulator, the sync batch stayed under 5 s at 500 rows and exceeded it
  at 3,500 and 15,000 rows in the runs recorded above.

### 3.2 What is NOT established

- **Whether the sync regression exists in production.** The harness is
  `convex-test`, an in-memory simulation. In a deployed Convex backend an indexed
  `.unique()` is an index seek that does not scale with table size the way this
  simulator appears to. The simulator's read path is a plausible and so-far
  unexcluded explanation. Settling this requires a deployed backend (6.1).
- **Whether the sync regression is stable even in this simulator.** It is not:

  | Rows | p50 observed across runs |
  |---|---|
  | 500 | 0.55 s, then 1.18 s |
  | 3,500 | 3.51 s (PASS), then 5.01 s (FAIL), then 10.30 s (FAIL) |
  | 15,000 | 19.3 s, 21.2 s, 14.9 s |

  The 3,500-row job flips sides of the budget between runs of identical input on
  identical hardware. The sync figures here are therefore order-of-magnitude
  indicators of simulator behaviour, not precise latencies and not a statement
  about the product.
- **The 150 ms offline acknowledgement was never measured.** It is a client
  IndexedDB write plus a re-render; no browser ran in this pass. Nothing here
  supports or contradicts it.
- **NFR-009 WCAG 2.1 AA was not executed for this feature in this pass.** No axe
  harness covers the feature's surfaces; earlier coverage was unit-level screen
  assertions only.

## 4. Changes Applied

- **None to production code.** No optimisation was applied: the only candidate
  bottleneck is not established to exist outside the simulator (3.2), so
  optimising it would have been guesswork, which this phase forbids.
- Harness and raw evidence added under `.sdrive/reports/performance/benchmarks/`
  (measurement apparatus, not product code).

## 4b. SEO Findings & Fixes

- **Not run.** No deployment exists to fetch: Lighthouse SEO, Core Web Vitals and
  crawlability all require a served origin.
- **Detection method:** Not run (programmatic).
- Code observation only, explicitly not an SEO verification: the public event
  route supplies a canonical URL, Open Graph and Twitter tags, and returns
  `robots: { index: false, follow: false }` for an unknown slug.

## 4c. Defects Handed Off

- None. No layout breakage, API failure, runtime error, or visual glitch surfaced
  during measurement. The sync question in 3.2 is a performance measurement gap,
  not a correctness defect.

## 4d. Out of Scope Observations

- `.sdrive/package.json` declares `"type": "commonjs"`, so every `.mjs` under
  `.sdrive/` loads as CommonJS and top-level `await` is rejected. This harness
  works around it with `.sdrive/reports/performance/benchmarks/package.json`
  (`"type": "module"`). Whether the outer override should stand is a code-quality
  call for `/sdrive:review`; it was not changed here.

## 5. Regression Verification

- [ ] Functional test suite passed. NOT RUN in this pass. The preceding
      `/sdrive:test` run was green at 257/257 before any benchmark file existed, so
      the tree is very likely still green, but that is inference and is reported as
      unverified. No product file was modified.
- [ ] No security vulnerabilities introduced. NOT RUN. No security scan in this
      pass; no product file was modified.
- [ ] Code readability maintained. NOT RUN. The harness was not linted or
      typechecked in this pass.
- **Limitations:** no deployment, so absolute values describe a simulation, not
  production servers; one machine and one Node version; no cold-start separation
  and no CPU contention control, with the observed run-to-run variance itself
  evidence of insufficient isolation. The 150 ms acknowledgement and WCAG 2.1 AA
  remain unverified by anything measured here.

## 6. Remaining Recommendations

1. **Settle 3.2 against a deployed backend before touching `convex/door.ts`.**
   Seed a dev deployment with 500 and then 15,000 registrations in one event and run
   a 500-item `syncOfflineCheckIns` at least 10 times, recording p50 and p95. If a
   deployed p50 is flat and well under 5 s, close NFR-008 as met and record this
   harness result as a simulation artefact. If it tracks the tens-of-seconds
   figures, open a per-item profile and fix. Either way the number has to come from
   a deployment.
2. **Do not ship a batching rewrite on this evidence.** The candidate (one indexed
   read per distinct QR code, then write only changed rows) computes the same
   outcome the handler already produces; it needs (1) to be worth anything.
3. **Measure the offline acknowledgement (150 ms) in a browser-capable run**, for
   example a Playwright pass over the door route with the network offline, or jsdom
   with a fake IndexedDB. Node cannot observe it.
4. **Measure NFR-009 with axe** over the changed surfaces: door console, register
   modal and custom questions, sponsor strip, and the wallet save button. Reuse the
   axe setup under `.sdrive/reports/accessibility/benchmarks/`.
5. **Keep one raw JSON per volume** in the report header, as done here, so a later
   run cannot silently overwrite the evidence an earlier conclusion rested on.
