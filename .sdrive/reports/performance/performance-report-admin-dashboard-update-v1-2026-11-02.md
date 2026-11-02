# Performance Report: Admin Dashboard Update (v1)

**Task:** T7.2 — Record NFR-008 performance evidence or a waiver
**Date:** 2026-11-02
**Feature version:** v1
**NFR:** NFR-008 — "Filtered analytics MUST return within 1.5 seconds p95 and the dashboard within 1 second p95 at 50,000 events and 500,000 registrations, using index ranges and bounded windows rather than collection scans."
**Verdict:** **WAIVER** (not a pass, not a code failure — see §3)

## 1. Executive Summary

- **Why this is a waiver, not a pass or a fail:** a benchmark harness was built and
  run at the full declared volume, but the discriminator in §3 proves the harness
  cannot produce a number that describes the production runtime. Recording either
  "pass" or "fail" from those timings would be dishonest. The requirement is
  therefore waived, with the query-plan half of NFR-008 verified statically (§4)
  and the numeric half left to a deployment-time check (§7).
- **What was actually measured:** a real in-memory Convex backend
  (`convex-test` 1.x + `convex`), seeded with the exact declared volume
  (50,000 users / 50,000 events / 500,000 registrations, ~22 s of seeding), running
  the real `analytics:*` and `commandCenter:*` query handlers under an admin identity.
- **What the numbers mean:** they measure `convex-test`'s JavaScript emulation of a
  Convex deployment, not Convex itself. Convex's production index reads are backed
  by real B-tree ranges; the emulator reimplements an index range by iterating the
  whole table in JS. §3 isolates that and proves it.

## 2. Benchmark Methodology

- **Tool:** custom harness — `.sdrive/reports/performance/benchmarks/nfr-008-benchmark.mjs`
  (bundles `convex/` with esbuild, seeds via `convex-test`, times handlers with
  `performance.now()`), plus a discriminator — `benchmarks/scan-or-index-probe.mjs`.
- **Environment:** local Node.js v24.20.0, Windows. **No deployed Convex backend is
  reachable from this environment**, so no production or dev-deployment measurement
  was possible.
- **Iterations:** 7 per case; the fastest and slowest are discarded and the median /
  p95 are taken from the remaining 5.
- **Volume:** the NFR's declared volume — 50,000 events, 500,000 registrations,
  50,000 users, spread across the last 730 days (the widest legal window).
- **Raw data:** `benchmarks/nfr-008-raw.json` (partial — see §3), `benchmarks/<*.log>`.

## 3. Why the Harness Cannot Certify NFR-008 (the discriminator)

Two controlled experiments establish that the harness measures the emulator, not
the app.

**(a) Result-set held constant, table size grown.** `scan-or-index-probe.mjs` keeps
row density fixed at 200/day and grows history from 1 to 8 years. A 30-day window
therefore always returns the **same 6,200 rows**; only the total table size changes.

| History | Total rows | Rows in 30-day window | Index read | `resolveAnalyticsScope` |
|--------:|-----------:|----------------------:|-----------:|------------------------:|
| 1 year  |         73,000 |                 6,200 |   401 ms |   378 ms |
| 2 years |        146,000 |                 6,200 |   490 ms |   613 ms |
| 4 years |        292,000 |                 6,200 |   731 ms | 1,087 ms |
| 8 years |        584,000 |                 6,200 | 1,322 ms | 2,122 ms |

A production index range on a **fixed** result set must stay flat. Here cost grows
with total rows, which is the signature of a scan — and it is exactly what the
emulator does.

**(b) The emulator's source confirms it.** In `node_modules/convex-test/dist/index.js`,
`_resolveQuerySource()` handles `case "IndexRange"` by calling
`this._iterateDocs(tableName, (doc) => { if (source.range.every(...)) results.push(doc); })`
— i.e. it walks **every document in the table** and filters in JavaScript. It does
not maintain a B-tree. `.withIndex()` there is correctness-faithful but not
performance-faithful.

**Consequence:** the full-scale run reported `analytics:getSummary (30d)` at
≈9.7 s median / ≈12 s p95 (target 1.5 s). That number is dominated by the
emulator's JS scan of 500k rows and is **not** a statement about Convex's indexed
read path. It is recorded here for transparency and explicitly **not** used as the
NFR-008 verdict.

## 4. Static Evidence — the Query-Plan Half of NFR-008 IS Satisfied

NFR-008 has two clauses. The second — "using index ranges and bounded windows
rather than collection scans" — is verifiable from source, and it holds.

**Every filtered analytics query resolves through one indexed scope**
(`convex/analyticsFilters.ts` → `resolveAnalyticsScope`), which the plan requires:

- events → `.withIndex("by_startDate", q => q.gte("startDate", start).lte("startDate", end))`
  (or `by_category` for a single-category filter), bounded by `.take(MAX_SCOPE_EVENTS = 20,000)`;
- registrations → `.withIndex("by_registeredAt", q => q.gte(...).lte(...))`, bounded
  by `.take(MAX_SCOPE_REGISTRATIONS = 50,000)`;
- users → `.withIndex("by_createdAt", q => q.gte(...).lte(...))`, bounded by `.take(20,000)`;
- the window itself is clamped to `MAX_RANGE_DAYS = 730` and rejected if `start > end`.

**The indexes the plan named all exist in the schema and shipped in the same
deploy as the tables** (`convex/schema.ts`): `users.by_createdAt`,
`registrations.by_registeredAt`, `registrations.by_event_status`,
`events.by_startDate`, `events.by_category`, `events.by_organizer`.

**Bounded windows, every result capped.** No new analytics/operations handler calls
`.collect()`: the feature additionally *removed* one — `convex/audit.ts`
`getAuditLogs` changed from `.collect()` to `.withIndex("by_createdAt").order("desc").take(limit)`
with `MAX_AUDIT_ROWS = 2000`. Dashboard and health panels read with `.take(...)`
bounds (100 / 200 / 5000), and exports stop at `MAX_EXPORT_ROWS = 10,000`.

Residual scans that are pre-existing on `main` and outside this feature's tasks
(recorded for the reviewer, not fixed here because they are not in the plan):
`convex/dashboard.ts` `getEventStats` (`.withIndex("by_event").collect()`, event-scoped)
and `convex/audit.ts` `getAuditStats` (`auditLogs.collect()`). Neither is on an
analytics or new-dashboard path.

## 5. Gate Check

- Speed target: **not measurable here** → waived (§6, §7). The plan's own fallback
  for a genuine miss ("a documented daily aggregate table, not heavier client work")
  is unchanged and still available.
- Query-plan clause: **satisfied** (§4).

## 6. Waiver

**NFR-008's numeric targets (analytics p95 ≤ 1.5 s, dashboard p95 ≤ 1 s at 50k
events / 500k registrations) are waived for this environment**, on the grounds that
no harness available here can measure them:
- the only available Convex runtime is `convex-test`, whose index-range emulation is
  a full-table JS scan (§3), so its timings describe the emulator;
- no deployed Convex backend (dev or prod) is reachable from this environment, so the
  real indexed read path cannot be timed.

This waiver is **scoped to the environment, not to the requirement.** It does not
assert the NFR is met; it asserts it cannot be honestly measured here, and it names
the production check that closes it (§7). Owner action is required before the
analytics feature flag is enabled in production — the plan already requires that
verification step ("each filtered query's index usage is verified before the
analytics flag is enabled").

## 7. Remaining Verification (must be done against a real deployment)

1. Deploy the schema, then run the same cases in `nfr-008-benchmark.mjs`'s `cases`
   list against a Convex dev deployment seeded to 50k/500k, measuring server execution
   time (Convex dashboard "function latency", or `p95` from repeated calls).
2. Confirm the Convex dashboard reports **index range** reads (not table scans) for
   `analytics:getSummary`, `getTimeSeries`, `getFunnel`, `getCohorts`, `getHeatmap`,
   `getBreakdown`, `commandCenter:getTrends`, `getActionQueue`, `getToday`.
3. If any case exceeds target, apply the plan's stated fallback: a daily aggregate
   table populated by a cron — not heavier client work.

## 8. Regression Verification

- [ ] Functional test suite — **not run here**; running the test runner is the Test
      Agent's job (`/sdrive:test`). The feature suite's last recorded run is 43/43
      (`test-evidence.json`, commit `2c6171c`).
- [ ] No security vulnerabilities introduced — **not run here** (no `/sdrive:secure` pass
      in this task). The benchmark harness is read-only and executes no project writes.
- [x] No production code changed — this task wrote only `.sdrive/` evidence and harnesses.
- **Limitations:** stated explicitly above; no timing here is a production claim.

## 9. Out of Scope Observations (for `/sdrive:review`, not fixed here)

- `convex/dashboard.ts` `getEventStats` and `convex/audit.ts` `getAuditStats` still
  `.collect()`; `auditLogs` grows without bound, so `getAuditStats` will eventually
  need the same bounded treatment `getAuditLogs` received in this feature.
