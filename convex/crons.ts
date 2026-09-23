// convex/crons.ts
import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// The internal mutation (already "registered" by Convex)
export const markExpiredInvites = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.db
      .query("adminInvites")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    for (const invite of pending) {
      if (invite.expiresAt < now) {
        await ctx.db.patch(invite._id, { status: "expired" });
      }
    }
  },
});

const crons = cronJobs();

// 👇 pass the FUNCTION REFERENCE, not a wrapped call
crons.daily(
  "mark expired invites",
  { hourUTC: 0, minuteUTC: 0 },
  internal.crons.markExpiredInvites
);

export default crons;