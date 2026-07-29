import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new event
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    timezone: v.string(),
    locationType: v.union(v.literal("physical"), v.literal("online")),
    venue: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    capacity: v.number(),
    ticketType: v.union(v.literal("free"), v.literal("paid")),
    ticketPrice: v.optional(v.number()),
    coverImage: v.optional(v.string()),
    themeColor: v.optional(v.string()),
    hasPro: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Authenticate user at the edge
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Unauthenticated. Please sign in to create events.");
      }

      // 2. Fetch the actual user record from your "users" collection
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier)
        )
        .unique();

      if (!user) {
        throw new Error("User profile records not found.");
      }

      // Normalize Pro status flag from arguments safely
      const hasPro = args.hasPro ?? false;

      // SERVER-SIDE CHECK: Verify event limit for Free users
      if (!hasPro && (user.freeEventsCreated ?? 0) >= 1) {
        throw new Error(
          "Free event limit reached. Please upgrade to Pro to create more events."
        );
      }

      // SERVER-SIDE CHECK: Verify custom color usage
      const defaultColor = "#1e3a8a";
      if (!hasPro && args.themeColor && args.themeColor !== defaultColor) {
        throw new Error(
          "Custom theme colors are a Pro feature. Please upgrade to Pro."
        );
      }

      // Force default color for Free users
      const themeColor = hasPro ? args.themeColor : defaultColor;

      // Generate slug from title
      const slug = args.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // ✅ FIX: Destructure 'hasPro' to strip it out from the remaining 'dbArgs'
     const { hasPro: _, themeColor: __, ...dbArgs } = args;

      // Create event document
      const eventId = await ctx.db.insert("events", {
        ...dbArgs,
        themeColor, 
        slug: `${slug}-${Date.now()}`,
        organizerId: user._id,
        organizerName: user.name,
        registrationCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update user's free event count explicitly on the "users" table
      await ctx.db.patch("users", user._id, {
        freeEventsCreated: (user.freeEventsCreated ?? 0) + 1,
      });

      return eventId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(`Failed to execute operation: ${errorMessage}`);
    }
  },
})

// Get event by slug
export const getEventBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

// Get events by organizer
export const getMyEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .order("desc")
      .collect();
  },
});

// Delete event
export const deleteEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Unauthenticated");

      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier)
        )
        .unique();

      if (!user) throw new Error("User record not found");

      const event = await ctx.db.get(args.eventId);
      if (!event) {
        throw new Error("Event not found");
      }

      // Authorization check
      if (event.organizerId !== user._id) {
        throw new Error("You are not authorized to delete this event");
      }

      // Cascading delete: Clear all associated registrations
      const registrations = await ctx.db
        .query("registrations")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      for (const registration of registrations) {
        await ctx.db.delete(registration._id);
      }

      // Delete target event document
      await ctx.db.delete(args.eventId);

      // Re-credit free event count allocation if applicable
      if (event.ticketType === "free" && (user.freeEventsCreated ?? 0) > 0) {
        await ctx.db.patch("users", user._id, {
          freeEventsCreated: user.freeEventsCreated - 1,
        });
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(`Failed to delete event: ${errorMessage}`);
    }
  },
});