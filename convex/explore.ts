import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Helper: Bounded index fetch for upcoming events
export async function getUpcomingEvents(ctx: QueryCtx, limit: number = 100) {
  const now = Date.now();
  return await ctx.db
    .query("events")
    .withIndex("by_startDate", (q) => q.gte("startDate", now))
    .order("asc")
    .take(limit);
}

// Get featured events (sorted by registration count)
export const getFeaturedEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await getUpcomingEvents(ctx, 100);

    return events
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, args.limit ?? 3);
  },
});

// Get events by location (city/state)
export const getEventsByLocation = query({
  args: {
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const offset = Math.max(args.offset ?? 0, 0);
    const limit = Math.max(args.limit ?? 10, 1);
    const take = offset + limit;

    let events: Doc<"events">[];

    if (args.city) {
      events = await ctx.db
        .query("events")
        .withIndex("by_city_startDate", (q) =>
          q.eq("city", args.city).gte("startDate", now)
        )
        .order("asc")
        .take(take);

      if (args.state) {
        events = events.filter((event) => event.state === args.state);
      }
    } else if (args.state) {
      events = await ctx.db
        .query("events")
        .withIndex("by_state_startDate", (q) =>
          q.eq("state", args.state).gte("startDate", now)
        )
        .order("asc")
        .take(take);
    } else {
      events = await getUpcomingEvents(ctx, take);
    }

    return events.slice(offset, offset + limit);
  },
});

// Get events by category
export const getEventsByCategory = query({
  args: {
    category: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const offset = Math.max(args.offset ?? 0, 0);
    const limit = Math.max(args.limit ?? 10, 1);

    const events = await ctx.db
      .query("events")
      .withIndex("by_category_startDate", (q) =>
        q.eq("category", args.category).gte("startDate", now)
      )
      .order("asc")
      .take(offset + limit);

    return events.slice(offset, offset + limit);
  },
});

// Get popular events
export const getPopularEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await getUpcomingEvents(ctx, 100);

    return events
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, args.limit ?? 6);
  },
});

// Count upcoming events by category
export const getCategoryCounts = query({
  handler: async (ctx) => {
    const events = await getUpcomingEvents(ctx, 200);

    const counts: Record<string, number> = {};
    events.forEach((event) => {
      if (event.category) {
        counts[event.category] = (counts[event.category] || 0) + 1;
      }
    });

    return counts;
  },
});
