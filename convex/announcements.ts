import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, requireSuperAdmin, consumeRateLimit, maskEmail } from "./helpers";
import { logAdminAction } from "./audit";
import {
  ANNOUNCEMENT_CONFIRMATION,
  assertFeatureEnabled,
} from "./platformData";
import { resolveAudience, type AudienceType } from "./announcementAudience";

/**
 * Broadcast announcements (FR-027 to FR-029, AC-024).
 *
 * Send is super-admin only, rate-limited, typed-confirmed, and asynchronous:
 * the mutation records the announcement and schedules batched delivery so a
 * large audience cannot block the request.
 */

const SUBJECT_MIN = 3;
const SUBJECT_MAX = 120;
const BODY_MIN = 10;
const BODY_MAX = 5000;

const audienceValidator = v.union(
  v.literal("all"),
  v.literal("organizers"),
  v.literal("event"),
  v.literal("admins")
);

export const audiencePreview = query({
  args: {
    audienceType: audienceValidator,
    audienceEventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await assertFeatureEnabled(ctx, "broadcasts");

    const result = await resolveAudience(ctx, {
      audienceType: args.audienceType as AudienceType,
      audienceEventId: args.audienceEventId,
    });

    return {
      recipientCount: result.recipients.length,
      truncated: result.truncated,
      samples: result.recipients
        .slice(0, 5)
        .map((recipient) => maskEmail(recipient.email)),
      confirmationPhrase: ANNOUNCEMENT_CONFIRMATION,
      sendingEnabled: process.env.BROADCAST_SENDING_ENABLED === "true",
    };
  },
});

export const history = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await assertFeatureEnabled(ctx, "broadcasts");

    const rows = await ctx.db
      .query("announcements")
      .withIndex("by_createdAt")
      .order("desc")
      .take(100);

    const authors = new Map<string, string>();
    const authorIds = Array.from(new Set(rows.map((row) => row.createdBy))).slice(
      0,
      100
    );
    for (const authorId of authorIds) {
      const author = await ctx.db.get(authorId);
      if (author) authors.set(authorId, author.name);
    }

    return rows.map((row) => ({
      id: row._id,
      subject: row.subject,
      audienceType: row.audienceType,
      audienceEventId: row.audienceEventId ?? null,
      recipientCount: row.recipientCount,
      sentCount: row.sentCount,
      failedCount: row.failedCount,
      status: row.status,
      createdByName: authors.get(row.createdBy) ?? "Unknown admin",
      createdAt: row.createdAt,
      sentAt: row.sentAt ?? null,
    }));
  },
});

export const deliveries = query({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await assertFeatureEnabled(ctx, "broadcasts");

    return ctx.db
      .query("announcementDeliveries")
      .withIndex("by_announcement", (q) =>
        q.eq("announcementId", args.announcementId)
      )
      .take(500);
  },
});

export const send = mutation({
  args: {
    subject: v.string(),
    body: v.string(),
    audienceType: audienceValidator,
    audienceEventId: v.optional(v.id("events")),
    confirmation: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    await assertFeatureEnabled(ctx, "broadcasts");

    const subject = args.subject.trim();
    const body = args.body.trim();

    if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) {
      return {
        ok: false as const,
        message: `The subject must be ${SUBJECT_MIN}â€“${SUBJECT_MAX} characters.`,
      };
    }

    if (body.length < BODY_MIN || body.length > BODY_MAX) {
      return {
        ok: false as const,
        message: `The message must be ${BODY_MIN}â€“${BODY_MAX} characters.`,
      };
    }

    if (args.confirmation.trim() !== ANNOUNCEMENT_CONFIRMATION) {
      return {
        ok: false as const,
        message: `Type "${ANNOUNCEMENT_CONFIRMATION}" to send this announcement.`,
      };
    }

    if (args.audienceType === "event" && !args.audienceEventId) {
      return { ok: false as const, message: "Choose the event audience." };
    }

    if (process.env.BROADCAST_SENDING_ENABLED !== "true") {
      return {
        ok: false as const,
        message:
          "Broadcast sending is disabled until the sending domain is verified. Set BROADCAST_SENDING_ENABLED=true once Resend is ready.",
      };
    }

    const limit = await consumeRateLimit(ctx, "broadcast", admin._id);
    if (!limit.ok) {
      return { ok: false as const, message: limit.message };
    }

    const audience = await resolveAudience(ctx, {
      audienceType: args.audienceType as AudienceType,
      audienceEventId: args.audienceEventId,
    });

    if (audience.truncated) {
      return {
        ok: false as const,
        message: "This audience exceeds 5,000 recipients. Narrow it first.",
      };
    }

    if (audience.recipients.length === 0) {
      return {
        ok: false as const,
        message: "This audience has no recipients with an email address.",
      };
    }

    const announcementId = await ctx.db.insert("announcements", {
      subject,
      body,
      audienceType: args.audienceType,
      audienceEventId: args.audienceEventId,
      recipientCount: audience.recipients.length,
      sentCount: 0,
      failedCount: 0,
      status: "sending",
      createdBy: admin._id,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.announcementsNode.deliver, {
      announcementId,
    });

    return {
      ok: true as const,
      announcementId,
      recipientCount: audience.recipients.length,
    };
  },
});

/** Internal plan read so the delivery action has everything it needs in one call. */
export const deliveryPlan = internalQuery({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) throw new Error("Announcement not found");

    const audience = await resolveAudience(ctx, {
      audienceType: announcement.audienceType as AudienceType,
      audienceEventId: announcement.audienceEventId,
    });

    return { announcement, recipients: audience.recipients };
  },
});

export const recordDelivery = internalMutation({
  args: {
    announcementId: v.id("announcements"),
    email: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("announcementDeliveries", {
      announcementId: args.announcementId,
      email: args.email,
      status: args.status,
      error: args.error,
      createdAt: Date.now(),
    });

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) return;

    await ctx.db.patch(args.announcementId, {
      sentCount:
        announcement.sentCount + (args.status === "sent" ? 1 : 0),
      failedCount:
        announcement.failedCount + (args.status === "failed" ? 1 : 0),
    });
  },
});

export const finalize = internalMutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) return;

    const status =
      announcement.sentCount === 0
        ? ("failed" as const)
        : announcement.failedCount > 0
          ? ("partial" as const)
          : ("sent" as const);

    const sentAt = Date.now();
    await ctx.db.patch(args.announcementId, { status, sentAt });

    const actor = await ctx.db.get(announcement.createdBy);
    if (actor) {
      await logAdminAction(
        ctx,
        actor,
        "announcement.sent",
        "announcement",
        args.announcementId,
        announcement.subject,
        {
          audienceType: announcement.audienceType,
          audienceEventId: announcement.audienceEventId ?? null,
          recipientCount: announcement.recipientCount,
          sentCount: announcement.sentCount,
          failedCount: announcement.failedCount,
          status,
        }
      );
    }
  },
});
