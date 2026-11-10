# Security Audit: Accessibility and Performance Hardening (v1)

## 1. Executive Summary

- **Date:** 2026-11-10
- **Scope:** the accessibility and performance hardening change set on `feature/backlog-wave-1`
- **Overall risk:** **Low for production** — the production dependency tree is clean.
- **Production:** 0 vulnerabilities (`npm audit --omit=dev`).
- **Development tree:** 2 critical and 9 high, all dev-only. One element of this is new and
  was introduced by this feature (see Finding S-1).

## 2. Threat Model Summary

- **Key assets:** attendee identity and tickets, registration data, admin audit trail.
- **Trust boundaries:** browser ↔ Next.js server; browser ↔ Convex functions
  (`requireAdmin`/`requireSuperAdmin`); the public event page is unauthenticated.
- **This feature's surface:** presentation, focus management, and client bundle only. It
  adds no endpoint, no mutation, no storage, and no new trust boundary. The one new public
  surface is the client-side announcement channel (`aria-live`), which carries text only.

## 3. Baseline (CON-51x)

| Control | Status | Evidence |
|---|---|---|
| CON-511 Authentication | NOT APPLICABLE | Clerk flows untouched by this change. |
| CON-512 Authorization | NOT APPLICABLE | No new Convex function or guard. |
| CON-513 Security headers | NOT APPLICABLE | No middleware or `next.config` header change. |
| CON-514 Rate limiting | NOT APPLICABLE | No new submission surface. |
| CON-515 Input validation | PASS | Existing Zod + Convex validators unchanged; this feature only connects messages to inputs. |
| CON-516 Injection | NOT APPLICABLE | No query construction change. |
| CON-517 XSS | PASS | `dangerouslySetInnerHTML`, `innerHTML`, and `eval` do not appear anywhere in the new `components/a11y`, `lib/a11y`, or the changed pages. Announced text is rendered as text. |
| CON-518 CSRF | NOT APPLICABLE | No new state-changing HTTP form post. |
| CON-519 Secrets | PASS | `.env*` remains git-ignored; no secret is read, printed, or committed. |

## 4. Findings

### S-1 — Lighthouse tooling adds 8 high dev advisories (Low risk, dev-only)

- **Severity:** Low (development only; not shipped, not reachable at runtime)
- **Location:** `package.json` devDependency `@lhci/cli@0.16`
- **Detail:** the Lighthouse/puppeteer chain pulls `puppeteer-core`, `basic-ftp`
  (quadratic-time DoS in `Client.list()`), `get-uri`, `proxy-agent`, `pac-proxy-agent`,
  `@puppeteer/browsers` and `lighthouse` itself — 8 high advisories, none present in the
  production tree.
- **Impact:** a developer running the audit locally, against untrusted URLs, could be
  affected. It cannot affect the deployed application.
- **Recommendation:** run Lighthouse on demand (`npx @lhci/cli`) or inside CI instead of
  keeping it as a committed devDependency, so the tooling stays out of the lockfile's dev
  tree. Accept the risk if the convenience is worth it — this is a tooling decision.
- **Status:** Open — accepted for this feature, recorded for the dependency owner.

### Pre-existing, unchanged

- `vitest` / `tinypool` criticals (dev-only, fix requires vitest 5) — carried from the
  previous feature, unchanged here.
- Full tree: 2 critical, 9 high, 8 moderate, all dev-only.

## 5. Verification Performed

- [x] `npm audit --omit=dev` → **0** vulnerabilities.
- [x] `npm audit` reviewed for the full tree; every critical and high is dev-only.
- [x] Secret scan over the feature diff (`BEGIN PRIVATE KEY`, `sk-…`, `AKIA…`, inline
      passwords) → **0** hits.
- [x] New code inspected for `dangerouslySetInnerHTML`, `innerHTML`, `eval` → **0** uses.
- [x] No new dependency is imported at runtime by application code; `axe-core`,
      `vitest-axe`, and `@lhci/cli` are devDependencies only.
- **Limitations:** no `gitleaks`/`trufflehog` binary is installed, so the secret scan is a
      pattern scan rather than a deterministic one. No DAST was run — there is no
      reachable deployment in this environment.

## 6. Conclusion

No production security regression. The feature touches presentation and client weight, and
its one dependency addition is a dev tool that brings advisory noise rather than runtime
exposure. The remaining blocker on this feature is **performance (NFR-002)**, not security.
