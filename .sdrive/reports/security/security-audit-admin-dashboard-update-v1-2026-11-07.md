# Security Audit Report: Admin Dashboard Update (v1)

## 1. Executive Summary
- **Date:** 2026-11-07
- **Auditor:** AI Security Agent (for kenule500)
- **Feature Version:** v1
- **Overall Risk Level:** Low — production tree is clean
- **Total Vulnerabilities Found:** 4 groups (Critical: 1, High: 2, Dev-only Critical: 1)

The production dependency tree is now free of critical and high advisories. The single
critical and two high advisories recorded by `/sdrive:review` round 3 were cleared by a
semver-safe `npm audit fix`: `@clerk/ui` moved from `1.18.0` to `1.42.4`, which drops the
`@solana` → `react-native` → `react-devtools-core` chain that carried `shell-quote`, and
`browserslist` advanced to `4.29.5`.

Two dev-only criticals remain (`vitest` and its `tinypool` worker pool). Their published
fix is `vitest@5`, a breaking major, and they never reach the production bundle — the
user declined the major bump for this round. They are recorded as an accepted, tracked
risk, not silently dropped.

## 2. Threat Model Summary
- **Key Assets:** attendee and organizer records; admin session identity (Clerk); audit log integrity; broadcast email lists; export data.
- **Trust Boundaries:** browser ↔ Next.js server; browser ↔ Convex functions (`requireAdmin`/`requireSuperAdmin`); Convex actions ↔ email provider; admin UI ↔ super-admin-only mutations.
- **Threat focus for this audit:** supply-chain compromise and denial of service through transitive dependencies, plus the CON-51x baseline in the request path.

## 3. Vulnerability Details

### VULN-001: `shell-quote` quadratic-complexity DoS in `parse()`
- **CVSS Score:** 7.5 (High) — `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`
- **Location:** `@clerk/ui > @solana/wallet-adapter-react > @solana-mobile/wallet-adapter-mobile > react-native > react-devtools-core > shell-quote@1.8.4`
- **Advisory:** GHSA-395f-4hp3-45gv (CWE-407), vulnerable range `<=1.8.4`
- **Impact:** a crafted token string drives quadratic parsing time, exhausting CPU on any process that parses shell-like input.
- **Remediation:** `npm audit fix` moved `@clerk/ui` to `1.42.4`; the wallet-adapter chain is no longer in the tree, so `shell-quote` is not installed.
- **Status:** Fixed

### VULN-002: `browserslist` unbounded cache growth
- **CVSS Score:** 7.5 (High) — `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`
- **Location:** `browserslist@4.28.6` (via `@vitejs/plugin-react > @babel/core`)
- **Advisory:** GHSA range `<=4.28.6`; distinct query results are cached without eviction.
- **Impact:** a build or long-lived process issuing many distinct browser queries grows memory until the process is killed (OOM).
- **Remediation:** lockfile advanced to `browserslist@4.29.5`.
- **Status:** Fixed

### VULN-003: `image-size` JXL/HEIF parser infinite loop
- **CVSS Score:** 7.5 (High) — `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`
- **Location:** `image-size@2.0.x` in the transitive image pipeline
- **Advisory:** range `0.6.3 - 2.0.2`; malformed JXL/HEIF headers loop indefinitely.
- **Impact:** a single crafted image stalls the process that parses it.
- **Remediation:** removed from the tree by the same `@clerk/ui` update; no vulnerable copy remains.
- **Status:** Fixed

### VULN-004: `vitest` path traversal and `tinypool` prototype-pollution RCE gadget
- **CVSS Score:** 9.8 (Critical) — `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`
- **Location:** `vitest@3.2.7` (devDependency) → `tinypool@1.1.1`
- **Advisory:** `@vitest/mocker` redirect mock path traversal; worker-options prototype pollution in `tinypool`.
- **Impact:** arbitrary file read and a code-execution gadget, reachable only from test tooling — never bundled into the application or exposed at runtime.
- **Remediation:** requires `vitest@5`, a semver-major upgrade that changes the test runner. Deferred by explicit decision for this round; tracked below.
- **Status:** Open — accepted risk (dev-only)

## 4. Security Regression Verification
- [x] Dependency audit passed: `npm audit --omit=dev` → **0** vulnerabilities (was 1 critical / 2 high / 14 moderate).
- [x] Full audit reviewed: 2 critical (dev-only, VULN-004), 9 moderate, 0 high.
- [x] Secret scan: manual pattern scan over the tree and the diff — no credentials, tokens, or private keys found. No `gitleaks`/`trufflehog` binary is installed, so this was a manual scan, not a deterministic one.
- [x] Functional tests passed: feature suite 43/43 (`vitest run test/admin-dashboard-update`), `tsc --noEmit` exit 0 after `npm ci` against the updated lockfile.
- [x] Governance validators passed: `sdrive check` / `sdrive validate` green at the time of the audit.
- **Limitations:** no CVE scanner beyond `npm audit`; no runtime DAST; VULN-004 cannot be cleared without the vitest major.

## 5. Recommendations
- Schedule the `vitest@5` upgrade as its own change; it is the only remaining critical and it is isolated to dev tooling.
- Add `npm audit --omit=dev --audit-level=high` to CI so a production advisory fails the build instead of surfacing at review time.
- Keep the lockfile committed and pinned; the fix landed as a lockfile resolution, so a floating install must not undo it.
- Re-check `@clerk/ui` on each upgrade — its wallet-adapter chain is what pulled the vulnerable `shell-quote` and `image-size` copies into production dependencies.
