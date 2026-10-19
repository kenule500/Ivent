# Test Report: Event Management and Check-in (v1)

## 1. Summary
- **Date:** 2026-10-19
- **Feature:** event-management-and-check-in
- **Version:** v1
- **Total ACs:** 9
- **Tested ACs:** 9
- **Coverage:** 100%
- **Tests Passed:** 26/27

## 2. AC → Test Mapping
| AC ID | Test ID | File | Status |
|-------|---------|------|--------|
| AC-001 | TEST-001 | test/event-management-and-check-in/create-event-form.test.tsx | ✅ Pass |
| AC-002 | TEST-002 | test/event-management-and-check-in/create-event.test.ts | ✅ Pass |
| AC-003 | TEST-003 | test/event-management-and-check-in/create-event.test.ts | ✅ Pass |
| AC-004 | TEST-004 | test/event-management-and-check-in/cover-image.test.ts | ✅ Pass |
| AC-005 | TEST-005 | test/event-management-and-check-in/my-events.test.ts | ✅ Pass |
| AC-006 | TEST-006 | test/event-management-and-check-in/event-dashboard-backend.test.ts | ✅ Pass |
| AC-007 | TEST-007 | test/event-management-and-check-in/check-in.test.ts | ❌ Fail |
| AC-008 | TEST-008 | test/event-management-and-check-in/event-dashboard.test.tsx | ✅ Pass |
| AC-009 | TEST-009 | test/event-management-and-check-in/event-dashboard.test.tsx | ✅ Pass |

## 3. Failures
| Test | Reason | Blocking |
|------|--------|----------|
| TEST-007 | Rejected mutations roll back the rate-limiter's token write, so failed QR guesses never consume the 10-per-minute budget. Ten invalid scans followed by an eleventh still return "Invalid or cancelled QR code" instead of a rate-limit error, which defeats the brute-force protection the limit exists for. Successful and already-checked-in calls do consume tokens and are limited. | Yes |

## 4. Notes
- `create-event-form.test.tsx` confirms title, description, category, date, capacity and venue-URL validation. Two gaps in the UI were observed: the city field is enforced by the Zod schema but renders no inline error, and the start/end **time** messages are masked because the page renders `errors.startDate?.message || errors.startTime?.message` (the date error always wins while the date is empty).
- The end-after-start rule lives in `onSubmit`, not in the exported schema, so it was not exercised through the UI; `lib/utils.combineDateTime` is covered indirectly by the form test.
- CSV export is asserted by reading the generated `Blob` rather than downloading a file.
- AC-003's upgrade dialog is verified at the Convex boundary (free limit, theme colour, Pro bypass) plus the form's theme-colour prompt; the second-event submit dialog itself needs a calendar interaction and was not driven end-to-end.
