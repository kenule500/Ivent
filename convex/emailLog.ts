import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { lifecycleTemplateValidator } from "./lifecycleTemplates";

const emailTemplateValidator = v.union(
  v.literal("invite"),
  v.literal("announcement"),
  v.literal("registration_confirmation"),
  v.literal("reminder_24h"),
  v.literal("post_event_thankyou"),
  v.literal("feedback_request")
);

/**
 * Email delivery log used by system health and the dashboard action queue.
 * Called from the Node email action so the log write lives outside the action.
 */
export const recordEmailEvent = internalMutation({
  args: {
    template: emailTemplateValidator,
    recipient: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
    registrationId: v.optional(v.id("registrations")),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailEvents", {
      template: args.template,
      recipient: args.recipient,
      status: args.status,
      error: args.error,
      createdAt: Date.now(),
      registrationId: args.registrationId,
      idempotencyKey: args.idempotencyKey,
      attempts: 1,
    });
  },
});

/**
 * Claim a lifecycle send (FR-005).
 *
 * Writes the idempotency row *before* the provider call and reports whether the
 * caller won the claim. A repeat sweep, or a retry after a crash, finds the row
 * and returns `false`, so the same registration never receives the same
 * lifecycle email twice (AC-004).
 */
export const claimLifecycleSend = internalMutation({
  args: {
    registrationId: v.id("registrations"),
    template: lifecycleTemplateValidator,
    idempotencyKey: v.string(),
    recipient: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailEvents")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .unique();

    if (existing) return false;

    await ctx.db.insert("emailEvents", {
      template: args.template,
      recipient: args.recipient,
      status: "queued",
      createdAt: Date.now(),
      registrationId: args.registrationId,
      idempotencyKey: args.idempotencyKey,
      attempts: 0,
    });

    return true;
  },
});

/**
 * Settle a claimed send with its outcome (FR-006).
 *
 * The row written by the claim is updated rather than duplicated, so the admin
 * view shows one row per delivery with its final status and attempt count.
 */
export const settleLifecycleSend = internalMutation({
  args: {
    idempotencyKey: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailEvents")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .unique();

    if (!existing) return;

    await ctx.db.patch(existing._id, {
      status: args.status,
      error: args.error,
      attempts: (existing.attempts ?? 0) + 1,
    });
  },
});

/** Delivery rows for one registration, for the admin view (FR-008, AC-007). */
export const listLifecycleDeliveries = internalQuery({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailEvents")
      .withIndex("by_registration", (q) =>
        q.eq("registrationId", args.registrationId)
      )
      .collect();
  },
});
