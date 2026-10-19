import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const DAY = 24 * 60 * 60 * 1000;

async function setup() {
  const t = createConvexTest();
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const adminId = await seedUser(ctx, {
      name: "Admin",
      tokenIdentifier: adminIdentity.tokenIdentifier,
      email: adminIdentity.email,
      role: "admin",
      createdAt: now - 40 * DAY,
    });
    const newUserId = await seedUser(ctx, {
      name: "New User",
      tokenIdentifier: "token|new",
      email: "new@example.com",
      createdAt: now,
    });
    const oldUserId = await seedUser(ctx, {
      name: "Old User",
      tokenIdentifier: "token|old",
      email: "old@example.com",
      createdAt: now - 40 * DAY,
    });

    const techEventId = await seedEvent(ctx, adminId, {
      title: "Tech Event",
      category: "tech",
      city: "Port Harcourt",
      capacity: 10,
      registrationCount: 5,
    });
    await seedEvent(ctx, adminId, {
      title: "Second Tech",
      category: "tech",
      city: "Lagos",
      capacity: 20,
      registrationCount: 1,
    });
    await seedEvent(ctx, adminId, {
      title: "Music Event",
      category: "music",
      city: "Abuja",
      capacity: 10,
      registrationCount: 0,
      ticketType: "paid",
      ticketPrice: 5000,
    });

    await seedRegistration(ctx, techEventId, newUserId, { registeredAt: now });
    await seedRegistration(ctx, techEventId, oldUserId, { registeredAt: now - 40 * DAY });
    return { adminId, techEventId };
  });
  return { t, ...ids };
}

describe("AC-010: analytics", () => {
  test("AC-010: growth, trend, category, top-event and city analytics are available", async () => {
    const { t } = await setup();

    const userGrowth = await t.withIdentity(adminIdentity).query(api.analytics.getUserGrowth, {
      days: 30,
    });
    expect(userGrowth).toHaveLength(30);
    expect(userGrowth.reduce((sum, point) => sum + point.count, 0)).toBe(1);

    const eventGrowth = await t.withIdentity(adminIdentity).query(api.analytics.getEventGrowth, {
      days: 30,
    });
    expect(eventGrowth.reduce((sum, point) => sum + point.count, 0)).toBe(3);

    const registrationTrend = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getRegistrationTrend, { days: 30 });
    expect(registrationTrend.reduce((sum, point) => sum + point.count, 0)).toBe(1);

    const byCategory = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getEventsByCategory, {});
    expect(byCategory).toEqual([
      { category: "tech", count: 2 },
      { category: "music", count: 1 },
    ]);

    const top = await t.withIdentity(adminIdentity).query(api.analytics.getTopEvents, {
      limit: 1,
    });
    expect(top).toHaveLength(1);
    expect(top[0].title).toBe("Tech Event");

    const byCity = await t.withIdentity(adminIdentity).query(api.analytics.getEventsByCity, {});
    expect(byCity).toHaveLength(3);
  });

  test("AC-010: summary metrics aggregate the selected window", async () => {
    const { t } = await setup();

    const summary = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getSummaryMetrics, {});

    expect(summary).toMatchObject({
      totalUsers: 3,
      totalEvents: 3,
      totalRegistrations: 2,
      upcomingEvents: 3,
      pastEvents: 0,
      newUsers24h: 1,
      newUsers30d: 1,
      regs24h: 1,
      regs30d: 1,
    });
  });
});
