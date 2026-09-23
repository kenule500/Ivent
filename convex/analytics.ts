import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./helpers";

/**
 * Get user growth data — count of users by day.
 */
export const getUserGrowth = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const days = args.days ?? 30;
    const now = Date.now();
    const startDate = now - days * 24 * 60 * 60 * 1000;

    const users = await ctx.db.query("users").collect();

    // Build daily buckets
    const buckets: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      buckets[key] = 0;
    }

    users.forEach((u) => {
      if (u.createdAt && u.createdAt >= startDate) {
        const key = new Date(u.createdAt).toISOString().split("T")[0];
        if (buckets[key] !== undefined) buckets[key]++;
      }
    });

    // Return chronologically
    return Object.entries(buckets)
      .map(([date, count]) => ({ date, count }))
      .reverse();
  },
});

/**
 * Get event creation data — count of events by day.
 */
export const getEventGrowth = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const days = args.days ?? 30;
    const now = Date.now();
    const startDate = now - days * 24 * 60 * 60 * 1000;

    const events = await ctx.db.query("events").collect();

    const buckets: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      buckets[key] = 0;
    }

    events.forEach((e) => {
      if (e.createdAt && e.createdAt >= startDate) {
        const key = new Date(e.createdAt).toISOString().split("T")[0];
        if (buckets[key] !== undefined) buckets[key]++;
      }
    });

    return Object.entries(buckets)
      .map(([date, count]) => ({ date, count }))
      .reverse();
  },
});

/**
 * Get registration trend — count of registrations by day.
 */
export const getRegistrationTrend = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const days = args.days ?? 30;
    const now = Date.now();
    const startDate = now - days * 24 * 60 * 60 * 1000;

    const registrations = await ctx.db.query("registrations").collect();

    const buckets: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      buckets[key] = 0;
    }

    registrations.forEach((r) => {
      if (r.registeredAt >= startDate) {
        const key = new Date(r.registeredAt).toISOString().split("T")[0];
        if (buckets[key] !== undefined) buckets[key]++;
      }
    });

    return Object.entries(buckets)
      .map(([date, count]) => ({ date, count }))
      .reverse();
  },
});

/**
 * Get events by category.
 */
export const getEventsByCategory = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const events = await ctx.db.query("events").collect();

    const counts: Record<string, number> = {};
    events.forEach((e) => {
      if (e.category) {
        counts[e.category] = (counts[e.category] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * Get top events by registrations.
 */
export const getTopEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const events = await ctx.db.query("events").collect();

    return events
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, args.limit ?? 5)
      .map((e) => ({
        _id: e._id,
        title: e.title,
        category: e.category,
        city: e.city,
        state: e.state,
        registrationCount: e.registrationCount,
        capacity: e.capacity,
        startDate: e.startDate,
        coverImage: e.coverImage,
      }));
  },
});

/**
 * Get events by location (city).
 */
export const getEventsByCity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const events = await ctx.db.query("events").collect();

    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const city = e.city?.trim() || "Unknown";
      counts[city] = (counts[city] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, args.limit ?? 8);
  },
});

/**
 * Get summary metrics — single call for the top cards.
 */
export const getSummaryMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [users, events, registrations] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("events").collect(),
      ctx.db.query("registrations").collect(),
    ]);

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // New users in periods
    const newUsers24h = users.filter(
      (u) => u.createdAt && u.createdAt > dayAgo
    ).length;
    const newUsers7d = users.filter(
      (u) => u.createdAt && u.createdAt > weekAgo
    ).length;
    const newUsers30d = users.filter(
      (u) => u.createdAt && u.createdAt > monthAgo
    ).length;

    // Registrations in periods
    const regs24h = registrations.filter((r) => r.registeredAt > dayAgo).length;
    const regs7d = registrations.filter((r) => r.registeredAt > weekAgo).length;
    const regs30d = registrations.filter(
      (r) => r.registeredAt > monthAgo
    ).length;

    // Upcoming vs past events
    const upcoming = events.filter((e) => e.startDate > now).length;
    const past = events.filter((e) => e.startDate <= now).length;

    // Total revenue (paid events only, estimated)
    const totalRevenue = events
      .filter((e) => e.ticketType === "paid")
      .reduce(
        (sum, e) => sum + (e.ticketPrice ?? 0) * e.registrationCount,
        0
      );

    // Average registration rate
    const avgRegistrationRate =
      events.length > 0
        ? events.reduce(
            (sum, e) =>
              sum + (e.capacity > 0 ? e.registrationCount / e.capacity : 0),
            0
          ) / events.length
        : 0;

    return {
      totalUsers: users.length,
      totalEvents: events.length,
      totalRegistrations: registrations.length,
      upcomingEvents: upcoming,
      pastEvents: past,
      newUsers24h,
      newUsers7d,
      newUsers30d,
      regs24h,
      regs7d,
      regs30d,
      totalRevenue,
      avgRegistrationRate,
    };
  },
});