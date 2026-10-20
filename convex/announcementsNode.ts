"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { sendEmail } from "./emailService";

/**
 * Node-runtime delivery for broadcast announcements (FR-028).
 * Batches keep Resend calls predictable; every outcome is recorded per
 * recipient and the announcement is finalised once all batches finish.
 */

const BATCH_SIZE = 20;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function announcementHtml(subject: string, body: string) {
  const safeBody = body
    .split("\n")
    .map((line) => `<p style="margin: 0 0 12px 0;">${escapeHtml(line)}</p>`)
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; margin: 0; padding: 32px 16px;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626; color: #d4d4d4;">
          <p style="color: #a855f7; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">Ivent announcement</p>
          <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 16px 0;">${escapeHtml(subject)}</h1>
          ${safeBody}
        </div>
      </body>
    </html>
  `;
}

export const deliver = internalAction({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const plan = await ctx.runQuery(internal.announcements.deliveryPlan, {
      announcementId: args.announcementId,
    });

    const html = announcementHtml(
      plan.announcement.subject,
      plan.announcement.body
    );

    for (let index = 0; index < plan.recipients.length; index += BATCH_SIZE) {
      const batch = plan.recipients.slice(index, index + BATCH_SIZE);

      await Promise.all(
        batch.map(async (recipient) => {
          try {
            await sendEmail(ctx, {
              to: recipient.email,
              subject: plan.announcement.subject,
              html,
              text: plan.announcement.body,
              template: "announcement",
            });
            await ctx.runMutation(internal.announcements.recordDelivery, {
              announcementId: args.announcementId,
              email: recipient.email,
              status: "sent",
            });
          } catch (error) {
            await ctx.runMutation(internal.announcements.recordDelivery, {
              announcementId: args.announcementId,
              email: recipient.email,
              status: "failed",
              error:
                error instanceof Error ? error.message : "Unknown delivery error",
            });
          }
        })
      );
    }

    await ctx.runMutation(internal.announcements.finalize, {
      announcementId: args.announcementId,
    });

    return { ok: true };
  },
});
