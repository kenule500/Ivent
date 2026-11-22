# Performance Optimization Report: Event Platform Expansion (v1)

## 1. Executive Summary
- **Date:** 2026-11-22
- **Auditor:** AI Performance Agent
- **Feature Version:** v1
- **Overall Status:** NFRs partially met — NFR-007 and NFR-008 read paths pass, NFR-008's 500-item sync is blocked on a deployed measurement, NFR-009 is partially verified
- **SEO Status:** Metadata clean (Lighthouse SEO 1.00 on `/` and `/explore`); a repo-wide Core Web Vitals finding remains open
- **Target NFRs:** NFR-007, NFR-008, NFR-009

**What this run did:** re-measured NFR-007 and NFR-008 against the current `HEAD`
(`3ac621b`, Next.js 16.4.6) at 500 and 15,000 stored registrations with 10
iterations per case, ran the axe suite, and ran Lighthouse against the local
production build. **No production code was changed.** The 500-item sync still
has no deployed measurement, and `convex/door.ts` was deliberately left
untouched (the review's F2 handoff forbids changing it before that number
exists).

## 2. Benchmark Methodology
- **Tool used:** project harness `.sdrive/reports/performance/benchmarks/nfr-007-008.mjs`
  (esbuild bundle of the Convex functions, `convex-test` in-memory backend,
  rate-limiter component registered, a fresh backend seeded per iteration).
- **Environment:** local Node v24.20.0; in-memory Convex simulation. It does not
  include HTTP round-trip, CDN, satori/PNG raster, browser paint, or the
  client-side IndexedDB write.
- **Iterations:** 10 per case; highest and lowest discarded; p50 of the remaining
  8 and p95 over all 10. Two volumes: 500 rows (1 event × 500 registrations) and
  15,000 rows (1 event × 15,000 registrations).
- **Lighthouse:** Lighthouse 13.6.0 via `npm run lighthouse` (3 runs per URL,
  headless Chrome, simulated throttling) against `npm run start`.
- **Axe:** `npx vitest run test/accessibility-and-performance-hardening/axe.test.tsx`
  (WCAG 2.1 A/AA tags; `color-contrast` disabled because jsdom has no layout engine).
- **Raw data:** `.sdrive/reports/performance/benchmarks/nfr-007-008-raw-500-node.json`
  and `nfr-007-008-raw-15k-node.json`.

## 3. Metrics Comparison
No optimization was applied, so baseline and after values are the same run.

| Metric | Baseline (Before) | Optimized (After) | NFR Target | Status |
|--------|-------------------|-------------------|------------|--------|
| NFR-007 cached OG query, 500 rows | 1.3 ms p50 / 230.9 ms p95 | not changed | ≤ 1,500 ms p95 | ✅ |
| NFR-007 cached OG query, 15,000 rows | 6.8 ms p50 / 135.0 ms p95 | not changed | ≤ 1,500 ms p95 | ✅ |
| NFR-007 uncached OG query, 500 rows | 0.5 ms p50 / 1.4 ms p95 | not changed | ≤ 3,000 ms p95 | ✅ |
| NFR-007 uncached OG query, 15,000 rows | 6.5 ms p50 / 10.2 ms p95 | not changed | ≤ 3,000 ms p95 | ✅ |
| NFR-008 door snapshot, 500 rows | 18.1 ms p50 / 31.5 ms p95 | not changed | ≤ 2,000 ms p95 | ✅ |
| NFR-008 door snapshot, 15,000 rows | 923.6 ms p50 / 1,610.6 ms p95 | not changed | ≤ 2,000 ms p95 | ✅ |
| NFR-008 attendee search, 500 rows | 2.2 ms p50 / 4.1 ms p95 | not changed | ≤ 2,000 ms p95 | ✅ |
| NFR-008 attendee search, 15,000 rows | 53.2 ms p50 / 73.6 ms p95 | not changed | ≤ 2,000 ms p95 | ✅ |
| NFR-008 500-item sync, 500 rows | 365.4 ms p50 / 491.4 ms p95 | not changed | ≤ 5,000 ms | ✅ |
| NFR-008 500-item sync, 15,000 rows | **15,235.9 ms p50 / 17,281.1 ms p95** | not changed | ≤ 5,000 ms | ❌ (in-memory) |
| NFR-008 offline ack | not observable in Node | not changed | ≤ 150 ms | not_verified |
| NFR-009 public pages (Lighthouse) | `/` 0.96, `/explore` 0.96 | not changed | WCAG 2.1 AA, ≥ 0.95 | ✅ for public pages |
| NFR-009 feature auth-gated surfaces | not covered | not changed | WCAG 2.1 AA | not_verified |
| SEO metadata | `/` 1.00, `/explore` 1.00 | not changed | metadata complete | ✅ |
| Home LCP | 41.3–41.6 s | not changed | ≤ 2,500 ms (Lighthouse budget) | ❌ |
| Explore LCP | 2.4–2.9 s | not changed | ≤ 2,500 ms | ❌/borderline (2.4 s pass, 2.9 s fail) |
| Home TBT | 1,152–1,751 ms | not changed | ≤ 200 ms | ❌ |
| Explore TBT | 1,334–2,269 ms | not changed | ≤ 200 ms | ❌ |
| CLS (both pages) | 0.002 | not changed | ≤ 0.1 | ✅ |

**Interpretation of the sync numbers.** At 500 rows the 500-item sync is
comfortably inside budget (p95 491 ms). At 15,000 rows the in-memory simulation
reports 15.2–17.3 s, consistent with the 14.9–21.2 s range from the round-2
performance run. The 15,000-row door snapshot (1,610.6 ms p95) passes but is
within 20% of the 2,000 ms budget; treat it as a watch item. The handler
performs one indexed `.unique()` and one `patch`
per item; the per-operation cost of the simulation, not a missing index, is the
standing explanation. This is a measured **risk**, not a deployed verdict: the
in-memory harness cannot settle the 5 s budget either way, and the review's F2
requires a deployed number.

## 4. Changes Applied
- **None.** No source, schema, or dependency change was made in this run.
- `convex/door.ts` was deliberately not modified: the review handoff says no code
  change until the deployed 500-item sync number exists.
- NFR-007 and the NFR-008 read paths already meet their targets; the strict
  no-over-optimization rule applies.

## 4b. SEO Findings & Fixes
- **Detection method:** Programmatic — Lighthouse 13.6.0 SEO/accessibility
  categories against the production build; axe via the project's axe suite.
- **Metadata (clean):** `/` and `/explore` both score **1.00** on the Lighthouse
  SEO category. The event route's metadata/canonical/Open Graph/Twitter/JSON-LD
  code paths were already verified in the feature's tests (AC-001/AC-002).
- **Internationalisation:** no `hreflang` finding. The app switches locale with a
  cookie (`NEXT_LOCALE`) rather than distinct locale URLs, so there are no
  locale-specific URLs to annotate.
- **CWV finding (open):** the home page LCP is **41.3–41.6 s** with a 7.1 MB
  `public/hero.gif` as the likely LCP element; `/explore` LCP is 2.4–2.9 s. This
  is a repo-wide performance issue, not an NFR declared by this feature, and it
  was **not fixed** here. Recommendation: replace the GIF with a compressed
  video/WebP or a static poster via `next/image`, then re-measure.
- **TBT finding (open):** 1.15–2.27 s on both pages, far above the 200 ms budget.
  This is dominated by client hydration (Clerk + Convex) and is pre-existing.

## 4c. Defects Handed Off
- **`npm run a11y` points at a non-existent path.** `package.json` runs
  `vitest run test/a11y`, but no `test/a11y` directory exists; the real axe suite
  is `test/accessibility-and-performance-hardening/axe.test.tsx`. The documented
  accessibility gate therefore fails with "No test files found". Hand off to
  `/sdrive:debug` (or `/sdrive:apply` for the one-line script fix). The axe suite
  itself passes 3/3 when invoked directly.
- **The dev deployment is on older code.** `npx convex run door:getDoorSnapshot`
  reports no `door` functions, and `events:createEvent` rejects the branch's
  `countryCode`/`currency`/`locale` fields. A deployed NFR-008 measurement needs
  the branch pushed to dev (`npx convex dev --once`) and a seeded fixture; that
  is an environment action, not a code defect. It was not performed here because
  it would deploy the branch and seed a credentialed dev database. During the
  failed seeding attempt, two benchmark users (`nfr008-bench-1` and
  `nfr008-bench-2`) were created in the dev deployment via `users:store`; the
  subsequent `events:createEvent` calls were rejected by the older deployment's
  validator, so no events or registrations were written. The two users remain
  and can be removed manually.

## 4d. Out of Scope Observations
- `public/hero.gif` is 7.1 MB and dominates the home LCP; it is not part of this
  feature's NFRs but is the largest repo-wide performance lever found.
- The earlier project survey found unrelated security issues (client-trusted
  `hasPro`, non-enforced `banned` flag, invite acceptance not bound to the
  signed-in email). They are not performance findings and were not touched here.
- `lodash` is an unused dependency; `cn` is imported from two different
  implementations. No performance metric attaches to either.

## 5. Regression Verification
- [x] Functional test suite passed — `npx vitest run` at `HEAD` `3ac621b`:
      75 files / 257 tests passed.
- [x] Typecheck passed — `npx tsc --noEmit` exit 0.
- [x] Linter passed — `npm run lint` exit 0, 0 errors, 20 pre-existing warnings.
- [x] Axe suite passed — 3/3 tests.
- [ ] Security scan — not run in this command; `npm audit --omit=dev` reports 0
      production vulnerabilities after the Next.js 16.4.6 upgrade.
- **Limitations:** no deployed backend measurement; the offline 150 ms
  acknowledgement is a client IndexedDB write not observable in Node; the
  auth-gated door console, register modal and question builder were not covered
  by an axe run.

## 5b. Findings Ledger
| Finding | Terminal state |
|---------|----------------|
| NFR-007 cached/uncached OG query | already met — no optimization required (query path; raster/HTTP not measured) |
| NFR-008 door snapshot and attendee search | already met — p95 1,610.6 ms and 73.6 ms at 15,000 rows |
| NFR-008 500-item sync at 500 rows | already met — p95 491.4 ms |
| NFR-008 500-item sync at 15,000 rows | **blocked-with-reason** — in-memory FAIL (p95 17.3 s); needs a deployed measurement before any code change |
| NFR-008 offline acknowledgement | **blocked-with-reason** — client IndexedDB write, not measurable in Node |
| NFR-009 public pages | verified — Lighthouse accessibility 0.96 on `/` and `/explore`; axe suite 3/3 |
| NFR-009 auth-gated feature surfaces | **blocked-with-reason** — no seeded signed-in session for the door console/questions modal |
| Home LCP 41 s / 7.1 MB GIF | handed-off — repo-wide, outside this feature's NFRs; recommend a separate performance pass |
| Home/Explore TBT > 200 ms | handed-off — pre-existing hydration cost, outside this feature's NFRs |
| `npm run a11y` broken path | handed-off to `/sdrive:debug` |

## 6. Remaining Recommendations
1. **Deployed sync measurement (the only way to close F2).** Push the branch to
   dev (`npx convex dev --once`), seed 500 and 15,000 registrations for a bench
   event, and measure `door:syncOfflineCheckIns` with a real client for 10 runs
   at each volume, recording p50/p95. If the deployed p95 is under 5 s, record it
   and close NFR-008. If it is over, the candidate fix is to parallelise the
   per-item indexed lookups inside the mutation (for example `Promise.all` over
   the batch's `.unique()` calls before the sequential patches) and re-measure.
   Do not change `convex/door.ts` before that number exists.
2. **NFR-009 coverage for the feature surfaces.** Add axe coverage for the door
   console, register modal and custom questions, sponsor strip and wallet save
   control, or run an authenticated browser pass against the built app.
3. **Fix `npm run a11y`** to point at
   `test/accessibility-and-performance-hardening/axe.test.tsx` so the documented
   gate actually runs.
4. **Repo-wide CWV work** (separate from this feature): replace or compress
   `public/hero.gif`, re-measure `/` and `/explore` against the Lighthouse
   budgets, and investigate the Clerk/Convex hydration TBT.
5. **Re-record test evidence** only after the above changes land; the current
   `test-evidence.json` is still bound to `e6a5d2d`.
