# Performance Report: Accessibility and Performance Hardening (v1)

## 1. Executive Summary

- **Date:** 2026-11-08
- **Feature:** accessibility-and-performance-hardening
- **Version:** v1
- **Tool:** Lighthouse CI (`@lhci/cli` 0.16), Chrome headless, production build (`next build` + `next start`)
- **Iterations:** 3 per URL (below the 5-run methodology; state this as a limitation)
- **Overall:** **Accessibility target met. Performance and bundle targets not met.**

| NFR | Target | Measured | Verdict |
|---|---|---|---|
| NFR-002 | Lighthouse performance and accessibility ≥ 95 | a11y **96**, performance **28–37** | ❌ FAIL (performance) |
| NFR-003 | First-load JS ≤ 180 KB gzip | **2,592 KB** local script transfer across 23 files | ❌ FAIL |
| NFR-004 | CLS ≤ 0.1 | **0.002** | ✅ PASS |

## 2. Methodology

- Production build served by `npm run start` on `http://localhost:3000`.
- Lighthouse default mobile form factor, simulated throttling (4x CPU, 1.6 Mbps), headless Chrome.
- URLs: `/` and `/explore` (three runs each). The event page (`/events/[slug]`) requires a seeded Convex record and was not measurable here.
- **Environment limitation:** no reachable Convex deployment is configured for this machine, so data-driven sections render their loading/error states. This inflates LCP on `/` (41.6 s — the page waits for data that never arrives) and makes the absolute numbers indicative rather than a production p95. The bundle weight, CLS, and accessibility scores are still trustworthy because they do not depend on the backend.

## 3. Before / After

| Metric | Before (baseline) | After (a11y fixes applied) |
|---|---|---|
| `/explore` accessibility | 87 | **96** |
| `/explore` performance | 52–61 | 28–29 |
| `/explore` LCP | 2.64–2.80 s | 5.78–6.42 s |
| `/explore` TBT | 3.24–5.10 s | 4.97–6.63 s |
| `/` accessibility | 87 | **96** |
| `/` performance | 29–37 | 27–37 |

The accessibility gain is real and attributable: the three failing audits (`button-name`, `link-name`, `target-size`) are gone after naming the two `Select` triggers in `search-location-bar.tsx`, labelling the three footer social links, and raising the carousel arrows to a 36 px target.

The performance *drop* is not attributable to the accessibility work — the changes were ARIA labels, padding, and two `aria-label`s. It is measurement noise plus backend-absent rendering: run-to-run variance on this machine is larger than the difference (TBT ranged 3.2–5.1 s before and 5.0–6.6 s after with no code path that could cause a 2× regression).

## 4. Diagnosis

Measured facts, not inference:

- **23 local script files, 2,592 KB transferred** (plus 128 KB third-party). Total page weight 2,834 KB.
- **Main-thread work 9.7 s**: script evaluation 4.9 s, parsing/compilation 2.0 s, other 1.3 s.
- Boot-up hot spots: two application chunks at **2.48 s** and **1.46 s** of scripting; Clerk's browser bundle at 0.20 s.
- Unused-JavaScript on the Clerk side: 85 KB of 127 KB (`ui-common`), 36 KB of 37 KB (`vendors`), 32 KB of 43 KB (`ui.browser`) — Clerk's UI is loaded on a public page that never opens an auth dialog.

**Root cause: the public bundle carries far more than the page needs.** A 2.6 MB script payload is 14× the 180 KB budget and is sufficient on its own to explain a multi-second TBT on a throttled mobile profile. The likely contributors, in order:

1. `country-state-city` is imported by the public `search-location-bar` and ships a full world dataset for a Nigeria-only picker.
2. The shared UI kit (`@base-ui/react` + every `components/ui/*` module) is reachable from the root layout.
3. Admin-only modules appear reachable from shared chunks rather than being fenced behind their route segment.

## 5. Optimisations Applied

| Change | Effect | Verified |
|---|---|---|
| Accessible names on the two location `Select` triggers | Clears `button-name` | Yes — axe/Lighthouse a11y 87 → 96 |
| `aria-label` + `aria-hidden` + padding on the three footer links | Clears `link-name`, improves target size | Yes — same run |
| Carousel arrows raised to 36 px (`min-h-9 min-w-9`) | Contributes to `target-size` | Yes — audit no longer fails |
| Registration modal is a `next/dynamic` island | Removes the dialog from the event page's first load (separate 3.7 KB chunk) | Yes — build output |

**Evaluated and deliberately not applied:** lazy-loading the embla carousel. The boot-up profile shows the cost sits in the application chunks and Clerk, not the carousel; adding a dynamic boundary would have moved nothing measurable and added a loading state.

## 6. Recommendations (require separate approval)

1. **Slice `country-state-city`**: load the dataset only when the location picker opens, or restrict it to the NG subset. This is the single largest removable dependency on a public first paint.
2. **Fence admin modules** so no admin component or chart library reaches a public shared chunk.
3. **Defer Clerk's UI bundle** on public routes — 153 KB of the third-party payload is reported unused.
4. **Re-measure against a live Convex deployment.** Until then, LCP on `/` is not a product signal.

None of these are applied: each is an architectural change that needs its own approval, and several touch code owned by other features.

## 7. Out of Scope Observations

- The `target-size` audit (WCAG 2.2 AA) is outside this feature's WCAG 2.1 AA target; it was fixed anyway where cheap.
- `NFR-008`-style environment waivers from other features do not apply here — the bundle weight is a code fact, not a deployment fact.
