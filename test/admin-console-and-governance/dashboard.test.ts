import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");

async function setup() {
  const t = createConvexTest();
  const ids = await t.run(async (ctx) => {
    const adminId = await seedUser(ctx, {
      name: "Admin",
      tokenIdentifier: adminIdentity.tokenIdentifier,
      email: adminIdentity.email,
      role: "admin",
    });
    const now = Date.now();
    const upcomingId = await seedEvent(ctx, adminId, {
      title: "Upcoming",
      startDate: now + 86_400_000,
      endDate: now + 90_000_000,
    });
    await seedEvent(ctx, adminId, {
      title: "Past",
      startDate: now - 90_000_000,
      endDate: now - 86_400_000,
    });
    await seedRegistration(ctx, upcomingId, adminId);
    return { adminId, upcomingId };
  });
  return { t, ...ids };
}

describe("AC-002: platform totals", () => {
  test("AC-002: dashboard stats count users, events, registrations and upcoming events", async () => {
    const { t } = await setup();

    const stats = await t.withIdentity(adminIdentity).query(api.admin.getDashboardStats, {});

    expect(stats).toMatchObject({
      totalUsers: 1,
      totalEvents: 2,
      totalRegistrations: 1,
      upcomingEvents: 1,
    });
  });
});
