import { query } from "./_generated/server";
import { v } from "convex/values";
import { secureMutation, secureQuery } from "./helpers";
import { QueryCtx, MutationCtx } from "./_generated/server";

// Helper function to safely resolve cover image URLs across Unsplash, Base64, and Convex Storage IDs
async function resolveImageUrl(ctx: QueryCtx | MutationCtx, imageSource?: string) {
  if (!imageSource) return undefined;

  // Direct return for Unsplash/external HTTP URLs and Base64 strings
  if (
    imageSource.startsWith("http://") ||
    imageSource.startsWith("https://") ||
    imageSource.startsWith("data:")
  ) {
    return imageSource;
  }

  // Fallback to Convex Storage lookup only for valid storage IDs
  try {
    return (await ctx.storage.getUrl(imageSource)) ?? undefined;
  } catch {
    return undefined;
  }
}

// Generate standard upload URL for local files
export const generateUploadUrl = secureMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createEvent = secureMutation({
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
  rateLimitName: "createEventRateLimit",
  handler: async (ctx, args) => {
    const hasPro = args.hasPro ?? false;

    if (!hasPro && (ctx.user.freeEventsCreated ?? 0) >= 1) {
      throw new Error(
        "Free event limit reached. Please upgrade to Pro to create more events."
      );
    }

    const defaultColor = "#1e3a8a";
    if (!hasPro && args.themeColor && args.themeColor !== defaultColor) {
      throw new Error(
        "Custom theme colors are a Pro feature. Please upgrade to Pro."
      );
    }

    const themeColor = hasPro ? (args.themeColor ?? defaultColor) : defaultColor;

    const slug = args.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { hasPro: _, themeColor: __, ...dbArgs } = args;

    const eventId = await ctx.db.insert("events", {
      ...dbArgs,
      themeColor,
      slug: `${slug}-${Date.now()}`,
      organizerId: ctx.user._id,
      organizerName: ctx.user.name,
      registrationCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(ctx.user._id, {
      freeEventsCreated: (ctx.user.freeEventsCreated ?? 0) + 1,
    });

    return eventId;
  },
});

// Helper Query: Resolves image URLs for individual components when needed
export const getImageUrl = query({
  args: { imageSource: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await resolveImageUrl(ctx, args.imageSource);
  },
});

// Public Query: Fetches event by slug and resolves image URL safely
export const getEventBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!event) return null;

    const coverImageUrl = await resolveImageUrl(ctx, event.coverImage);

    return {
      ...event,
      coverImageUrl,
    };
  },
});

// Authenticated Query: Fetches user events and resolves all image types
export const getMyEvents = secureQuery({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", ctx.user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      events.map(async (event) => {
        const coverImageUrl = await resolveImageUrl(ctx, event.coverImage);
        return {
          ...event,
          coverImageUrl,
        };
      })
    );
  },
});

// Authenticated Mutation: Deletes event and cleans up Convex storage if applicable
export const deleteEvent = secureMutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.organizerId !== ctx.user._id) {
      throw new Error("You are not authorized to delete this event");
    }

    // Delete associated uploaded file from Convex storage if it's a storage ID
    if (
      event.coverImage &&
      !event.coverImage.startsWith("http") &&
      !event.coverImage.startsWith("data:")
    ) {
      try {
        await ctx.storage.delete(event.coverImage);
      } catch {
        // Silently catch if file is missing in storage
      }
    }

    // Cascading delete: Remove registrations associated with this event
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const registration of registrations) {
      await ctx.db.delete(registration._id);
    }

    await ctx.db.delete(args.eventId);

    // Reclaim free event credit
    if (event.ticketType === "free" && (ctx.user.freeEventsCreated ?? 0) > 0) {
      await ctx.db.patch(ctx.user._id, {
        freeEventsCreated: ctx.user.freeEventsCreated - 1,
      });
    }

    return { success: true };
  },
});