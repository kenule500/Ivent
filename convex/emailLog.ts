import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Email delivery log used by system health and the dashboard action queue.
 * Called from the Node email action so the log write lives outside the action.
 */
export const recordEmailEvent = internalMutation({
  args: {
    template: v.union(v.literal("invite"), v.literal("announcement")),
    recipient: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailEvents", {
      template: args.template,
      recipient: args.recipient,
      status: args.status,
      error: args.error,
      createdAt: Date.now(),
    });
  },
});
