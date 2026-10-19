import { convexTest, type TestConvex } from "convex-test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import schema from "../../convex/schema";

// `_generated` must be part of the glob: convex-test derives the modules root
// from it, then resolves function paths such as `events:createEvent` against
// the same map.
const modules = import.meta.glob("../../convex/**/*.*s");

export type TestDb = TestConvex<typeof schema>;

/**
 * Build an in-memory Convex backend with the rate-limiter component registered,
 * so rate-limited mutations behave the same way they do in production.
 */
export function createConvexTest(): TestDb {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

/**
 * Identity shape read by Convex's `ctx.auth.getUserIdentity()`. `storeUser`
 * is not invoked automatically in tests, so an explicit users row is inserted
 * wherever a function resolves the caller through `tokenIdentifier`.
 */
export function identityFor(tokenIdentifier: string, name = "Test User", email = "test@example.com") {
  return {
    tokenIdentifier,
    name,
    email,
    pictureUrl: "https://example.com/avatar.png",
  };
}
