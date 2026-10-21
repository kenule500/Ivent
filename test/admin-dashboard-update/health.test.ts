import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import {
  seedCronRun,
  seedEmailEvent,
  seedFeedback,
  seedUser,
} from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const DAY = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.unstubAllEnvs();
});

async function seedAdmin(t: ReturnType<typeof createConvexTest>, now: number) {
  return t.run(async (ctx) =>
    seedUser(ctx, {
      name: "Admin",
      tokenIdentifier: adminIdentity.tokenIdentifier,
      email: adminIdentity.email,
      role: "admin",
      createdAt: now - 120 * DAY,
    })
  );
}

describe("system health", () => {
  test("AC-030: four independent sections state their windows and counts, with empty values where there is no signal", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const adminId = await seedAdmin(t, now);

    await t.run(async (ctx) => {
      await seedCronRun(ctx, {
        name: "daily-digest",
        lastRunAt: now - 60 * 60 * 1000,
        status: "success",
        processed: 42,
      });
      await seedCronRun(ctx, {
        name: "weekly-cleanup",
        lastRunAt: now - 2 * DAY,
        status: "failed",
        processed: 0,
        error: "Timed out",
      });

      await seedEmailEvent(ctx, {
        template: "invite",
        recipient: "recent-failure@example.com",
        status: "failed",
        error: "Hard bounce",
        createdAt: now - 60 * 60 * 1000,
      });
      await seedEmailEvent(ctx, {
        template: "announcement",
        recipient: "week-failure@example.com",
        status: "failed",
        error: "Mailbox full",
        createdAt: now - 3 * DAY,
      });
      await seedEmailEvent(ctx, {
        template: "invite",
        recipient: "old-failure@example.com",
        status: "failed",
        error: "Expired",
        createdAt: now - 8 * DAY,
      });
      await seedEmailEvent(ctx, {
        template: "invite",
        recipient: "sent@example.com",
        status: "sent",
        createdAt: now - 2 * 60 * 60 * 1000,
      });

      await seedFeedback(ctx, adminId, {
        message: "Old open item",
        status: "open",
        createdAt: now - 5 * DAY,
      });
      await seedFeedback(ctx, adminId, {
        message: "New open item",
        status: "open",
        createdAt: now - DAY,
      });
      await seedFeedback(ctx, adminId, {
        message: "Closed item",
        status: "resolved",
        createdAt: now - 6 * DAY,
      });

      for (let index = 0; index < 2; index += 1) {
        await ctx.db.insert("rateLimitRejections", {
          bucket: "adminSearch",
          createdAt: now - 60 * 60 * 1000,
        });
      }
      await ctx.db.insert("rateLimitRejections", {
        bucket: "adminExport",
        createdAt: now - 2 * 60 * 60 * 1000,
      });
      await ctx.db.insert("rateLimitRejections", {
        bucket: "adminExport",
        createdAt: now - 2 * DAY,
      });
    });

    await expect(t.query(api.health.getOverview, {})).rejects.toThrow("Unauthenticated");

    const health = await t
      .withIdentity(adminIdentity)
      .query(api.health.getOverview, {});
    expect(health.asOf).toBeGreaterThan(0);
    expect(health.timezone).toBe("UTC");
    expect(health.windows).toEqual({
      emails: "24 hours and 7 days",
      feedback: "all open items",
      rateLimits: "24 hours",
      cron: "daily schedule",
    });

    expect(health.cron.staleAfterHours).toBe(36);
    expect(health.cron.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "daily-digest",
          status: "success",
          processed: 42,
          stale: false,
        }),
        expect.objectContaining({
          name: "weekly-cleanup",
          status: "failed",
          error: "Timed out",
          stale: true,
        }),
      ])
    );

    expect(health.email).toMatchObject({
      failed24h: 1,
      failed7d: 2,
      sent24h: 1,
      lastFailureAt: now - 60 * 60 * 1000,
    });
    expect(health.email.recentFailures).toEqual([
      expect.objectContaining({
        template: "invite",
        recipient: "recent-failure@example.com",
        error: "Hard bounce",
      }),
    ]);

    expect(health.feedback).toMatchObject({
      open: 2,
      oldestOpenAt: now - 5 * DAY,
    });
    expect(health.feedback.oldestOpenId).toBeTruthy();

    expect(health.rateLimits.rejected24h).toBe(3);
    expect(health.rateLimits.buckets).toEqual([
      { bucket: "adminSearch", count: 2 },
      { bucket: "adminExport", count: 1 },
    ]);
  });

  test("AC-031: configuration reports presence only and never returns a secret value", async () => {
    const t = createConvexTest();
    const now = Date.now();
    await seedAdmin(t, now);

    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    vi.stubEnv("SITE_URL", "");

    const absent = await t
      .withIdentity(adminIdentity)
      .query(api.health.getOverview, {});
    expect(absent.config).toEqual({
      resendApiKeyPresent: false,
      resendFromAddressPresent: false,
      siteUrlPresent: false,
    });
    expect(absent.broadcastSendingEnabled).toBe(false);

    vi.stubEnv("RESEND_API_KEY", "re_live_secret_value");
    vi.stubEnv("RESEND_FROM_EMAIL", "sender@example.com");
    vi.stubEnv("SITE_URL", "https://ivent.example.com");

    const present = await t
      .withIdentity(adminIdentity)
      .query(api.health.getOverview, {});
    expect(present.config).toEqual({
      resendApiKeyPresent: true,
      resendFromAddressPresent: true,
      siteUrlPresent: true,
    });

    const serialized = JSON.stringify(present);
    expect(serialized).not.toContain("re_live_secret_value");
    expect(serialized).not.toContain("sender@example.com");
    expect(serialized).not.toContain("https://ivent.example.com");
    expect(serialized).toContain("resendApiKeyPresent");
  });
});
