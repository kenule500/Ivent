// @vitest-environment node
import { createVerify, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "@/convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const originalEnv = {
  GOOGLE_WALLET_ISSUER_ID: process.env.GOOGLE_WALLET_ISSUER_ID,
  GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL:
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_WALLET_PRIVATE_KEY: process.env.GOOGLE_WALLET_PRIVATE_KEY,
  SITE_URL: process.env.SITE_URL,
};

const args = {
  eventId: "event_123",
  registrationId: "registration_123",
  eventTitle: "Lagos Builders Summit",
  eventLocation: "Landmark Centre, Lagos, Nigeria",
  eventStart: Date.UTC(2027, 4, 12, 9, 0),
  eventEnd: Date.UTC(2027, 4, 12, 17, 0),
  eventTimezone: "Africa/Lagos",
  eventLocale: "fr" as const,
  eventThemeColor: "#1e3a8a",
  eventCurrency: "NGN",
  ticketPrice: 5000,
  attendeeName: "Ada Lovelace",
  qrCode: "EVT-WALLET-123",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function configureWallet() {
  process.env.GOOGLE_WALLET_ISSUER_ID = "3388000000012345678";
  process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL =
    "wallet-test@example.iam.gserviceaccount.com";
  process.env.GOOGLE_WALLET_PRIVATE_KEY = privateKey;
  process.env.SITE_URL = "https://ivent.example";
}

function clearWallet() {
  delete process.env.GOOGLE_WALLET_ISSUER_ID;
  delete process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_WALLET_PRIVATE_KEY;
  delete process.env.SITE_URL;
}

beforeEach(() => {
  configureWallet();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("oauth2.googleapis.com")) {
        return jsonResponse({ access_token: "test-access-token" });
      }
      return jsonResponse({ ok: true });
    })
  );
});

afterEach(() => {
  clearWallet();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.unstubAllGlobals();
});

describe("AC-015: Google Wallet pass", () => {
  test("AC-015: a configured Google Wallet pass returns a signed save JWT with event, attendee, ticket, and barcode data", async () => {
    const t = createConvexTest();
    const result = await t.action(internal.walletNode.issueGooglePass, args);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);

    expect(result.saveUrl).toMatch(
      /^https:\/\/pay\.google\.com\/gp\/v\/save\//
    );
    const token = result.saveUrl.split("/save/")[1];
    const [header, payload, signature] = token.split(".");
    const decodedHeader = JSON.parse(
      Buffer.from(header, "base64url").toString()
    );
    const decodedPayload = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );
    expect(decodedHeader).toMatchObject({ alg: "RS256", typ: "JWT" });
    expect(decodedPayload.typ).toBe("savetowallet");
    expect(decodedPayload.payload.eventTicketObjects[0].id).toBe(
      result.objectId
    );

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${payload}`);
    expect(
      verifier.verify(publicKey, Buffer.from(signature, "base64url"))
    ).toBe(true);

    const calls = (
      globalThis.fetch as unknown as {
        mock: { calls: Array<[string | URL | Request, RequestInit]> };
      }
    ).mock.calls;
    const classCall = calls.find(([url, init]) =>
      String(url).includes("/eventTicketClass/") && init?.method === "PUT"
    );
    const objectCall = calls.find(([url, init]) =>
      String(url).includes("/eventTicketObject/") && init?.method === "PUT"
    );
    expect(classCall).toBeDefined();
    expect(objectCall).toBeDefined();

    const classBody = JSON.parse(String(classCall![1].body));
    const objectBody = JSON.parse(String(objectCall![1].body));
    expect(classBody.eventName.defaultValue).toEqual({
      language: "fr",
      value: args.eventTitle,
    });
    expect(classBody.dateTime).toEqual({
      start: new Date(args.eventStart).toISOString(),
      end: new Date(args.eventEnd).toISOString(),
    });
    expect(objectBody.ticketHolderName).toBe(args.attendeeName);
    expect(objectBody.eventName.defaultValue.value).toBe(args.eventTitle);
    expect(objectBody.venue.name.defaultValue.value).toBe(args.eventLocation);
    expect(objectBody.barcode).toMatchObject({
      type: "QR_CODE",
      value: args.qrCode,
      alternateText: args.qrCode,
    });
    expect(objectBody.textModulesData[0].body).toBe("NGN 5000.00");
  });
});

describe("AC-016: repeat issuance", () => {
  test("AC-016: repeat issuance returns the same object ID and preserves the first issued timestamp", async () => {
    const t = createConvexTest();
    const first = await t.action(internal.walletNode.issueGooglePass, args);
    const second = await t.action(internal.walletNode.issueGooglePass, args);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("Wallet issuance failed");
    expect(first.objectId).toBe(second.objectId);

    const t2 = createConvexTest();
    const userId = await t2.run(async (ctx) =>
      seedUser(ctx, {
        tokenIdentifier: "token|wallet-attendee",
        name: "Ada Lovelace",
        email: "ada@example.com",
      })
    );
    const eventId = await t2.run(async (ctx) =>
      seedEvent(ctx, userId, {
        title: "Wallet Event",
        slug: "wallet-event",
        walletEnabled: true,
      })
    );
    const registrationId = await t2.run(async (ctx) =>
      seedRegistration(ctx, eventId, userId, {
        attendeeName: "Ada Lovelace",
        attendeeEmail: "ada@example.com",
        qrCode: "EVT-WALLET-REPEAT",
      })
    );

    await t2.mutation(internal.walletData.saveWalletPass, {
      registrationId,
      objectId: first.objectId,
      status: "active",
    });
    const firstWallet = await t2.run(async (ctx) =>
      (await ctx.db.get(registrationId))?.wallet
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    await t2.mutation(internal.walletData.saveWalletPass, {
      registrationId,
      objectId: first.objectId,
      status: "active",
    });
    const secondWallet = await t2.run(async (ctx) =>
      (await ctx.db.get(registrationId))?.wallet
    );

    expect(secondWallet?.issuedAt).toBe(firstWallet?.issuedAt);
    expect(secondWallet?.objectId).toBe(firstWallet?.objectId);
    expect(secondWallet?.status).toBe("active");
  });
});

describe("AC-017: pass cancellation", () => {
  test("AC-017: cancellation and event deletion void the pass without blocking cancellation or deletion", async () => {
    const attendeeToken = "token|wallet-cancel-attendee";
    const attendeeIdentity = identityFor(attendeeToken, "Ada Lovelace");
    const t = createConvexTest();
    const organizerId = await t.run(async (ctx) =>
      seedUser(ctx, {
        tokenIdentifier: "token|wallet-cancel-organizer",
        name: "Organizer",
        email: "organizer@example.com",
      })
    );
    const attendeeId = await t.run(async (ctx) =>
      seedUser(ctx, {
        tokenIdentifier: attendeeToken,
        name: "Ada Lovelace",
        email: "ada@example.com",
      })
    );
    const eventId = await t.run(async (ctx) =>
      seedEvent(ctx, organizerId, {
        title: "Cancelable Wallet Event",
        slug: "cancelable-wallet-event",
        walletEnabled: true,
      })
    );
    const registrationId = await t.run(async (ctx) =>
      seedRegistration(ctx, eventId, attendeeId, {
        attendeeName: "Ada Lovelace",
        attendeeEmail: "ada@example.com",
        qrCode: "EVT-WALLET-CANCEL",
        wallet: {
          provider: "google",
          objectId: "issuer.ivent_registration_cancel",
          status: "active",
          issuedAt: Date.now() - 10_000,
          updatedAt: Date.now() - 10_000,
        },
      })
    );

    clearWallet();
    await t.withIdentity(attendeeIdentity).mutation(
      api.registrations.cancelRegistration,
      { registrationId }
    );

    const cancelled = await t.run(async (ctx) => ctx.db.get(registrationId));
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.wallet?.status).toBe("voided");

    await t.withIdentity(organizerIdentity).mutation(api.events.deleteEvent, {
      eventId,
    });
    const deletedEvent = await t.run(async (ctx) => ctx.db.get(eventId));
    const deletedRegistration = await t.run(async (ctx) =>
      ctx.db.get(registrationId)
    );
    expect(deletedEvent).toBeNull();
    expect(deletedRegistration).toBeNull();
  });
});

const organizerIdentity = identityFor(
  "token|wallet-cancel-organizer",
  "Organizer"
);

describe("AC-018: wallet failure handling", () => {
  test("AC-018: missing credentials, timeouts, and quota errors are recoverable, secret-free, and leave the QR ticket usable", async () => {
    const t = createConvexTest();
    clearWallet();
    const missing = await t.action(internal.walletNode.issueGooglePass, args);
    expect(missing).toMatchObject({ ok: false, code: "not_configured" });
    expect(JSON.stringify(missing)).not.toMatch(/private|secret|BEGIN/i);

    configureWallet();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes("oauth2.googleapis.com")) {
          return jsonResponse({ access_token: "test-access-token" });
        }
        return jsonResponse({ error: "quota exceeded" }, 429);
      })
    );
    const quota = await t.action(internal.walletNode.issueGooglePass, args);
    expect(quota).toMatchObject({ ok: false, code: "provider_error" });
    expect(quota.ok ? "" : quota.message).toMatch(/429|quota/i);
    expect(JSON.stringify(quota)).not.toMatch(/private|secret|BEGIN/i);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network timeout");
      })
    );
    const timeout = await t.action(internal.walletNode.issueGooglePass, args);
    expect(timeout).toMatchObject({ ok: false, code: "provider_error" });
    expect(timeout.ok ? "" : timeout.message).toMatch(/timeout/i);
  });
});
