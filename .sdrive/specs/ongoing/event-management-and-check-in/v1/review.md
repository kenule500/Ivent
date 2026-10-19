# Review Report: Event Management and Check-in (v1)

## 1. Audit Summary
- **Status:** FAIL
- **Date:** 2026-10-19
- **Reviewer:** AI Review Agent
- **Version:** v1

## 2. Criteria Check
- [ ] Spec Convergence: FAIL — AC-007's rate limit does not count failed check-in attempts, so QR brute-forcing is unlimited.
- [ ] Task Completion: FAIL — all pre-existing tasks are complete, but the new fix task T5.1 is open.
- [ ] Traceability: FAIL — AC-007 sits only in rows whose status is `in_progress`.
- [ ] Coverage: 89% (8/9 ACs complete; 9/9 have linked tests, 26/27 tests passing)
- [x] Test Report: PASS — `test-report-event-management-and-check-in-v1-2026-10-19.md` exists and is newer than `spec.md` and `plan.md`.
- [x] Code Quality: PASS — `npm run lint` exits 0 with 0 errors (24 warnings); `npx tsc --noEmit` exits 0. No formatter is configured.
- [ ] Security: FAIL — `npm audit` reports 5 critical and 29 high advisories, including 3 critical production advisories (`next`, `proxy-addr`, `shell-quote`). Secret pattern scan found nothing.
- [ ] Testing: FAIL — 1 of 27 tests fails (AC-007).
- [ ] Documentation: FAIL — `README.md` is still the create-next-app template.
- [ ] Definition of Done: FAIL — CON-602 requires `sdrive verify` to return `pass` or `warn`; it returns `fail`. AC-007 also remains unmet.
- [ ] Spec-to-Code Verification: FAIL — `sdrive verify` reports 14 matched, 15 missing, 4 renamed. The misses are Convex modules and schema fields outside the verifier's roots; the configured gate still fails.
- [x] Permission: PASS — `kenule500` is `admin` in `team.json`.

## 3. Issues Found (If any)
| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| High | Failed QR scans roll back their rate-limit token, so an attacker can guess codes without ever reaching the 10-per-minute limit. | convex/helpers.ts:90, convex/registrations.ts:140 | Yes |
| High | Critical/high dependency advisories, including 3 critical production packages. | package-lock.json | Yes |
| Med | Spec-to-code verifier does not scan `convex/`, so verification fails for this feature. | .sdrive/scripts/verify.js:55 | Yes (tracked as T6.1 in admin-console-and-governance) |
| Low | README remains the framework template. | README.md | No (non-blocking) |

## 4. Recommendations
- Fix T5.1 (consume the rate-limit token outside the rolled-back transaction, or use a reservation that survives a rejected handler), clear the shared dependency/verifier tasks, then re-run `/sdrive:test event-management-and-check-in` and this review.
- Add a regression test that ten invalid scans are followed by a rate-limit error.
