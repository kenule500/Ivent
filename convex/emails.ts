"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Resend } from "resend";

/**
 * Send an admin invite email.
 * Called from the frontend after generating an invite.
 */
export const sendInviteEmail = action({
  args: {
    email: v.string(),
    inviteCode: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(apiKey);

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const siteUrl = process.env.SITE_URL || "http://localhost:3000";

    const inviteUrl = `${siteUrl}/admin/signup?code=${args.inviteCode}&email=${encodeURIComponent(args.email)}`;

    const expiryDate = new Date(args.expiresAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let result;
    try {
      result = await resend.emails.send({
      from: fromEmail,
      to: args.email,
      subject: "You've been invited as an admin to Ivent",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 40px; border: 1px solid #262626;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #a855f7, #ec4899); border-radius: 16px; line-height: 64px;">
                  <span style="color: white; font-size: 32px;">🛡️</span>
                </div>
              </div>

              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
                Admin Invitation
              </h1>

              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                You've been invited to join the <strong style="color: #ffffff;">Ivent</strong> admin team. Click the button below to accept your invitation and set up your admin account.
              </p>

              <div style="background-color: #0a0a0a; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px dashed #404040;">
                <p style="color: #a3a3a3; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  Your Invite Code
                </p>
                <code style="color: #a855f7; font-size: 16px; font-family: 'Courier New', monospace; word-break: break-all;">
                  ${args.inviteCode}
                </code>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #a855f7, #ec4899); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>

              <div style="border-top: 1px solid #262626; padding-top: 24px; margin-top: 24px;">
                <p style="color: #737373; font-size: 14px; margin: 0 0 8px 0;">
                  <strong style="color: #a3a3a3;">Expires:</strong> ${expiryDate}
                </p>
                <p style="color: #737373; font-size: 12px; margin: 0; line-height: 1.5;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </div>

            <p style="color: #525252; font-size: 12px; text-align: center; margin-top: 24px;">
              © ${new Date().getFullYear()} Ivent. All rights reserved.
            </p>
          </body>
        </html>
      `,
      });
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Unknown email error";
      await ctx.runMutation(internal.emailLog.recordEmailEvent, {
        template: "invite",
        recipient: args.email,
        status: "failed",
        error: message,
      });
      throw sendError;
    }

    if (result.error) {
      await ctx.runMutation(internal.emailLog.recordEmailEvent, {
        template: "invite",
        recipient: args.email,
        status: "failed",
        error: result.error.message,
      });
      throw new Error(`Resend error: ${result.error.message}`);
    }

    await ctx.runMutation(internal.emailLog.recordEmailEvent, {
      template: "invite",
      recipient: args.email,
      status: "sent",
    });

    return { success: true, emailId: result.data?.id };
  },
});