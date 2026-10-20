import { query } from "./_generated/server";
import { requireAdmin } from "./helpers";
import { getPlatformTimezone } from "./analyticsFilters";

/**
 * System health signals (FR-036, FR-037, NFR-006).
 * Every section is independent and every window is stated explicitly.
 * Configuration is reported as present/absent booleans only, never values.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const SCAN_LIMIT = 5000;
const CRON_STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const dayAgo = now - DAY_MS;
    const weekAgo = now - 7 * DAY_MS;
    const timezone = await getPlatformTimezone(ctx);

    const [cronRuns, failedRecent, failedWeek, sentRecent, openFeedback, rejections] =
      await Promise.all([
        ctx.db.query("cronRuns").take(50),
        ctx.db
          .query("emailEvents")
          .withIndex("by_status_createdAt", (q) =>
            q.eq("status", "failed").gte("createdAt", dayAgo)
          )
          .order("desc")
          .take(SCAN_LIMIT),
        ctx.db
          .query("emailEvents")
          .withIndex("by_status_createdAt", (q) =>
            q.eq("status", "failed").gte("createdAt", weekAgo)
          )
          .take(SCAN_LIMIT),
        ctx.db
          .query("emailEvents")
          .withIndex("by_status_createdAt", (q) =>
            q.eq("status", "sent").gte("createdAt", dayAgo)
          )
          .take(SCAN_LIMIT),
        ctx.db
          .query("feedback")
          .withIndex("by_status_createdAt", (q) => q.eq("status", "open"))
          .order("asc")
          .take(SCAN_LIMIT),
        ctx.db
          .query("rateLimitRejections")
          .withIndex("by_createdAt", (q) => q.gte("createdAt", dayAgo))
          .take(SCAN_LIMIT),
      ]);

    const rejectionCounts = new Map<string, number>();
    for (const rejection of rejections) {
      rejectionCounts.set(
        rejection.bucket,
        (rejectionCounts.get(rejection.bucket) ?? 0) + 1
      );
    }

    const bucketRows = Array.from(rejectionCounts.entries())
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((a, b) => b.count - a.count);

    return {
      asOf: now,
      timezone,
      windows: {
        emails: "24 hours and 7 days",
        feedback: "all open items",
        rateLimits: "24 hours",
        cron: "daily schedule",
      },
      cron: {
        staleAfterHours: CRON_STALE_AFTER_MS / (60 * 60 * 1000),
        jobs: cronRuns.map((run) => ({
          name: run.name,
          lastRunAt: run.lastRunAt,
          status: run.status,
          processed: run.processed,
          error: run.error ?? null,
          stale: now - run.lastRunAt > CRON_STALE_AFTER_MS,
        })),
      },
      email: {
        failed24h: failedRecent.length,
        failed7d: failedWeek.length,
        sent24h: sentRecent.length,
        lastFailureAt: failedRecent[0]?.createdAt ?? null,
        recentFailures: failedRecent.slice(0, 5).map((event) => ({
          id: event._id,
          template: event.template,
          recipient: event.recipient,
          error: event.error ?? "Unknown error",
          createdAt: event.createdAt,
        })),
      },
      feedback: {
        open: openFeedback.length,
        oldestOpenAt: openFeedback[0]?.createdAt ?? null,
        oldestOpenId: openFeedback[0]?._id ?? null,
      },
      rateLimits: {
        rejected24h: rejections.length,
        buckets: bucketRows,
      },
      config: {
        resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
        resendFromAddressPresent: Boolean(process.env.RESEND_FROM_EMAIL),
        siteUrlPresent: Boolean(process.env.SITE_URL),
      },
      // Broadcast sending intentionally defaults off until the sending domain
      // is verified with Resend.
      broadcastSendingEnabled: false,
    };
  },
});
