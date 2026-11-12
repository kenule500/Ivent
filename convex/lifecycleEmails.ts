"use node";

import { v } from "convex/values";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { sendEmail } from "./emailService";
import {
  formatLifecycleDate,
  isTransactional,
  lifecycleKey,
  lifecycleTemplateValidator,
  renderLifecycleEmail,
} from "./lifecycleTemplates";

/**
 * Lifecycle dispatch (FR-002, FR-005, FR-006).
 *
 * Order matters: the idempotency row is claimed *before* the provider call, so a
 * crash or a repeated sweep cannot send the same email twice. The claimed row is
 * then settled with its outcome rather than inserted again.
 *
 * The confirmation template is transactional and survives an opt-out; reminders
 * and follow-ups honour it (NFR-001).
 */
export const sendLifecycleEmail = internalAction({
  args: {
    registrationId: v.id("registrations"),
    template: lifecycleTemplateValidator,
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.lifecycleSweeps.loadContext, {
      registrationId: args.registrationId,
      template: args.template,
    });

    if (!context) return { status: "skipped" as const, reason: "registration gone" };

    if (!isTransactional(args.template) && context.emailOptOut) {
      return { status: "skipped" as const, reason: "opted out" };
    }

    const key = lifecycleKey(args.registrationId, args.template);

    const claimed = await ctx.runMutation(internal.emailLog.claimLifecycleSend, {
      registrationId: args.registrationId,
      template: args.template,
      idempotencyKey: key,
      recipient: context.attendeeEmail,
    });

    if (!claimed) return { status: "duplicate" as const };

    const siteUrl = process.env.SITE_URL || "http://localhost:3000";
    const locale = context.locale === "fr" ? "fr" : "en";
    const rendered = renderLifecycleEmail(args.template, {
      attendeeName: context.attendeeName,
      eventTitle: context.eventTitle,
      eventDate: formatLifecycleDate(
        context.eventStart,
        context.eventEnd,
        context.eventTimezone,
        locale
      ),
      eventLocation: context.eventLocation,
      ticketCode: context.ticketCode,
      ticketUrl: `${siteUrl}/my-tickets`,
      feedbackUrl: `${siteUrl}/feedback?event=${encodeURIComponent(context.eventSlug)}`,
      locale,
      emailOptOut: context.emailOptOut,
    });

    try {
      await sendEmail(ctx, {
        to: context.attendeeEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        template: args.template,
        idempotencyKey: key,
      });

      await ctx.runMutation(internal.emailLog.settleLifecycleSend, {
        idempotencyKey: key,
        status: "sent",
      });

      return { status: "sent" as const };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown email error";

      await ctx.runMutation(internal.emailLog.settleLifecycleSend, {
        idempotencyKey: key,
        status: "failed",
        error: message,
      });

      // Never rethrow into a caller: the failure is recorded and visible.
      return { status: "failed" as const, error: message };
    }
  },
});
