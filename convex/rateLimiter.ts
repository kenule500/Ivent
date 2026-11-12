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

  // Admin console buckets (NFR-003). Keys are the acting user id.
  // Palette search fires per keystroke after debounce; keep it generous but bounded.
  adminSearch: { kind: "token bucket", rate: 30, period: 1 * MINUTE, capacity: 30 },
  // Analytics pages issue several queries per filter change.
  analytics: { kind: "token bucket", rate: 60, period: 1 * MINUTE, capacity: 60 },
  // Exports are expensive and return up to 10,000 rows.
  adminExport: { kind: "token bucket", rate: 5, period: 1 * MINUTE, capacity: 5 },
  // Broadcast sends are batched emails; a super admin should not fire repeatedly.
  broadcast: { kind: "fixed window", rate: 2, period: 60 * MINUTE },
  // Feedback triage mutations.
  feedbackWrite: { kind: "token bucket", rate: 30, period: 1 * MINUTE, capacity: 30 },
  // Public feedback submission from a signed-in user.
  feedbackSubmit: { kind: "fixed window", rate: 5, period: 60 * MINUTE },

  // Event settings, sponsor, and question editors.
  eventSettingsRateLimit: {
    kind: "token bucket",
    rate: 10,
    period: 1 * MINUTE,
    capacity: 10,
  },
  sponsorWriteRateLimit: {
    kind: "token bucket",
    rate: 10,
    period: 1 * MINUTE,
    capacity: 10,
  },
  questionWriteRateLimit: {
    kind: "token bucket",
    rate: 10,
    period: 1 * MINUTE,
    capacity: 10,
  },
  // Door sync batches and wallet issuance are deliberately bounded.
  doorSyncRateLimit: {
    kind: "token bucket",
    rate: 20,
    period: 1 * MINUTE,
    capacity: 20,
  },
  walletIssueRateLimit: {
    kind: "token bucket",
    rate: 5,
    period: 1 * MINUTE,
    capacity: 5,
  },
});