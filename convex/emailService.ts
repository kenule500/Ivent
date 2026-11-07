"use node";

import { Resend } from "resend";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

/**
 * Shared Resend transport (T5.6).
 * Every send is logged to emailEvents so system health can report failures.
 * The API key is read here and never returned to callers.
 */

export type EmailTemplate = "invite" | "announcement";

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template: EmailTemplate;
}

export async function sendEmail(ctx: ActionCtx, args: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await ctx.runMutation(internal.emailLog.recordEmailEvent, {
      template: args.template,
      recipient: args.to,
      status: "failed",
      error: "RESEND_API_KEY is not configured",
    });
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  let result;
  try {
    result = await resend.emails.send({
      from: fromEmail,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
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

  if (result.error) {
    await ctx.runMutation(internal.emailLog.recordEmailEvent, {
      template: args.template,
      recipient: args.to,
      status: "failed",
      error: result.error.message,
    });
    throw new Error(`Resend error: ${result.error.message}`);
  }

  await ctx.runMutation(internal.emailLog.recordEmailEvent, {
    template: args.template,
    recipient: args.to,
    status: "sent",
  });

  return { emailId: result.data?.id ?? null };
}
