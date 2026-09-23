import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { secureMutation } from "./helpers";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const name = identity.name ?? "Anonymous";
    const email = identity.email ?? "";
    const image = identity.pictureUrl ?? "";

    if (user !== null) {
      // Sync basic profile fields if changed in Clerk
      if (
        user.name !== name ||
        user.email !== email ||
        user.image !== image
      ) {
        await ctx.db.patch(user._id, {
          name,
          email,
          image,
          updatedAt: Date.now(),
        });
      }
      return user._id;
    }

    // New user record creation
    const now = Date.now();
    return await ctx.db.insert("users", {
      name,
      tokenIdentifier: identity.tokenIdentifier,
      email,
      image,
      hasCompletedOnboarding: false,
      freeEventsCreated: 0,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get current logged-in user profile
// (Must remain a raw query so it safely returns null instead of throwing errors for guest visitors)
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});

// Complete onboarding (attendee preferences)
export const completeOnboarding = secureMutation({
  args: {
    location: v.object({
      city: v.string(),
      state: v.optional(v.string()),
      country: v.string(),
    }),
    interests: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(ctx.user._id, {
      location: args.location,
      interests: args.interests,
      hasCompletedOnboarding: true,
      updatedAt: Date.now(),
    });

    return ctx.user._id;
  },
});
