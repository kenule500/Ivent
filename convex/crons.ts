// convex/crons.ts
import { cronJobs } from "convex/server";
import { internalMutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const CRON_NAME = "markExpiredInvites";
const MAX_PER_RUN = 1000;

/** Upsert the single heartbeat row for a cron job. */
async function recordHeartbeat(
  ctx: MutationCtx,
  status: "success" | "failed",
  processed: number,
  error?: string
) {
  const existing = await ctx.db
    .query("cronRuns")
    .withIndex("by_name", (q) => q.eq("name", CRON_NAME))
    .unique();

  const payload = {
    name: CRON_NAME,
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

// The internal mutation (already "registered" by Convex)
export const markExpiredInvites = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let processed = 0;

    try {
      const pending = await ctx.db
        .query("adminInvites")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(MAX_PER_RUN);

      for (const invite of pending) {
        if (invite.expiresAt < now) {
          await ctx.db.patch(invite._id, { status: "expired" });
          processed += 1;
        }
      }

      await recordHeartbeat(ctx, "success", processed);
      return { ok: true, processed };
    } catch (error) {
      // Record the failure instead of throwing: a throw rolls back the
      // heartbeat write, hiding the failure from the health page.
      const message = error instanceof Error ? error.message : "Unknown cron error";
      await recordHeartbeat(ctx, "failed", processed, message);
      return { ok: false, processed, error: message };
    }
  },
});

const crons = cronJobs();

// Pass the FUNCTION REFERENCE, not a wrapped call
crons.daily(
  "mark expired invites",
  { hourUTC: 0, minuteUTC: 0 },
  internal.crons.markExpiredInvites
);

export default crons;
