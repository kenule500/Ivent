import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const DAY = 24 * 60 * 60 * 1000;

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

describe("analytics workspace", () => {
  test("AC-009: dimension filters narrow every query and an unmatched filter returns an empty dataset", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const adminId = await seedAdmin(t, now);

    await t.run(async (ctx) => {
      const user = await seedUser(ctx, {
        name: "Analytics User",
        tokenIdentifier: "token|analytics",
        email: "analytics@example.com",
        createdAt: now - DAY,
      });
      const lagos = await seedEvent(ctx, adminId, {
        title: "Lagos meetup",
        city: "Lagos",
        country: "Nigeria",
        startDate: now - DAY,
        createdAt: now - DAY,
      });
      const abuja = await seedEvent(ctx, adminId, {
        title: "Abuja meetup",
        city: "Abuja",
        country: "Nigeria",
        startDate: now - DAY,
        createdAt: now - DAY,
      });
      await seedRegistration(ctx, lagos, user, { registeredAt: now - DAY });
      await seedRegistration(ctx, abuja, user, { registeredAt: now - DAY });
    });

    const filters = { start: now - 7 * DAY, end: now, cities: ["Lagos"] };
    const lagos = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getSummary, { filters });
    expect(lagos.current).toMatchObject({ events: 1, registrations: 1 });
    expect(lagos.rowCounts).toMatchObject({ events: 1, registrations: 1 });

    const empty = await t.withIdentity(adminIdentity).query(api.analytics.getSummary, {
      filters: { ...filters, cities: ["Nowhere"] },
    });
    expect(empty.current).toMatchObject({ events: 0, registrations: 0, revenue: 0 });
    expect(empty.rowCounts).toMatchObject({ events: 0, registrations: 0 });
  });

  test("AC-011: comparison returns current, previous, absolute and percent deltas with a non-colour direction", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const adminId = await seedAdmin(t, now);

    await t.run(async (ctx) => {
      const currentUser = await seedUser(ctx, {
        name: "Current",
        tokenIdentifier: "token|current",
        email: "current@example.com",
        createdAt: now - DAY,
      });
      const previousUser = await seedUser(ctx, {
        name: "Previous",
        tokenIdentifier: "token|previous",
        email: "previous@example.com",
        // Outside both the current and previous windows; only their registration is in range.
        createdAt: now - 25 * DAY,
      });

      const currentEvent = await seedEvent(ctx, adminId, {
        title: "Current paid",
        startDate: now - DAY,
        createdAt: now - DAY,
        ticketType: "paid",
        ticketPrice: 100,
        registrationCount: 2,
      });
      const previousEvent = await seedEvent(ctx, adminId, {
        title: "Previous paid",
        startDate: now - 15 * DAY,
        createdAt: now - 15 * DAY,
        ticketType: "paid",
        ticketPrice: 50,
        registrationCount: 1,
      });

      await seedRegistration(ctx, currentEvent, currentUser, {
        registeredAt: now - 2 * DAY,
        status: "confirmed",
      });
      await seedRegistration(ctx, currentEvent, currentUser, {
        registeredAt: now - 2 * DAY,
        status: "cancelled",
        attendeeEmail: "cancelled@example.com",
      });
      await seedRegistration(ctx, previousEvent, previousUser, {
        registeredAt: now - 15 * DAY,
        status: "confirmed",
        checkedIn: true,
        checkedInAt: now - 15 * DAY,
      });
    });

    const summary = await t.withIdentity(adminIdentity).query(api.analytics.getSummary, {
      filters: { start: now - 10 * DAY, end: now },
    });

    expect(summary.current).toMatchObject({
      users: 1,
      events: 1,
      registrations: 2,
      confirmed: 1,
      revenue: 100,
    });
    expect(summary.previous).toMatchObject({
      users: 0,
      events: 1,
      registrations: 1,
      confirmed: 1,
      revenue: 50,
    });

    expect(summary.deltas.revenue).toMatchObject({
      absolute: 50,
      percent: 100,
      direction: "up",
    });
    expect(summary.deltas.registrations).toMatchObject({
      absolute: 1,
      percent: 100,
      direction: "up",
    });
    expect(summary.deltas.events).toMatchObject({
      absolute: 0,
      percent: 0,
      direction: "flat",
    });
    // No baseline is "new", never Infinity or NaN.
    expect(summary.deltas.users).toMatchObject({
      absolute: 1,
      percent: null,
      direction: "up",
    });
  });

  test("AC-012: comparison off returns no previous series, comparison on returns the ghost series", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const adminId = await seedAdmin(t, now);

    await t.run(async (ctx) => {
      const user = await seedUser(ctx, {
        name: "Series User",
        tokenIdentifier: "token|series",
        email: "series@example.com",
        createdAt: now - DAY,
      });
      const event = await seedEvent(ctx, adminId, {
        startDate: now - DAY,
        createdAt: now - DAY,
      });
      await seedRegistration(ctx, event, user, { registeredAt: now - 2 * DAY });
    });

    const filters = { start: now - 7 * DAY, end: now };

    const withoutComparison = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getTimeSeries, { filters });
    expect(withoutComparison.previous).toBeNull();

    const withComparison = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getTimeSeries, { filters, compare: true });
    expect(Array.isArray(withComparison.previous)).toBe(true);
    expect(withComparison.previous).not.toBeNull();
    expect(withComparison.previous?.length).toBe(withComparison.buckets.length);
  });

  test("AC-013: funnel, check-in trend, capacity, revenue split and heatmap share the filtered dataset", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const adminId = await seedAdmin(t, now);

    await t.run(async (ctx) => {
      const event = await seedEvent(ctx, adminId, {
        title: "Funnel Event",
        category: "tech",
        city: "Lagos",
        country: "Nigeria",
        startDate: now - DAY,
        createdAt: now - DAY,
        capacity: 10,
        registrationCount: 8,
        ticketType: "paid",
        ticketPrice: 50,
      });

      for (let index = 0; index < 3; index += 1) {
        const attendee = await seedUser(ctx, {
          name: `Checked ${index}`,
          tokenIdentifier: `token|checked-${index}`,
          email: `checked${index}@example.com`,
        });
        await seedRegistration(ctx, event, attendee, {
          registeredAt: now - 2 * DAY,
          checkedIn: true,
          checkedInAt: now - 2 * DAY,
        });
      }
      const confirmed = await seedUser(ctx, {
        name: "Confirmed",
        tokenIdentifier: "token|confirmed",
        email: "confirmed@example.com",
      });
      await seedRegistration(ctx, event, confirmed, { registeredAt: now - 2 * DAY });
      const cancelled = await seedUser(ctx, {
        name: "Cancelled",
        tokenIdentifier: "token|cancelled",
        email: "cancelled@example.com",
      });
      await seedRegistration(ctx, event, cancelled, {
        registeredAt: now - 2 * DAY,
        status: "cancelled",
      });
    });

    const filters = { start: now - 7 * DAY, end: now };

    const funnel = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getFunnel, { filters });
    expect(funnel.steps.map((step) => [step.key, step.value])).toEqual([
      ["registered", 5],
      ["confirmed", 4],
      ["checked_in", 3],
    ]);
    expect(funnel.steps[1].conversionFromPrevious).toBeCloseTo(0.8);
    expect(funnel.steps[2].conversionFromPrevious).toBeCloseTo(0.75);
    expect(funnel.steps[2].conversionFromStart).toBeCloseTo(0.6);
    expect(funnel.trend.reduce((sum, point) => sum + point.checkedIn, 0)).toBe(3);
    expect(funnel.trend.reduce((sum, point) => sum + point.confirmed, 0)).toBe(4);
    expect(funnel.capacity.eventsWithCapacity).toBe(1);
    expect(funnel.capacity.buckets).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "76–99%", count: 1 })])
    );

    const series = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getTimeSeries, { filters });
    expect(series.buckets.length).toBeGreaterThan(0);
    expect(series.buckets.reduce((sum, bucket) => sum + bucket.revenue, 0)).toBe(200);
    expect(series.buckets.reduce((sum, bucket) => sum + bucket.paidRevenue, 0)).toBe(200);
    expect(series.buckets.reduce((sum, bucket) => sum + bucket.freeRevenue, 0)).toBe(0);

    const heatmap = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getHeatmap, { filters });
    expect(heatmap.weekdays).toHaveLength(7);
    expect(heatmap.hours).toHaveLength(24);
    expect(heatmap.matrix).toHaveLength(7);
    expect(heatmap.matrix.every((row) => row.length === 24)).toBe(true);
    expect(heatmap.total).toBe(5);
    expect(heatmap.matrix.flat().reduce((sum, value) => sum + value, 0)).toBe(5);

    const breakdown = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getBreakdown, { filters, dimension: "category" });
    expect(breakdown.rows[0]).toMatchObject({ key: "tech", value: 5 });
  });

  test("AC-014: cohorts separate new and returning attendees and state the minimum for insufficient data", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const adminId = await seedAdmin(t, now);

    await t.run(async (ctx) => {
      const one = await seedUser(ctx, {
        name: "One",
        tokenIdentifier: "token|one",
        email: "one@example.com",
      });
      const two = await seedUser(ctx, {
        name: "Two",
        tokenIdentifier: "token|two",
        email: "two@example.com",
      });
      const three = await seedUser(ctx, {
        name: "Three",
        tokenIdentifier: "token|three",
        email: "three@example.com",
      });

      const oldEvent = await seedEvent(ctx, adminId, {
        title: "Old event",
        startDate: now - 80 * DAY,
        createdAt: now - 80 * DAY,
      });
      const firstEvent = await seedEvent(ctx, adminId, {
        title: "First cohort event",
        startDate: now - 60 * DAY,
        createdAt: now - 60 * DAY,
      });
      const secondEvent = await seedEvent(ctx, adminId, {
        title: "Second cohort event",
        startDate: now - 20 * DAY,
        createdAt: now - 20 * DAY,
      });

      // This is One's first-ever registration, outside the filtered window.
      await seedRegistration(ctx, oldEvent, one, { registeredAt: now - 72 * DAY });
      await seedRegistration(ctx, firstEvent, one, { registeredAt: now - 55 * DAY });
      await seedRegistration(ctx, firstEvent, two, { registeredAt: now - 50 * DAY });
      await seedRegistration(ctx, firstEvent, three, { registeredAt: now - 45 * DAY });
      await seedRegistration(ctx, secondEvent, one, { registeredAt: now - 18 * DAY });
      await seedRegistration(ctx, secondEvent, two, { registeredAt: now - 16 * DAY });
      await seedRegistration(ctx, secondEvent, three, { registeredAt: now - 14 * DAY });
    });

    const cohorts = await t
      .withIdentity(adminIdentity)
      .query(api.analytics.getCohorts, {
        filters: { start: now - 70 * DAY, end: now },
      });

    expect(cohorts.insufficient).toBe(false);
    expect(cohorts.definition).toMatch(/returning attendees had a first registration before/i);
    expect(cohorts.cohorts.length).toBeGreaterThanOrEqual(2);
    const total = cohorts.cohorts.reduce((sum, cohort) => sum + cohort.total, 0);
    expect(total).toBe(6);
    expect(cohorts.cohorts.some((cohort) => cohort.returningCount > 0)).toBe(true);
    expect(cohorts.cohorts.some((cohort) => cohort.newCount > 0)).toBe(true);

    const sparse = createConvexTest();
    const sparseAdmin = await seedAdmin(sparse, now);
    await sparse.run(async (ctx) => {
      const user = await seedUser(ctx, {
        name: "Sparse",
        tokenIdentifier: "token|sparse",
        email: "sparse@example.com",
      });
      const event = await seedEvent(ctx, sparseAdmin, {
        startDate: now - DAY,
        createdAt: now - DAY,
      });
      await seedRegistration(ctx, event, user, { registeredAt: now - DAY });
    });
    const insufficient = await sparse
      .withIdentity(adminIdentity)
      .query(api.analytics.getCohorts, {
        filters: { start: now - 7 * DAY, end: now },
      });
    expect(insufficient.insufficient).toBe(true);
    expect(insufficient.minimumRequirement).toMatch(/at least 5 registrations across 2 or more months/i);
  });
});
