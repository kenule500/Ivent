import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { lifecycleKey } from "./lifecycleTemplates";

/**
 * Lifecycle sweeps (FR-003, FR-004).
 *
 * Both sweeps only schedule a send for registrations that have no delivery row
 * for that template yet, and the dispatch action claims the key before sending,
 * so running them as often as we like is safe (AC-004).
 */

const WINDOW_BEFORE_MS = 25 * 60 * 60 * 1000; // 25h
const WINDOW_AFTER_MS = 23 * 60 * 60 * 1000; // 23h
const FOLLOW_UP_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h after the end
const MAX_PER_RUN = 100;

async function recordHeartbeat(
  ctx: MutationCtx,
  name: string,
  processed: number,
  status: "success" | "failed",
  error?: string
) {
  const existing = await ctx.db
    .query("cronRuns")
    .withIndex("by_name", (q) => q.eq("name", name))
    .unique();

  const payload = {
    name,
    lastRunAt: Date.now(),
    status,
    processed,
    error,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
  } else {
    await ctx.db.insert("cronRuns", payload);
  }
}

export const runReminderSweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let processed = 0;

    try {
      const events = await ctx.db
        .query("events")
        .withIndex("by_startDate", (q) =>
          q.gte("startDate", now + WINDOW_AFTER_MS).lte("startDate", now + WINDOW_BEFORE_MS)
        )
        .take(MAX_PER_RUN);

      for (const event of events) {
        const registrations = await ctx.db
          .query("registrations")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .take(MAX_PER_RUN);

        for (const registration of registrations) {
          if (registration.status !== "confirmed") continue;

          const key = lifecycleKey(registration._id, "reminder_24h");
          const already = await ctx.db
            .query("emailEvents")
            .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", key))
            .unique();

          if (already && already.status !== "failed") continue;

          await ctx.scheduler.runAfter(
            0,
            internal.lifecycleEmails.sendLifecycleEmail,
            { registrationId: registration._id, template: "reminder_24h" }
          );
          processed += 1;
        }
      }

      await recordHeartbeat(ctx, "lifecycleReminderSweep", processed, "success");
      return { processed };
    } catch (error) {
      await recordHeartbeat(
        ctx,
        "lifecycleReminderSweep",
        processed,
        "failed",
        error instanceof Error ? error.message : "unknown error"
      );
      throw error;
    }
  },
});

export const runFollowUpSweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let processed = 0;

    try {
      // Events that ended recently: /events/[slug] links stay valid for this window.
      const events = await ctx.db
        .query("events")
        .withIndex("by_startDate", (q) =>
          q.gte("startDate", now - FOLLOW_UP_WINDOW_MS - 7 * 24 * 60 * 60 * 1000)
        )
        .take(MAX_PER_RUN);

      for (const event of events) {
        if (event.endDate > now) continue;
        if (event.endDate < now - FOLLOW_UP_WINDOW_MS) continue;

        const registrations = await ctx.db
          .query("registrations")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .take(MAX_PER_RUN);

        for (const registration of registrations) {
          if (registration.status !== "confirmed") continue;

          const key = lifecycleKey(registration._id, "post_event_thankyou");
          const already = await ctx.db
            .query("emailEvents")
            .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", key))
            .unique();

          if (already && already.status !== "failed") continue;

          await ctx.scheduler.runAfter(
            0,
            internal.lifecycleEmails.sendLifecycleEmail,
            { registrationId: registration._id, template: "post_event_thankyou" }
          );
          processed += 1;
        }
      }

      await recordHeartbeat(ctx, "lifecycleFollowUpSweep", processed, "success");
      return { processed };
    } catch (error) {
      await recordHeartbeat(
        ctx,
        "lifecycleFollowUpSweep",
        processed,
        "failed",
        error instanceof Error ? error.message : "unknown error"
      );
      throw error;
    }
  },
});

/** Registration + event context for one send (AC-008: one recipient only). */
export const loadContext = internalQuery({
  args: {
    registrationId: v.id("registrations"),
    template: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) return null;

    const event = await ctx.db.get(registration.eventId);
    if (!event) return null;

    return {
      attendeeName: registration.attendeeName,
      attendeeEmail: registration.attendeeEmail,
      emailOptOut: registration.emailOptOut === true,
      ticketCode: registration.qrCode,
      eventTitle: event.title,
      eventDate: new Date(event.startDate).toISOString(),
      eventLocation: [event.venue, event.city]
        .filter(Boolean)
        .join(", "),
      eventSlug: event.slug,
    };
  },
});
