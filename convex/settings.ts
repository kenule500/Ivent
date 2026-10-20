// convex/settings.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin } from "./helpers";

/**
 * Get the current admin's full profile + preferences.
 */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    // Only fields the settings screen renders (NFR-013): never spread the user
    // document, which also carries tokenIdentifier and other internal values.
    return {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      image: admin.image ?? null,
      role: admin.role ?? "user",
      createdAt: admin.createdAt ?? admin._creationTime,
      preferences: admin.preferences ?? {
        emailOnNewEvent: true,
        emailOnNewRegistration: true,
        emailOnNewAdminInvite: true,
        emailOnNewUser: true,
      },
    };
  },
});

/**
 * Update the current admin's preferences.
 */
export const updateMyPreferences = mutation({
  args: {
    preferences: v.object({
      emailOnNewEvent: v.boolean(),
      emailOnNewRegistration: v.boolean(),
      emailOnNewAdminInvite: v.boolean(),
      emailOnNewUser: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    await ctx.db.patch(admin._id, {
      preferences: args.preferences,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});