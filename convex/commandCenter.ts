import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./helpers";
import { getPlatformTimezone, timezoneDayBounds, MAX_SCOPE_EVENTS } from "./analyticsFilters";

/**
 * Dashboard command-center queries (FR-007, FR-008, FR-009).
 * Each function is independent so the dashboard can render independent panels.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_POINTS = 30;

type TrendMetric = {
  current: number;
  previous: number;
  sparkline: number[];
};

function sparklineBuckets(
  values: { timestamp: number; amount: number }[],
  start: number,
  end: number
) {
  const span = Math.max(end - start, 1);
  const bucketSize = span / TREND_POINTS;
  const buckets = new Array(TREND_POINTS).fill(0) as number[];

  for (const value of values) {
    const index = Math.min(
      TREND_POINTS - 1,
      Math.max(0, Math.floor((value.timestamp - start) / bucketSize))
    );
    buckets[index] += value.amount;
  }

  return buckets;
}

function buildMetric(
  events: { timestamp: number; amount: number }[],
  start: number,
  end: number,
  previousStart: number,
  previousEnd: number
): TrendMetric {
  const inWindow = events.filter(
    (event) => event.timestamp >= start && event.timestamp < end
  );
  const inPrevious = events.filter(
    (event) => event.timestamp >= previousStart && event.timestamp < previousEnd
  );

  return {
    current: inWindow.reduce((sum, event) => sum + event.amount, 0),
    previous: inPrevious.reduce((sum, event) => sum + event.amount, 0),
    sparkline: sparklineBuckets(inWindow, start, end),
  };
}

export const getTrends = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const days = Math.min(Math.max(Math.round(args.days ?? 30), 1), 365);
    const now = Date.now();
    const start = now - days * DAY_MS;
    const previousStart = start - days * DAY_MS;

    const [users, events, registrations, allEvents] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_createdAt", (q) => q.gte("createdAt", previousStart))
        .take(MAX_SCOPE_EVENTS),
      ctx.db
        .query("events")
        .withIndex("by_startDate", (q) => q.gte("startDate", previousStart))
        .take(MAX_SCOPE_EVENTS),
      ctx.db
        .query("registrations")
        .withIndex("by_registeredAt", (q) => q.gte("registeredAt", previousStart))
        .take(MAX_SCOPE_EVENTS),
      ctx.db.query("events").take(MAX_SCOPE_EVENTS),
    ]);

    const priceByEvent = new Map(
      allEvents.map((event) => [
        event._id,
        event.ticketType === "paid" ? event.ticketPrice ?? 0 : 0,
      ])
    );

    const userPoints = users.map((user) => ({
      timestamp: user.createdAt ?? user._creationTime,
      amount: 1,
    }));
    const eventPoints = events.map((event) => ({
      timestamp: event.createdAt ?? event._creationTime,
      amount: 1,
    }));
    const registrationPoints = registrations.map((registration) => ({
      timestamp: registration.registeredAt,
      amount: 1,
    }));
    const revenuePoints = registrations.map((registration) => ({
      timestamp: registration.registeredAt,
      amount: priceByEvent.get(registration.eventId) ?? 0,
    }));

    return {
      days,
      window: { start, end: now },
      previousWindow: { start: previousStart, end: start },
      asOf: now,
      metrics: {
        users: buildMetric(userPoints, start, now, previousStart, start),
        events: buildMetric(eventPoints, start, now, previousStart, start),
        registrations: buildMetric(
          registrationPoints,
          start,
          now,
          previousStart,
          start
        ),
        revenue: buildMetric(revenuePoints, start, now, previousStart, start),
      },
    };
  },
});

export const getActionQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const in48h = now + 48 * 60 * 60 * 1000;
    const dayAgo = now - DAY_MS;

    const [pendingInvites, events, openFeedback, failedEmails] = await Promise.all([
      ctx.db
        .query("adminInvites")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(200),
      ctx.db.query("events").take(MAX_SCOPE_EVENTS),
      ctx.db
        .query("feedback")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "open"))
        .take(200),
      ctx.db
        .query("emailEvents")
        .withIndex("by_status_createdAt", (q) =>
          q.eq("status", "failed").gte("createdAt", dayAgo)
        )
        .take(200),
    ]);

    const expiringInvites = pendingInvites.filter(
      (invite) => invite.expiresAt <= in48h
    );
    const atCapacity = events.filter(
      (event) => event.capacity > 0 && event.registrationCount >= event.capacity
    );
    const staleFeedback = openFeedback.filter(
      (record) => record.createdAt < now - 48 * 60 * 60 * 1000
    );

    return {
      asOf: now,
      queues: {
        expiringInvites: {
          count: expiringInvites.length,
          href: "/admin/invites",
          previews: expiringInvites.slice(0, 3).map((invite) => ({
            id: invite._id,
            label: invite.email,
          })),
        },
        atCapacity: {
          count: atCapacity.length,
          href: "/admin/events",
          previews: atCapacity.slice(0, 3).map((event) => ({
            id: event._id,
            label: event.title,
          })),
        },
        staleFeedback: {
          count: staleFeedback.length,
          href: "/admin/feedback",
          previews: staleFeedback.slice(0, 3).map((record) => ({
            id: record._id,
            label: `${
              record.type === "abuse" ? "Abuse report" : "Feedback"
            } · ${new Date(record.createdAt).toISOString().slice(0, 10)}`,
          })),
        },
        failedEmails: {
          count: failedEmails.length,
          href: "/admin/health",
          previews: failedEmails.slice(0, 3).map((record) => ({
            id: record._id,
            label: record.recipient,
          })),
        },
      },
    };
  },
});

export const getToday = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const timezone = await getPlatformTimezone(ctx);
    const now = Date.now();
    const { start, end } = timezoneDayBounds(now, timezone);

    const events = await ctx.db
      .query("events")
      .withIndex("by_startDate", (q) => q.gte("startDate", start).lt("startDate", end))
      .take(100);

    const withProgress = await Promise.all(
      events.map(async (event) => {
        const registrations = await ctx.db
          .query("registrations")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .take(5000);

        const confirmed = registrations.filter(
          (registration) => registration.status === "confirmed"
        ).length;
        const checkedIn = registrations.filter(
          (registration) => registration.checkedIn
        ).length;

        return {
          id: event._id,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          city: event.city ?? null,
          confirmed,
          checkedIn,
          capacity: event.capacity,
          rate: confirmed > 0 ? checkedIn / confirmed : 0,
        };
      })
    );

    return {
      timezone,
      window: { start, end },
      asOf: now,
      events: withProgress,
    };
  },
});

export type CommandCenterEvent = Doc<"events">;
