"use node";

import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { sendMailtrapEmail } from "./mailtrap";

/**
 * Shared Mailtrap transport (T5.6).
 * Every send is logged to emailEvents so system health can report failures.
 * The API token is read inside the transport and never returned to callers.
 *
 * Lifecycle sends (BP-001) pass `registrationId`/`idempotencyKey`: those rows are
 * claimed and settled by the lifecycle dispatch itself, so this transport does
 * not write a second record for them.
 */

export type EmailTemplate =
  | "invite"
  | "announcement"
  | "registration_confirmation"
  | "reminder_24h"
  | "post_event_thankyou"
  | "feedback_request";

interface SendEmailArgs {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template: EmailTemplate;
  /** When set, the caller owns the delivery record (lifecycle dispatch). */
  idempotencyKey?: string;
}

export async function sendEmail(ctx: ActionCtx, args: SendEmailArgs) {
  const callerOwnsRecord = Boolean(args.idempotencyKey);

  let messageId: string | null;

  try {
    const result = await sendMailtrapEmail({
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      category: args.template,
      // Announcements belong on the bulk stream; everything else transactional.
      stream: args.template === "announcement" ? "bulk" : "transactional",
    });
    messageId = result.messageId;
  } catch (sendError) {
    const message =
      sendError instanceof Error ? sendError.message : "Unknown email error";

    if (!callerOwnsRecord) {
      await ctx.runMutation(internal.emailLog.recordEmailEvent, {
        template: args.template,
        recipient: args.to,
        status: "failed",
        error: message,
      });
    }

    throw new Error(message);
  }

  if (!callerOwnsRecord) {
    await ctx.runMutation(internal.emailLog.recordEmailEvent, {
      template: args.template,
      recipient: args.to,
      status: "sent",
    });
  }

  return { messageId };
}
