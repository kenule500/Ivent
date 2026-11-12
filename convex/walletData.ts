import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { logAdminAction } from "./audit";

/**
 * Wallet persistence helpers live in their own module.
 *
 * `wallet.ts` is an action module, and Convex's generated `internal` object is
 * typed from every module. Keeping these helpers here prevents the action from
 * referencing its own module through `internal.wallet`, which would make the
 * action's inferred return type circular.
 */

export const loadWalletContext = internalQuery({
  args: {
    registrationId: v.id("registrations"),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .unique();
    if (!user || user._id !== registration.userId) return null;

    const event = await ctx.db.get(registration.eventId);
    if (!event) return null;

    return { registration, event, user };
  },
});

export const saveWalletPass = internalMutation({
  args: {
    registrationId: v.id("registrations"),
    objectId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("voided"),
      v.literal("error")
    ),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) return;

    const now = Date.now();
    await ctx.db.patch(args.registrationId, {
      wallet: {
        provider: "google",
        objectId: args.objectId,
        status: args.status,
        issuedAt: registration.wallet?.issuedAt ?? now,
        updatedAt: now,
        lastError: args.message,
      },
    });

    if (args.status === "active" || args.status === "voided") {
      const user = await ctx.db.get(registration.userId);
      const event = await ctx.db.get(registration.eventId);
      if (user && event) {
        await logAdminAction(
          ctx,
          user,
          args.status === "active" ? "wallet.issued" : "wallet.voided",
          "wallet",
          args.registrationId,
          `${registration.attendeeName} · ${event.title}`,
          { provider: "google", objectId: args.objectId }
        );
      }
    }
  },
});
