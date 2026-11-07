import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { computeDelta } from "../../lib/format";
import { createConvexTest, identityFor } from "../helpers/convex";
import {
  seedAuditLog,
  seedEvent,
  seedFeedback,
  seedInvite,
  seedRegistration,
  seedUser,
} from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const DAY = 24 * 60 * 60 * 1000;

async function seedAdmin(t: ReturnType<typeof createConvexTest>, now = Date.now()) {
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

describe("command center", () => {
  test("AC-005: trends return both windows and a sparkline, and a zero baseline renders new or no change", async () => {
    const t = createConvexTest();
    const now = Date.now();
    await seedAdmin(t, now);

    await t.run(async (ctx) => {
      const currentUser = await seedUser(ctx, {
        name: "Current User",
        tokenIdentifier: "token|current",
        email: "current@example.com",
        createdAt: now - 1 * DAY,
      });
      const previousUser = await seedUser(ctx, {
        name: "Previous User",
        tokenIdentifier: "token|previous",
        email: "previous@example.com",
        createdAt: now - 40 * DAY,
      });
      const currentEvent = await seedEvent(ctx, currentUser, {
        title: "Current paid event",
        startDate: now - 1 * DAY,
        endDate: now + 1 * DAY,
        createdAt: now - 1 * DAY,
        ticketType: "paid",
        ticketPrice: 500,
        registrationCount: 1,
      });
      const previousEvent = await seedEvent(ctx, previousUser, {
        title: "Previous free event",
        startDate: now - 40 * DAY,
        endDate: now - 39 * DAY,
        createdAt: now - 40 * DAY,
        registrationCount: 1,
      });

      await seedRegistration(ctx, currentEvent, currentUser, {
        registeredAt: now - 1 * DAY,
        checkedIn: true,
      });
      await seedRegistration(ctx, previousEvent, previousUser, {
        registeredAt: now - 40 * DAY,
      });
    });

    const trends = await t
      .withIdentity(adminIdentity)
      .query(api.commandCenter.getTrends, { days: 30 });

    expect(trends.days).toBe(30);
    expect(trends.window.end - trends.window.start).toBe(30 * DAY);
    expect(trends.previousWindow.end).toBe(trends.window.start);
    expect(trends.previousWindow.start).toBe(trends.window.start - 30 * DAY);
    expect(trends.asOf).toBeGreaterThan(0);

    expect(trends.metrics.users).toMatchObject({ current: 1, previous: 1 });
    expect(trends.metrics.events).toMatchObject({ current: 1, previous: 1 });
    expect(trends.metrics.registrations).toMatchObject({ current: 1, previous: 1 });
    expect(trends.metrics.revenue).toMatchObject({ current: 500, previous: 0 });

    for (const metric of Object.values(trends.metrics)) {
      expect(metric.sparkline).toHaveLength(30);
      expect(metric.sparkline.every((value) => Number.isFinite(value))).toBe(true);
    }

    // A missing baseline is "new"; an unchanged zero/equal baseline is "no change".
    expect(computeDelta(trends.metrics.revenue.current, trends.metrics.revenue.previous)).toMatchObject({
      direction: "new",
      percent: null,
      label: "new",
    });
    expect(computeDelta(0, 0)).toMatchObject({
      direction: "flat",
      absolute: 0,
      percent: null,
      label: "no change",
    });
  });

  test("AC-006: the action queue counts each operational backlog and links to its module", async () => {
    const t = createConvexTest();
    const now = Date.now();
    await seedAdmin(t, now);

    await t.run(async (ctx) => {
      const organizer = await seedUser(ctx, {
        name: "Organizer",
        tokenIdentifier: "token|organizer",
        email: "organizer@example.com",
      });
      const attendee = await seedUser(ctx, {
        name: "Attendee",
        tokenIdentifier: "token|attendee",
        email: "attendee@example.com",
      });

      await seedInvite(ctx, organizer, {
        email: "expiring@example.com",
        status: "pending",
        expiresAt: now + 24 * 60 * 60 * 1000,
      });
      await seedInvite(ctx, organizer, {
        email: "later@example.com",
        status: "pending",
        expiresAt: now + 5 * DAY,
      });

      await seedEvent(ctx, organizer, {
        title: "Full event",
        capacity: 5,
        registrationCount: 5,
      });
      await seedEvent(ctx, organizer, {
        title: "Room left",
        capacity: 20,
        registrationCount: 3,
      });

      await seedFeedback(ctx, attendee, {
        message: "This has been waiting for triage.",
        status: "open",
        createdAt: now - 3 * DAY,
      });
      await seedFeedback(ctx, attendee, {
        message: "This is still fresh.",
        status: "open",
        createdAt: now - 1 * DAY,
      });
      await seedFeedback(ctx, attendee, {
        message: "Already handled.",
        status: "resolved",
        createdAt: now - 4 * DAY,
      });

      await ctx.db.insert("emailEvents", {
        template: "announcement",
        recipient: "failed@example.com",
        status: "failed",
        error: "Mailbox full",
        createdAt: now - 60 * 60 * 1000,
      });
      await ctx.db.insert("emailEvents", {
        template: "invite",
        recipient: "sent@example.com",
        status: "sent",
        createdAt: now - 60 * 60 * 1000,
      });
    });

    const queue = await t
      .withIdentity(adminIdentity)
      .query(api.commandCenter.getActionQueue, {});

    expect(queue.queues.expiringInvites).toMatchObject({
      count: 1,
      href: "/admin/invites",
    });
    expect(queue.queues.expiringInvites.previews[0]?.label).toBe("expiring@example.com");
    expect(queue.queues.atCapacity).toMatchObject({ count: 1, href: "/admin/events" });
    expect(queue.queues.atCapacity.previews[0]?.label).toBe("Full event");
    expect(queue.queues.staleFeedback).toMatchObject({ count: 1, href: "/admin/feedback" });
    expect(queue.queues.failedEmails).toMatchObject({ count: 1, href: "/admin/health" });
    expect(queue.queues.failedEmails.previews[0]?.label).toBe("failed@example.com");

    // A clean install shows zeroes, which the dashboard renders as a positive empty state.
    const empty = createConvexTest();
    await seedAdmin(empty, now);
    const emptyQueue = await empty
      .withIdentity(adminIdentity)
      .query(api.commandCenter.getActionQueue, {});
    expect(Object.values(emptyQueue.queues).map((bucket) => bucket.count)).toEqual([
      0, 0, 0, 0,
    ]);
  });

  test("AC-007: today's events report check-in progress and audit activity is capped at ten newest rows", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const adminId = await seedAdmin(t, now);

    const eventId = await t.run(async (ctx) => {
      const event = await seedEvent(ctx, adminId, {
        title: "Today Summit",
        startDate: now,
        endDate: now + 60 * 60 * 1000,
        capacity: 10,
        city: "Lagos",
      });
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
      await seedRegistration(ctx, event, one, { checkedIn: true, checkedInAt: now });
      await seedRegistration(ctx, event, two);
      await seedRegistration(ctx, event, three, { status: "cancelled" });

      for (let index = 0; index < 12; index += 1) {
        await seedAuditLog(ctx, adminId, {
          action: "event.deleted",
          targetLabel: `audit-${index}`,
          createdAt: now - index * 1000,
        });
      }
      return event;
    });

    const today = await t
      .withIdentity(adminIdentity)
      .query(api.commandCenter.getToday, {});
    expect(today.timezone).toBe("UTC");
    expect(today.events).toHaveLength(1);
    expect(today.events[0]).toMatchObject({
      id: eventId,
      title: "Today Summit",
      confirmed: 2,
      checkedIn: 1,
      capacity: 10,
      city: "Lagos",
    });
    expect(today.events[0].rate).toBeCloseTo(0.5);

    const audit = await t
      .withIdentity(adminIdentity)
      .query(api.admin.getRecentAudit, { limit: 10 });
    expect(audit).toHaveLength(10);
    expect(audit[0]?.targetLabel).toBe("audit-0");
    expect(audit[9]?.targetLabel).toBe("audit-9");
    expect(audit.every((entry) => entry.actorName === "Admin")).toBe(true);
  });
});
