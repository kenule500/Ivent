import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Prevent QR code brute-forcing during event check-in
  checkInRateLimit: {
    kind: "token bucket",
    rate: 10,
    period: 1 * MINUTE,
    capacity: 10,
  },
  // Prevent event creation spam
  createEventRateLimit: {
    kind: "token bucket",
    rate: 3,
    period: 1 * MINUTE,
    capacity: 3,
  },
  generateInviteRateLimit: { kind: "fixed window", rate: 10, period: 60_000 },
});