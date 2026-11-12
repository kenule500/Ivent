"use node";

import { createSign } from "node:crypto";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { localeValidator } from "./validators";

/**
 * Google Wallet issuance (BP-007).
 *
 * This module runs in a Node action so it can sign the service-account JWT with
 * `node:crypto` and make the Google REST calls. No wallet credentials are
 * required for the rest of the platform; when they are absent the action
 * returns a typed `not_configured` result instead of breaking the ticket page.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1";
const WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

interface WalletConfig {
  issuerId: string;
  serviceAccountEmail: string;
  privateKey: string;
  siteUrl: string;
}

function readConfig(): WalletConfig | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  const serviceAccountEmail =
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  ).trim();
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";

  if (!issuerId || !serviceAccountEmail || !privateKey) return null;
  return { issuerId, serviceAccountEmail, privateKey, siteUrl };
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: Record<string, unknown>, privateKey: string) {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${body}`)
    .sign(privateKey, "base64url");

  return `${header}.${body}.${signature}`;
}

async function getAccessToken(config: WalletConfig) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    {
      iss: config.serviceAccountEmail,
      scope: WALLET_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    },
    config.privateKey
  );

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status}).`);
  }

  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error("Google token response did not include an access token.");
  }
  return body.access_token;
}

async function walletFetch(
  accessToken: string,
  path: string,
  method: "PUT" | "PATCH",
  body: unknown
) {
  const response = await fetch(`${WALLET_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Google Wallet ${method} ${path} failed (${response.status})${
        detail ? `: ${detail.slice(0, 300)}` : ""
      }.`
    );
  }

  return response.json().catch(() => null);
}

function classId(issuerId: string, eventId: string) {
  return `${issuerId}.ivent_event_${eventId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function objectId(issuerId: string, registrationId: string) {
  return `${issuerId}.ivent_registration_${registrationId.replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  )}`;
}

function defaultText(locale: "en" | "fr", value: string) {
  return {
    defaultValue: {
      language: locale,
      value,
    },
  };
}

export const issueGooglePass = internalAction({
  args: {
    eventId: v.string(),
    registrationId: v.string(),
    eventTitle: v.string(),
    eventLocation: v.string(),
    eventStart: v.number(),
    eventEnd: v.number(),
    eventTimezone: v.string(),
    eventLocale: localeValidator,
    eventThemeColor: v.string(),
    eventCurrency: v.string(),
    ticketPrice: v.optional(v.number()),
    attendeeName: v.string(),
    qrCode: v.string(),
  },
  handler: async (_ctx, args) => {
    const config = readConfig();
    if (!config) {
      return {
        ok: false as const,
        code: "not_configured" as const,
        message: "Google Wallet is not configured on this deployment.",
      };
    }

    try {
      const accessToken = await getAccessToken(config);
      const classIdValue = classId(config.issuerId, args.eventId);
      const objectIdValue = objectId(config.issuerId, args.registrationId);

      const eventName = defaultText(args.eventLocale, args.eventTitle);
      const venueName = defaultText(
        args.eventLocale,
        args.eventLocation || "Online event"
      );

      await walletFetch(
        accessToken,
        `/eventTicketClass/${encodeURIComponent(classIdValue)}`,
        "PUT",
        {
          id: classIdValue,
          issuerName: "Ivent",
          reviewStatus: "UNDER_REVIEW",
          eventName,
          venue: { name: venueName },
          dateTime: {
            start: new Date(args.eventStart).toISOString(),
            end: new Date(args.eventEnd).toISOString(),
          },
          hexBackgroundColor: args.eventThemeColor || "#1e3a8a",
          homepageUri: {
            uri: `${config.siteUrl}/my-tickets`,
            description: defaultText(args.eventLocale, "Open Ivent"),
          },
        }
      );

      await walletFetch(
        accessToken,
        `/eventTicketObject/${encodeURIComponent(objectIdValue)}`,
        "PUT",
        {
          id: objectIdValue,
          classId: classIdValue,
          state: "ACTIVE",
          ticketHolderName: args.attendeeName,
          eventName,
          venue: { name: venueName },
          barcode: {
            type: "QR_CODE",
            value: args.qrCode,
            alternateText: args.qrCode,
          },
          hexBackgroundColor: args.eventThemeColor || "#1e3a8a",
          textModulesData: [
            {
              id: "ticket_type",
              header: "Ticket",
              body:
                args.ticketPrice === undefined
                  ? "Free"
                  : `${args.eventCurrency} ${args.ticketPrice.toFixed(2)}`,
            },
          ],
        }
      );

      const saveJwt = signJwt(
        {
          iss: config.serviceAccountEmail,
          aud: "google",
          typ: "savetowallet",
          iat: Math.floor(Date.now() / 1000),
          origins: [config.siteUrl],
          payload: {
            eventTicketObjects: [{ id: objectIdValue }],
          },
        },
        config.privateKey
      );

      return {
        ok: true as const,
        objectId: objectIdValue,
        saveUrl: `https://pay.google.com/gp/v/save/${saveJwt}`,
      };
    } catch (error) {
      return {
        ok: false as const,
        code: "provider_error" as const,
        message:
          error instanceof Error
            ? error.message
            : "Google Wallet issuance failed.",
      };
    }
  },
});

export const voidWalletPass = internalAction({
  args: {
    objectId: v.string(),
  },
  handler: async (_ctx, args) => {
    const config = readConfig();
    if (!config) {
      return {
        ok: false as const,
        code: "not_configured" as const,
        message: "Google Wallet is not configured on this deployment.",
      };
    }

    try {
      const accessToken = await getAccessToken(config);
      await walletFetch(
        accessToken,
        `/eventTicketObject/${encodeURIComponent(args.objectId)}`,
        "PATCH",
        { state: "VOIDED" }
      );
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        code: "provider_error" as const,
        message:
          error instanceof Error
            ? error.message
            : "Google Wallet void failed.",
      };
    }
  },
});
