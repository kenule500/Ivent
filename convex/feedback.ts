import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  requireAdmin,
  consumeRateLimit,
  getAuthenticatedUser,
} from "./helpers";
import { logAdminAction } from "./audit";
import { assertFeatureEnabled } from "./platformData";

/**
 * Support and feedback (FR-030 to FR-033).
 *
 * Submission is authenticated and rate-limited; the inbox is admin-only and
 * every status change or deletion is audited.
 */

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;
const NOTE_MAX = 1000;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const feedbackType = v.union(
  v.literal("bug"),
  v.literal("feature"),
  v.literal("abuse"),
  v.literal("other")
);

const feedbackStatus = v.union(
  v.literal("open"),
  v.literal("in_review"),
  v.literal("resolved"),
  v.literal("dismissed")
);

const feedbackPriority = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high")
);

export const submit = mutation({
  args: {
    type: feedbackType,
    eventId: v.optional(v.id("events")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const message = args.message.trim();

    if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
      return {
        ok: false as const,
        message: `Your message must be ${MESSAGE_MIN}–${MESSAGE_MAX} characters.`,
      };
    }

    if (args.eventId) {
      const event = await ctx.db.get(args.eventId);
      if (!event) {
        return { ok: false as const, message: "That event no longer exists." };
      }
    }

    const limit = await consumeRateLimit(ctx, "feedbackSubmit", user._id);
    if (!limit.ok) {
      return { ok: false as const, message: limit.message };
    }

    const recent = await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(5);

    const now = Date.now();
    const duplicate = recent.find(
      (entry) =>
        entry.type === args.type &&
        entry.eventId === args.eventId &&
        now - entry.createdAt < DUPLICATE_WINDOW_MS
    );

    if (duplicate) {
      return {
        ok: false as const,
        message: "You already sent this feedback in the last 10 minutes.",
      };
    }

    const feedbackId = await ctx.db.insert("feedback", {
      type: args.type,
      eventId: args.eventId,
      userId: user._id,
      userEmail: user.email,
      message,
      status: "open",
      priority: "normal",
      adminNotes: [],
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true as const, feedbackId };
  },
});

export const list = query({
  args: {
    status: v.optional(feedbackStatus),
    type: v.optional(feedbackType),
    priority: v.optional(feedbackPriority),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await assertFeatureEnabled(ctx, "feedbackInbox");

    const rows = await ctx.db
      .query("feedback")
      .withIndex("by_status_createdAt", (q) =>
        args.status ? q.eq("status", args.status) : q
      )
      .order("desc")
      .take(500);

    const filtered = rows.filter(
      (row) =>
        (!args.type || row.type === args.type) &&
        (!args.priority || row.priority === args.priority)
    );

    const eventTitles = new Map<string, string>();
    const eventIds = Array.from(
      new Set(
        filtered
          .map((row) => row.eventId)
          .filter((id): id is Id<"events"> => Boolean(id))
      )
    ).slice(0, 100);

    for (const eventId of eventIds) {
      const event = await ctx.db.get(eventId);
      if (event) eventTitles.set(eventId, event.title);
    }

    const statuses = ["open", "in_review", "resolved", "dismissed"] as const;
    const counts: Record<string, number> = {};
    for (const status of statuses) {
      const bucket = await ctx.db
        .query("feedback")
        .withIndex("by_status_createdAt", (q) => q.eq("status", status))
        .take(1000);
      counts[status] = bucket.length;
    }

    return {
      counts,
      total: filtered.length,
      rows: filtered.map((row) => ({
        id: row._id,
        type: row.type,
        status: row.status,
        priority: row.priority,
        message: row.message,
        userEmail: row.userEmail,
        eventId: row.eventId ?? null,
        eventTitle: row.eventId ? eventTitles.get(row.eventId) ?? null : null,
        eventRemoved:
          row.eventId !== undefined && !eventTitles.has(row.eventId),
        adminNotes: row.adminNotes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        resolvedAt: row.resolvedAt ?? null,
      })),
    };
  },
});

export const update = mutation({
  args: {
    feedbackId: v.id("feedback"),
    status: v.optional(feedbackStatus),
    priority: v.optional(feedbackPriority),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await assertFeatureEnabled(ctx, "feedbackInbox");

    const limit = await consumeRateLimit(ctx, "feedbackWrite", admin._id);
    if (!limit.ok) {
      return { ok: false as const, message: limit.message };
    }

    const existing = await ctx.db.get(args.feedbackId);
    if (!existing) {
      return { ok: false as const, message: "This feedback no longer exists." };
    }

    const note = args.note?.trim();
    if (note !== undefined && note.length > NOTE_MAX) {
      return {
        ok: false as const,
        message: `Notes must be ${NOTE_MAX} characters or fewer.`,
      };
    }

    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    const changes: Record<string, unknown> = {};

    if (args.status && args.status !== existing.status) {
      patch.status = args.status;
      changes.status = { before: existing.status, after: args.status };

      if (args.status === "resolved" || args.status === "dismissed") {
        patch.resolvedBy = admin._id;
        patch.resolvedAt = now;
      } else {
        patch.resolvedBy = undefined;
        patch.resolvedAt = undefined;
      }
    }

    if (args.priority && args.priority !== existing.priority) {
      patch.priority = args.priority;
      changes.priority = { before: existing.priority, after: args.priority };
    }

    if (note) {
      patch.adminNotes = [
        ...existing.adminNotes,
        {
          authorId: admin._id,
          authorName: admin.name,
          body: note,
          createdAt: now,
        },
      ];
      changes.note = { added: note };
    }

    await ctx.db.patch(args.feedbackId, patch);

    await logAdminAction(
      ctx,
      admin,
      "feedback.updated",
      "feedback",
      args.feedbackId,
      `${existing.type} feedback`,
      { changes }
    );

    return { ok: true as const };
  },
});

export const remove = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await assertFeatureEnabled(ctx, "feedbackInbox");

    const limit = await consumeRateLimit(ctx, "feedbackWrite", admin._id);
    if (!limit.ok) {
      return { ok: false as const, message: limit.message };
    }

    const existing = await ctx.db.get(args.feedbackId);
    if (!existing) {
      return { ok: false as const, message: "This feedback no longer exists." };
    }

    await logAdminAction(
      ctx,
      admin,
      "feedback.deleted",
      "feedback",
      args.feedbackId,
      `${existing.type}: ${existing.message.slice(0, 60)}`,
      { status: existing.status, createdAt: existing.createdAt }
    );

    await ctx.db.delete(args.feedbackId);
    return { ok: true as const };
  },
});
