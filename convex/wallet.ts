import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { rateLimiter } from "./rateLimiter";

/**
 * Google Wallet pass actions (BP-007).
 *
 * The public surface is an action because Google issuance needs a Node runtime
 * to sign a JWT. Authorization and the wallet status write live in
 * `walletData.ts`, and the save link is returned to the ticket page.
 */

/**
 * Explicit result types break the inference cycle between this module and the
 * generated `internal` API. Without them TypeScript has to infer the action's
 * return type from `ctx.runAction(internal...)`, which in turn has to resolve
 * this module again.
 */
type WalletIssueResult =
  | { ok: true; objectId: string; saveUrl: string }
  | {
      ok: false;
      code: "rate_limited" | "cancelled" | "disabled";
      message: string;
    }
  | {
      ok: false;
      code: "not_configured" | "provider_error";
      message: string;
    };

type WalletVoidResult =
  | { ok: true }
  | { ok: false; code: "not_issued"; message: string }
  | { ok: false; code: "not_configured" | "provider_error"; message: string };

export const issueWalletPass = action({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args): Promise<WalletIssueResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated. Please sign in.");

    const budget = await rateLimiter.limit(ctx, "walletIssueRateLimit", {
      key: identity.tokenIdentifier,
    });
    if (!budget.ok) {
      return {
        ok: false as const,
        code: "rate_limited" as const,
        message: "Too many wallet requests. Try again shortly.",
      };
    }

    const context = await ctx.runQuery(internal.walletData.loadWalletContext, {
      registrationId: args.registrationId,
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!context) {
      throw new Error("Ticket not found.");
    }
    if (context.registration.status !== "confirmed") {
      return {
        ok: false as const,
        code: "cancelled" as const,
        message: "This registration is cancelled.",
      };
    }
    if (context.event.walletEnabled === false) {
      return {
        ok: false as const,
        code: "disabled" as const,
        message: "The organizer disabled Google Wallet for this event.",
      };
    }

    const result = await ctx.runAction(internal.walletNode.issueGooglePass, {
      eventId: context.event._id,
      registrationId: context.registration._id,
      eventTitle: context.event.title,
      eventLocation:
        context.event.locationType === "online"
          ? "Online event"
          : [context.event.venue, context.event.city, context.event.country]
              .filter(Boolean)
              .join(", "),
      eventStart: context.event.startDate,
      eventEnd: context.event.endDate,
      eventTimezone: context.event.timezone,
      eventLocale: context.event.locale === "fr" ? "fr" : "en",
      eventThemeColor: context.event.themeColor ?? "#1e3a8a",
      eventCurrency: context.event.currency ?? "USD",
      ticketPrice:
        context.event.ticketType === "paid" ? context.event.ticketPrice : undefined,
      attendeeName: context.registration.attendeeName,
      qrCode: context.registration.qrCode,
    });

    await ctx.runMutation(internal.walletData.saveWalletPass, {
      registrationId: args.registrationId,
      objectId: result.ok
        ? result.objectId
        : context.registration.wallet?.objectId ?? "",
      status: result.ok ? "active" : "error",
      message: result.ok ? undefined : result.message,
    });

    return result;
  },
});

export const voidWalletPass = action({
  args: {
    registrationId: v.id("registrations"),
  },
  handler: async (ctx, args): Promise<WalletVoidResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated. Please sign in.");

    const context = await ctx.runQuery(internal.walletData.loadWalletContext, {
      registrationId: args.registrationId,
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!context) throw new Error("Ticket not found.");

    const objectId = context.registration.wallet?.objectId;
    if (!objectId) {
      return {
        ok: false as const,
        code: "not_issued" as const,
        message: "This ticket has not been added to Google Wallet.",
      };
    }

    const result = await ctx.runAction(internal.walletNode.voidWalletPass, {
      objectId,
    });

    if (result.ok) {
      await ctx.runMutation(internal.walletData.saveWalletPass, {
        registrationId: args.registrationId,
        objectId,
        status: "voided",
      });
    }

    return result;
  },
});
