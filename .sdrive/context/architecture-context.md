# Architecture Context

<!-- Generated during brownfield onboarding on 2026-10-18 from repository facts. -->

## Observed Project Facts

- **Framework:** Next.js App Router (`app/`). Route groups separate surfaces:
  - `app/(auth)/` — Clerk sign-in and sign-up catch-all routes.
  - `app/(main)/` — authenticated organizer/attendee pages:
    `create-event`, `my-events`, `my-events/[eventId]`, `my-tickets`.
  - `app/(public)/` — `explore`, `explore/[slug]`, `events/[slug]`.
  - `app/admin/` — administration: `dashboard`, `analytics`, `audit`, `events`,
    `invites`, `registrations`, `settings`, `users`, `signup`.
  - `app/api/generate-event/route.ts` — the only Next.js route handler; calls
    the Cerebras SDK server-side.
- **Backend:** Convex. `convex/schema.ts` defines `users`, `events`,
  `registrations`, `adminInvites`, and `auditLogs` with indexes and a title
  search index. Domain functions live in `convex/*.ts`.
- **Auth:** Clerk provides identity. `convex/auth.config.ts` validates the Clerk
  JWT (`CLERK_JWT_ISSUER_DOMAIN`, applicationID `convex`). `app/layout.tsx`
  wraps the tree in `ClerkProvider` → `ConvexProviderWithClerk`.
- **Server-side authorization pattern:** `convex/helpers.ts` exposes
  `secureQuery`, `secureMutation`, `requireAdmin`, and `getAuthenticatedUser`.
  `secureMutation` optionally applies the `@convex-dev/rate-limiter` token
  buckets defined in `convex/rateLimiter.ts`.
- **Image storage:** Convex file storage via `events.generateUploadUrl`; the
  `resolveImageUrl` helper accepts HTTPS, data URLs, or Convex storage IDs.
- **Scheduled work:** `convex/crons.ts` marks expired admin invites daily.
- **Client data layer:** thin hooks in `hooks/useConvexQuery.ts` wrap
  `useQuery`/`useMutation`; `hooks/useStoreUser.ts` syncs the Clerk user into
  Convex; `hooks/use-onboarding.tsx` decides when attendee onboarding shows.

## Standard Best Practices (from MCP/skills)

- No external research was performed. Rules below come from the repository.
- Convex functions are the API boundary; there is no separate REST server.

## Assumptions

- Convex deployment configuration (environment variables, dev/prod instances)
  lives outside the repository and is managed in the Convex dashboard.
- No Edge runtime, middleware, or proxy authentication is currently implemented;
  `proxy.ts` is present at the root but is not part of the request pipeline.
