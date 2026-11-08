import { describe, expect, test, vi } from "vitest";
import {
  MAILTRAP_BULK_ENDPOINT,
  MAILTRAP_SANDBOX_ENDPOINT,
  MAILTRAP_SENDING_ENDPOINT,
  buildMailtrapPayload,
  resolveMailtrapConfig,
  selectMailtrapRoute,
  sendMailtrapEmail,
} from "../../convex/mailtrap";

const liveEnv = {
  MAILTRAP_API_KEY: "mt-token",
  MAILTRAP_FROM_EMAIL: "no-reply@ivent.test",
};

const bulkEnv = {
  ...liveEnv,
  MAILTRAP_BULK_API_KEY: "mt-bulk-token",
};

const email = {
  to: "recipient@example.com",
  subject: "You've been invited",
  html: "<p>Hello</p>",
  text: "Hello",
  category: "invite",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Mailtrap transport", () => {
  test("resolves live sending configuration and defaults the sender name", () => {
    const resolved = resolveMailtrapConfig(liveEnv);

    expect(resolved).toEqual({
      ok: true,
      config: {
        apiToken: "mt-token",
        bulkApiToken: null,
        fromEmail: "no-reply@ivent.test",
        fromName: "Ivent",
        sandbox: false,
        inboxId: null,
      },
    });

    if (!resolved.ok) throw new Error("expected a resolved config");
    expect(selectMailtrapRoute(resolved.config)).toEqual({
      endpoint: `${MAILTRAP_SENDING_ENDPOINT}/api/send`,
      token: "mt-token",
      stream: "transactional",
    });
  });

  test("sandbox mode routes to the test inbox and demands its id", () => {
    const missingInbox = resolveMailtrapConfig({
      ...liveEnv,
      MAILTRAP_USE_SANDBOX: "true",
    });
    expect(missingInbox).toEqual({
      ok: false,
      error:
        "MAILTRAP_INBOX_ID is required when MAILTRAP_USE_SANDBOX is enabled",
    });

    const resolved = resolveMailtrapConfig({
      ...liveEnv,
      MAILTRAP_USE_SANDBOX: "true",
      MAILTRAP_INBOX_ID: " 123456 ",
      MAILTRAP_FROM_NAME: "Ivent Events",
    });
    if (!resolved.ok) throw new Error("expected a resolved config");

    expect(resolved.config.sandbox).toBe(true);
    expect(resolved.config.inboxId).toBe("123456");
    expect(resolved.config.fromName).toBe("Ivent Events");
    expect(selectMailtrapRoute(resolved.config)).toEqual({
      endpoint: `${MAILTRAP_SANDBOX_ENDPOINT}/api/send/123456`,
      token: "mt-token",
      stream: "sandbox",
    });
  });

  test("bulk is opt-in per token and sandbox always wins over it", () => {
    const withBulk = resolveMailtrapConfig(bulkEnv);
    if (!withBulk.ok) throw new Error("expected a resolved config");

    expect(withBulk.config.bulkApiToken).toBe("mt-bulk-token");
    expect(selectMailtrapRoute(withBulk.config, "bulk")).toEqual({
      endpoint: `${MAILTRAP_BULK_ENDPOINT}/api/send`,
      token: "mt-bulk-token",
      stream: "bulk",
    });
    // Invites keep using the transactional stream even when bulk exists.
    expect(selectMailtrapRoute(withBulk.config, "transactional")).toEqual({
      endpoint: `${MAILTRAP_SENDING_ENDPOINT}/api/send`,
      token: "mt-token",
      stream: "transactional",
    });

    // Announcements asked for bulk but no bulk token is configured: fall back
    // to a send that still works rather than failing the broadcast.
    const withoutBulk = resolveMailtrapConfig(liveEnv);
    if (!withoutBulk.ok) throw new Error("expected a resolved config");
    expect(selectMailtrapRoute(withoutBulk.config, "bulk")).toEqual({
      endpoint: `${MAILTRAP_SENDING_ENDPOINT}/api/send`,
      token: "mt-token",
      stream: "transactional",
    });

    // Mailtrap rejects bulk sends to a test inbox, so sandbox mode overrides it.
    const sandboxWithBulk = resolveMailtrapConfig({
      ...bulkEnv,
      MAILTRAP_USE_SANDBOX: "true",
      MAILTRAP_INBOX_ID: "42",
    });
    if (!sandboxWithBulk.ok) throw new Error("expected a resolved config");
    expect(selectMailtrapRoute(sandboxWithBulk.config, "bulk")).toEqual({
      endpoint: `${MAILTRAP_SANDBOX_ENDPOINT}/api/send/42`,
      token: "mt-token",
      stream: "sandbox",
    });
  });

  test("rejects a missing token, a malformed sender, and a non-numeric inbox", () => {
    expect(
      resolveMailtrapConfig({ ...liveEnv, MAILTRAP_API_KEY: "  " })
    ).toEqual({ ok: false, error: "MAILTRAP_API_KEY is not configured" });

    expect(
      resolveMailtrapConfig({ ...liveEnv, MAILTRAP_FROM_EMAIL: "not-an-email" })
    ).toEqual({
      ok: false,
      error: "MAILTRAP_FROM_EMAIL is not a valid email address: not-an-email",
    });

    expect(
      resolveMailtrapConfig({
        ...liveEnv,
        MAILTRAP_USE_SANDBOX: "true",
        MAILTRAP_INBOX_ID: "inbox-one",
      })
    ).toEqual({ ok: false, error: "MAILTRAP_INBOX_ID must be numeric" });
  });

  test("builds the documented send payload and omits absent content", () => {
    const resolved = resolveMailtrapConfig(liveEnv);
    if (!resolved.ok) throw new Error("expected a resolved config");

    expect(buildMailtrapPayload(resolved.config, email)).toEqual({
      from: { email: "no-reply@ivent.test", name: "Ivent" },
      to: [{ email: "recipient@example.com" }],
      subject: "You've been invited",
      html: "<p>Hello</p>",
      text: "Hello",
      category: "invite",
    });

    expect(
      buildMailtrapPayload(resolved.config, {
        to: "recipient@example.com",
        subject: "Text only",
        text: "Plain body",
      })
    ).toEqual({
      from: { email: "no-reply@ivent.test", name: "Ivent" },
      to: [{ email: "recipient@example.com" }],
      subject: "Text only",
      text: "Plain body",
    });

    expect(() =>
      buildMailtrapPayload(resolved.config, {
        to: "recipient@example.com",
        subject: "Empty",
      })
    ).toThrow(/requires an html or text body/i);
  });

  test("POSTs to Mailtrap with a bearer token and returns the message id", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: true, message_ids: ["msg-1"] })
    );

    const result = await sendMailtrapEmail(email, {
      env: liveEnv,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result).toEqual({ messageId: "msg-1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${MAILTRAP_SENDING_ENDPOINT}/api/send`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer mt-token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual(
      buildMailtrapPayload(resolvedLiveConfig(), email)
    );
  });

  test("announcements post to the Bulk stream with the bulk token", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: true, message_ids: ["msg-bulk"] })
    );

    const result = await sendMailtrapEmail(
      { ...email, category: "announcement", stream: "bulk" },
      { env: bulkEnv, fetchImpl: fetchMock as unknown as typeof fetch }
    );

    expect(result).toEqual({ messageId: "msg-bulk" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${MAILTRAP_BULK_ENDPOINT}/api/send`);
    expect(init.headers).toMatchObject({
      Authorization: "Bearer mt-bulk-token",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      category: "announcement",
    });
  });

  test("surfaces the provider error text instead of a generic failure", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          success: false,
          errors: ["The from address is not verified for this domain"],
        },
        422
      )
    );

    await expect(
      sendMailtrapEmail(email, {
        env: liveEnv,
        fetchImpl: fetchMock as unknown as typeof fetch,
      })
    ).rejects.toThrow(
      /Mailtrap responded 422: The from address is not verified for this domain/
    );
  });

  test("fails before any request when the token is missing", async () => {
    const fetchMock = vi.fn();

    await expect(
      sendMailtrapEmail(email, {
        env: {},
        fetchImpl: fetchMock as unknown as typeof fetch,
      })
    ).rejects.toThrow("MAILTRAP_API_KEY is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function resolvedLiveConfig() {
  const resolved = resolveMailtrapConfig(liveEnv);
  if (!resolved.ok) throw new Error("expected a resolved config");
  return resolved.config;
}
