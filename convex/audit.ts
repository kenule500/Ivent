import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./helpers";
import { MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * Valid admin action types.
 * Keep this in sync with the auditLogs schema.
 */
export type AuditAction =
  | "event.deleted"
  | "user.banned"
  | "user.unbanned"
  | "user.role_changed"
  | "invite.created"
  | "invite.revoked"
  | "invite.resent"
  | "invite.deleted"
  | "registration.cancelled"
  | "settings.updated"
  | "announcement.sent"
  | "feedback.updated"
  | "feedback.deleted"
  | "export.generated"
  | "maintenance.changed";

/**
 * Valid target types.
 */
export type AuditTargetType =
  | "event"
  | "user"
  | "invite"
  | "registration"
  | "settings"
  | "announcement"
  | "feedback"
  | "export";

/** Hard cap so a wide date range cannot stream the whole log to a client. */
export const MAX_AUDIT_ROWS = 2000;

/**
 * Log an admin action.
 * Call this from other mutations to record what happened.
 */
export async function logAdminAction(
  ctx: MutationCtx,
  actor: Doc<"users">,
  action: AuditAction,
  targetType: AuditTargetType,
  targetId: string,
  targetLabel: string,
  metadata?: Record<string, unknown>
) {
  await ctx.db.insert("auditLogs", {
    actorId: actor._id,
    actorName: actor.name,
    actorEmail: actor.email,
    action,
    targetType,
    targetId,
    targetLabel,
    metadata,
    createdAt: Date.now(),
  });
}

/**
 * Get audit logs (admin only).
 * Returns all logs — the frontend paginates client-side.
 * If you later have >5000 logs, switch to server-side pagination.
 */
export const getAuditLogs = query({
  args: {
    search: v.optional(v.string()),
    actionFilter: v.optional(v.string()),
    targetFilter: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = Math.min(Math.max(args.limit ?? 500, 1), MAX_AUDIT_ROWS);

    const from = args.from;
    const to = args.to;

    // Narrow the index range when a date filter is present; otherwise read backwards
    // from the newest row and stop at the cap.
    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_createdAt", (q) => {
        if (from !== undefined && to !== undefined) {
          return q.gte("createdAt", from).lt("createdAt", to);
        }
        if (from !== undefined) return q.gte("createdAt", from);
        if (to !== undefined) return q.lt("createdAt", to);
        return q;
      })
      .order("desc")
      .take(limit);

    if (args.actionFilter && args.actionFilter !== "all") {
      logs = logs.filter((log) => log.action === args.actionFilter);
    }

    if (args.targetFilter && args.targetFilter !== "all") {
      logs = logs.filter((log) => log.targetType === args.targetFilter);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      logs = logs.filter(
        (log) =>
          log.actorName.toLowerCase().includes(searchLower) ||
          log.actorEmail.toLowerCase().includes(searchLower) ||
          log.targetLabel.toLowerCase().includes(searchLower)
      );
    }

    return logs;
  },
});

/**
 * Get audit log stats (admin only).
 */
export const getAuditStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const logs = await ctx.db.query("auditLogs").collect();
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      total: logs.length,
      last24h: logs.filter((l) => l.createdAt > dayAgo).length,
      last7d: logs.filter((l) => l.createdAt > weekAgo).length,
    };
  },
});