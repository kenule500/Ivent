import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

describe("reports hub", () => {
  test("AC-019: an event report shows attendance buckets, check-in trend, capacity, revenue and an as-of timestamp", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const adminId = await seedAdmin(t, now);

    const eventId = await t.run(async (ctx) => {
      const event = await seedEvent(ctx, adminId, {
        title: "Paid summit",
        startDate: now - 2 * DAY,
        endDate: now - DAY,
        capacity: 100,
        ticketType: "paid",
        ticketPrice: 25,
        registrationCount: 6,
      });

      for (let index = 0; index < 3; index += 1) {
        const attendee = await seedUser(ctx, {
          name: `Checked ${index}`,
          tokenIdentifier: `token|checked-${index}`,
          email: `checked${index}@example.com`,
        });
        await seedRegistration(ctx, event, attendee, {
          registeredAt: now - 3 * DAY,
          checkedIn: true,
          checkedInAt: now - DAY,
        });
      }
      for (let index = 0; index < 2; index += 1) {
        const attendee = await seedUser(ctx, {
          name: `No show ${index}`,
          tokenIdentifier: `token|no-show-${index}`,
          email: `noshow${index}@example.com`,
        });
        await seedRegistration(ctx, event, attendee, {
          registeredAt: now - 3 * DAY,
        });
      }
      const cancelled = await seedUser(ctx, {
        name: "Cancelled",
        tokenIdentifier: "token|cancelled",
        email: "cancelled@example.com",
      });
      await seedRegistration(ctx, event, cancelled, {
        registeredAt: now - 3 * DAY,
        status: "cancelled",
      });
      return event;
    });

    const report = await t
      .withIdentity(adminIdentity)
      .query(api.reports.getEventReport, { eventId });

    expect(report.asOf).toBeGreaterThan(0);
    expect(report.timezone).toBe("UTC");
    expect(report.event).toMatchObject({
      id: eventId,
      title: "Paid summit",
      organizer: "Admin",
      ticketType: "paid",
      ticketPrice: 25,
    });
    expect(report.attendance).toMatchObject({
      registered: 6,
      confirmed: 5,
      checkedIn: 3,
      noShow: 2,
      cancelled: 1,
    });
    expect(report.attendance.checkInRate).toBeCloseTo(0.6);
    expect(report.attendance.capacityUtilisation).toBeCloseTo(0.05);
    expect(report.revenue).toBe(125);
    expect(report.trend.reduce((sum, point) => sum + point.checkedIn, 0)).toBe(3);
    expect(report.registrationScanLimit).toBe(10_000);

    const list = await t
      .withIdentity(adminIdentity)
      .query(api.reports.listEvents, { page: 1, pageSize: 20 });
    expect(list.total).toBe(1);
    expect(list.rows[0]).toMatchObject({
      id: eventId,
      title: "Paid summit",
      organizer: "Admin",
      registrationCount: 6,
      capacity: 100,
    });

    const search = await t
      .withIdentity(adminIdentity)
      .query(api.reports.listEvents, { search: "paid" });
    expect(search.total).toBe(1);
    const noSearch = await t
      .withIdentity(adminIdentity)
      .query(api.reports.listEvents, { search: "unmatched" });
    expect(noSearch).toMatchObject({ total: 0, rows: [], hasMore: false });
  });

  test("AC-020: a report exports as CSV with zeros for an empty event and the print stylesheet hides admin chrome", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const adminId = await seedAdmin(t, now);

    const eventId = await t.run(async (ctx) =>
      seedEvent(ctx, adminId, {
        title: "Quiet launch",
        startDate: now + DAY,
        endDate: now + 2 * DAY,
        capacity: 50,
        ticketType: "paid",
        ticketPrice: 10,
        registrationCount: 0,
      })
    );

    const report = await t
      .withIdentity(adminIdentity)
      .query(api.reports.getEventReport, { eventId });
    expect(report.attendance).toMatchObject({
      registered: 0,
      confirmed: 0,
      checkedIn: 0,
      noShow: 0,
      cancelled: 0,
      checkInRate: 0,
    });
    expect(report.attendance.capacityUtilisation).toBe(0);
    expect(report.revenue).toBe(0);
    expect(report.trend.every((point) => point.checkedIn === 0)).toBe(true);

    const exported = await t
      .withIdentity(adminIdentity)
      .mutation(api.exports.generate, { module: "report", eventId });
    expect(exported.ok).toBe(true);
    if (!exported.ok) throw new Error(exported.message);
    expect(exported.filename).toMatch(/^report-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(exported.csv).toContain('"Metric","Value"');
    expect(exported.csv).toContain('"Registered","0"');
    expect(exported.csv).toContain('"Capacity","50"');
    expect(exported.csv).toContain('"Check-in rate","0%"');
    expect(exported.csv).toContain('"Estimated revenue","0"');
    expect(exported.csv).toContain('"Event","Quiet launch"');

    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain("@media print");
    expect(css).toContain("body:has(.report-page) aside");
    expect(css).toContain("body:has(.report-page) header");
    expect(css).toContain("display: none !important");
  });
});
