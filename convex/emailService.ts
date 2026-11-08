"use node";

import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { sendMailtrapEmail } from "./mailtrap";

/**
 * Shared Mailtrap transport (T5.6).
 * Every send is logged to emailEvents so system health can report failures.
 * The API token is read inside the transport and never returned to callers.
 */

export type EmailTemplate = "invite" | "announcement";

interface SendEmailArgs {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template: EmailTemplate;
}

export async function sendEmail(ctx: ActionCtx, args: SendEmailArgs) {
  let messageId: string | null;

  try {
    const result = await sendMailtrapEmail({
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      category: args.template,
      // Announcements belong on the bulk stream; invites stay transactional.
      stream: args.template === "announcement" ? "bulk" : "transactional",
    });
    messageId = result.messageId;
  } catch (sendError) {
    const message =
      sendError instanceof Error ? sendError.message : "Unknown email error";
    await ctx.runMutation(internal.emailLog.recordEmailEvent, {
      template: args.template,
      recipient: args.to,
      status: "failed",
      error: message,
    });
    throw new Error(message);
  }

  await ctx.runMutation(internal.emailLog.recordEmailEvent, {
    template: args.template,
    recipient: args.to,
    status: "sent",
  });

  return { messageId };
}
