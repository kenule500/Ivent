/**
 * Mailtrap transport (Email Sending API v1, with optional Email Testing sandbox).
 *
 * The app only needs a single POST of a JSON body, so this module speaks the
 * Mailtrap HTTP API directly rather than pulling in the official SDK: the Convex
 * Node action stays dependency-free and every provider error is surfaced
 * verbatim to the email log.
 *
 * Two sending streams exist:
 *   - transactional — invites, anything one-to-one
 *   - bulk          — announcements, opt-in via MAILTRAP_BULK_API_KEY
 *
 * Configuration is read from the environment on every send, so rotating a
 * token or flipping sandbox mode is a deployment-variable change only:
 *
 *   MAILTRAP_API_KEY       - Email Sending API token (required)
 *   MAILTRAP_BULK_API_KEY  - bulk-stream token; when set, announcements use it
 *   MAILTRAP_FROM_EMAIL    - sender on a verified sending domain (required)
 *   MAILTRAP_FROM_NAME     - sender display name (defaults to "Ivent")
 *   MAILTRAP_USE_SANDBOX   - "true" routes mail to an Email Testing inbox
 *   MAILTRAP_INBOX_ID      - inbox id, required when sandbox mode is on
 */

export const MAILTRAP_SENDING_ENDPOINT = "https://send.api.mailtrap.io";
export const MAILTRAP_BULK_ENDPOINT = "https://bulk.api.mailtrap.io";
export const MAILTRAP_SANDBOX_ENDPOINT = "https://sandbox.api.mailtrap.io";
export const MAILTRAP_REQUEST_TIMEOUT_MS = 10_000;

const DEFAULT_FROM_NAME = "Ivent";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INBOX_ID_PATTERN = /^\d+$/;

export type MailtrapEnv = Record<string, string | undefined>;

/** Where a message is sent from, once sandbox and token availability are known. */
export type MailtrapStream = "transactional" | "bulk";
export type MailtrapRouteName = MailtrapStream | "sandbox";

export interface MailtrapConfig {
  apiToken: string;
  bulkApiToken: string | null;
  fromEmail: string;
  fromName: string;
  sandbox: boolean;
  inboxId: string | null;
}

export type MailtrapConfigResult =
  | { ok: true; config: MailtrapConfig }
  | { ok: false; error: string };

export interface MailtrapRoute {
  endpoint: string;
  token: string;
  stream: MailtrapRouteName;
}

export interface OutboundEmail {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  /** Mailtrap category, surfaced in sending stats and email logs. */
  category?: string;
  /** Preferred stream; bulk is only honoured when a bulk token exists. */
  stream?: MailtrapStream;
}

export interface MailtrapPayload {
  from: { email: string; name: string };
  to: Array<{ email: string }>;
  subject: string;
  html?: string;
  text?: string;
  category?: string;
}

export interface SendMailtrapOptions {
  env?: MailtrapEnv;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function readEnv(env: MailtrapEnv, key: string): string {
  return env[key]?.trim() ?? "";
}

/** Sandbox mode is opt-in; anything other than an explicit truthy value is live. */
export function isSandboxEnabled(env: MailtrapEnv = process.env): boolean {
  const value = readEnv(env, "MAILTRAP_USE_SANDBOX").toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

/**
 * Resolve the transport configuration, or explain exactly which variable is
 * missing so the failure lands in the email log instead of a silent drop.
 */
export function resolveMailtrapConfig(
  env: MailtrapEnv = process.env
): MailtrapConfigResult {
  const apiToken = readEnv(env, "MAILTRAP_API_KEY");
  if (!apiToken) {
    return { ok: false, error: "MAILTRAP_API_KEY is not configured" };
  }

  const fromEmail = readEnv(env, "MAILTRAP_FROM_EMAIL");
  if (!fromEmail) {
    return { ok: false, error: "MAILTRAP_FROM_EMAIL is not configured" };
  }
  if (!EMAIL_PATTERN.test(fromEmail)) {
    return {
      ok: false,
      error: `MAILTRAP_FROM_EMAIL is not a valid email address: ${fromEmail}`,
    };
  }

  const sandbox = isSandboxEnabled(env);
  const inboxId = readEnv(env, "MAILTRAP_INBOX_ID");

  if (sandbox && !inboxId) {
    return {
      ok: false,
      error: "MAILTRAP_INBOX_ID is required when MAILTRAP_USE_SANDBOX is enabled",
    };
  }
  if (inboxId && !INBOX_ID_PATTERN.test(inboxId)) {
    return { ok: false, error: "MAILTRAP_INBOX_ID must be numeric" };
  }

  return {
    ok: true,
    config: {
      apiToken,
      bulkApiToken: readEnv(env, "MAILTRAP_BULK_API_KEY") || null,
      fromEmail,
      fromName: readEnv(env, "MAILTRAP_FROM_NAME") || DEFAULT_FROM_NAME,
      sandbox,
      inboxId: inboxId || null,
    },
  };
}

/**
 * Pick the endpoint and token for a message.
 *
 * Sandbox wins over everything (Mailtrap rejects bulk sends to a sandbox inbox),
 * bulk is used only when the caller asked for it *and* a bulk token is
 * configured, and transactional is the fallback so a missing bulk token degrades
 * to a working send rather than a failed one.
 */
export function selectMailtrapRoute(
  config: MailtrapConfig,
  requested: MailtrapStream = "transactional"
): MailtrapRoute {
  if (config.sandbox && config.inboxId) {
    return {
      endpoint: `${MAILTRAP_SANDBOX_ENDPOINT}/api/send/${config.inboxId}`,
      token: config.apiToken,
      stream: "sandbox",
    };
  }

  if (requested === "bulk" && config.bulkApiToken) {
    return {
      endpoint: `${MAILTRAP_BULK_ENDPOINT}/api/send`,
      token: config.bulkApiToken,
      stream: "bulk",
    };
  }

  return {
    endpoint: `${MAILTRAP_SENDING_ENDPOINT}/api/send`,
    token: config.apiToken,
    stream: "transactional",
  };
}

export function buildMailtrapPayload(
  config: MailtrapConfig,
  email: OutboundEmail
): MailtrapPayload {
  if (!email.html && !email.text) {
    throw new Error("Mailtrap requires an html or text body");
  }

  return {
    from: { email: config.fromEmail, name: config.fromName },
    to: [{ email: email.to }],
    subject: email.subject,
    ...(email.html ? { html: email.html } : {}),
    ...(email.text ? { text: email.text } : {}),
    ...(email.category ? { category: email.category } : {}),
  };
}

/** Mailtrap answers errors as `{ success: false, errors: [...] }`. */
function describeFailure(status: number, body: string): string {
  const detail = extractDetail(body);
  return status > 0
    ? `Mailtrap responded ${status}: ${detail}`
    : `Mailtrap request failed: ${detail}`;
}

function extractDetail(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "empty response body";

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      if (Array.isArray(record.errors) && record.errors.length > 0) {
        return record.errors.map((item) => String(item)).join("; ");
      }
      if (typeof record.error === "string" && record.error) return record.error;
      if (typeof record.message === "string" && record.message) {
        return record.message;
      }
    }
  } catch {
    // Not JSON: fall through to the raw body.
  }

  return trimmed.slice(0, 500);
}

function readMessageId(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { message_ids?: unknown };
    if (Array.isArray(parsed.message_ids)) {
      const [first] = parsed.message_ids;
      return typeof first === "string" ? first : null;
    }
  } catch {
    // A 2xx with a non-JSON body still counts as sent; it just has no id.
  }
  return null;
}

/**
 * Send one email through Mailtrap and return its message id.
 * Throws an Error whose message is safe to persist in the email log.
 */
export async function sendMailtrapEmail(
  email: OutboundEmail,
  options: SendMailtrapOptions = {}
): Promise<{ messageId: string | null }> {
  const resolved = resolveMailtrapConfig(options.env ?? process.env);
  if (!resolved.ok) throw new Error(resolved.error);

  const config = resolved.config;
  const payload = buildMailtrapPayload(config, email);
  const route = selectMailtrapRoute(config, email.stream ?? "transactional");
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? MAILTRAP_REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(route.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${route.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    const message = controller.signal.aborted
      ? `Mailtrap request timed out after ${timeoutMs}ms`
      : `Mailtrap request failed: ${
          error instanceof Error ? error.message : "unknown network error"
        }`;
    throw new Error(message);
  } finally {
    clearTimeout(timer);
  }

  // Read the body once: Mailtrap reports provider errors inside it.
  let body = "";
  try {
    body = await response.text();
  } catch {
    body = "";
  }

  if (!response.ok) {
    throw new Error(describeFailure(response.status, body));
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Unparseable 2xx body: Mailtrap still accepted the send, so keep going.
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    (parsed as { success?: unknown }).success === false
  ) {
    throw new Error(describeFailure(0, body));
  }

  return { messageId: readMessageId(body) };
}
