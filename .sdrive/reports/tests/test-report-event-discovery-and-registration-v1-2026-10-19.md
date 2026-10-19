# Test Report: Event Discovery and Registration (v1)

## 1. Summary
- **Date:** 2026-10-19
- **Feature:** event-discovery-and-registration
- **Version:** v1
- **Total ACs:** 13
- **Tested ACs:** 13
- **Coverage:** 100%
- **Tests Passed:** 26/28

## 2. AC → Test Mapping
| AC ID | Test ID | File | Status |
|-------|---------|------|--------|
| AC-001 | TEST-001 | test/event-discovery-and-registration/explore.test.tsx | ✅ Pass |
| AC-002 | TEST-002 | test/event-discovery-and-registration/explore.test.tsx | ❌ Fail |
| AC-003 | TEST-003 | test/event-discovery-and-registration/explore-slug.test.tsx | ✅ Pass |
| AC-004 | TEST-004 | test/event-discovery-and-registration/explore-slug.test.tsx | ✅ Pass |
| AC-005 | TEST-005 | test/event-discovery-and-registration/event-detail.test.tsx | ✅ Pass |
| AC-006 | TEST-006 | test/event-discovery-and-registration/event-detail.test.tsx | ❌ Fail |
| AC-007 | TEST-007 | test/event-discovery-and-registration/event-detail.test.tsx | ✅ Pass |
| AC-008 | TEST-008 | test/event-discovery-and-registration/registration.test.ts | ✅ Pass |
| AC-009 | TEST-009 | test/event-discovery-and-registration/registration.test.ts | ✅ Pass |
| AC-010 | TEST-010 | test/event-discovery-and-registration/my-tickets.test.tsx | ✅ Pass |
| AC-011 | TEST-011 | test/event-discovery-and-registration/registration.test.ts | ✅ Pass |
| AC-012 | TEST-012 | test/event-discovery-and-registration/onboarding.test.ts | ✅ Pass |
| AC-013 | TEST-013 | test/event-discovery-and-registration/search.test.ts | ✅ Pass |

## 3. Failures
| Test | Reason | Blocking |
|------|--------|----------|
| TEST-002 | When all lists are empty, the featured carousel renders nothing and the "Events Near You" section is not rendered at all. Only the popular section and the page-wide empty card have an empty state, so AC-002's "each section shows its own empty state" is not met. | Yes |
| TEST-006 | The event page computes `isOrganizer` by comparing the Clerk user id (`user_...`) with the Convex `organizerId` (`jd7...`). Those identifiers are from different systems, so an organizer sees "Register for Event" instead of "Manage Event". | Yes |

## 4. Notes
- Framework: Vitest 3.2.7 + React Testing Library + jsdom for pages, convex-test 0.0.62 for Convex functions.
- `explore.test.tsx` mocks Embla and the carousel primitives because jsdom has no layout engine; section composition, query arguments and loading/empty branches are still exercised.
- All Convex tests run against the real schema and the registered rate-limiter component.
- Not covered: visual carousel behaviour and a real browser E2E path for registration.
