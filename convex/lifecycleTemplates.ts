import { v } from "convex/values";

/**
 * Lifecycle email templates (FR-001, FR-009).
 *
 * One registry, one renderer. Every interpolated value is escaped here, and the
 * renderer only ever receives a single registration's context, so one
 * attendee's data cannot appear in another's message (NFR-003).
 */

export const LIFECYCLE_TEMPLATES = [
  "registration_confirmation",
  "reminder_24h",
  "post_event_thankyou",
  "feedback_request",
] as const;

export type LifecycleTemplate = (typeof LIFECYCLE_TEMPLATES)[number];

export const lifecycleTemplateValidator = v.union(
  v.literal("registration_confirmation"),
  v.literal("reminder_24h"),
  v.literal("post_event_thankyou"),
  v.literal("feedback_request")
);

/** Only the confirmation is transactional: an opt-out cannot suppress it. */
const TRANSACTIONAL_TEMPLATES: ReadonlySet<LifecycleTemplate> = new Set([
  "registration_confirmation",
]);

export function isTransactional(template: LifecycleTemplate): boolean {
  return TRANSACTIONAL_TEMPLATES.has(template);
}

/** Idempotency key: one lifecycle email per registration per template. */
export function lifecycleKey(
  registrationId: string,
  template: LifecycleTemplate
): string {
  return `${registrationId}:${template}`;
}

export interface LifecycleContext {
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  ticketCode: string;
  ticketUrl: string;
  feedbackUrl: string;
  /** Set when the attendee has opted out of optional email. */
  emailOptOut: boolean;
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface TemplateDefinition {
  subject: (context: LifecycleContext) => string;
  body: (context: LifecycleContext) => string;
  text: (context: LifecycleContext) => string;
}

const templates: Record<LifecycleTemplate, TemplateDefinition> = {
  registration_confirmation: {
    subject: (c) => `You're registered for ${c.eventTitle}`,
    body: (c) =>
      `<p>Hi ${c.attendeeName},</p>` +
      `<p>Your registration for <strong>${c.eventTitle}</strong> is confirmed.</p>` +
      `<p>${c.eventDate}${c.eventLocation ? ` &middot; ${c.eventLocation}` : ""}</p>` +
      `<p>Your ticket code is <strong>${c.ticketCode}</strong>.</p>` +
      `<p><a href="${c.ticketUrl}">View your ticket</a></p>`,
    text: (c) =>
      `Hi ${c.attendeeName},\n\nYour registration for ${c.eventTitle} is confirmed.\n` +
      `${c.eventDate}${c.eventLocation ? ` - ${c.eventLocation}` : ""}\n` +
      `Ticket code: ${c.ticketCode}\n\nView your ticket: ${c.ticketUrl}`,
  },
  reminder_24h: {
    subject: (c) => `${c.eventTitle} is tomorrow`,
    body: (c) =>
      `<p>Hi ${c.attendeeName},</p>` +
      `<p><strong>${c.eventTitle}</strong> starts tomorrow.</p>` +
      `<p>${c.eventDate}${c.eventLocation ? ` &middot; ${c.eventLocation}` : ""}</p>` +
      `<p><a href="${c.ticketUrl}">Open your ticket</a></p>`,
    text: (c) =>
      `Hi ${c.attendeeName},\n\n${c.eventTitle} starts tomorrow.\n` +
      `${c.eventDate}${c.eventLocation ? ` - ${c.eventLocation}` : ""}\n\n` +
      `Open your ticket: ${c.ticketUrl}`,
  },
  post_event_thankyou: {
    subject: (c) => `Thanks for coming to ${c.eventTitle}`,
    body: (c) =>
      `<p>Hi ${c.attendeeName},</p>` +
      `<p>Thanks for attending <strong>${c.eventTitle}</strong>.</p>` +
      `<p><a href="${c.feedbackUrl}">Tell the organiser how it went</a></p>`,
    text: (c) =>
      `Hi ${c.attendeeName},\n\nThanks for attending ${c.eventTitle}.\n\n` +
      `Tell the organiser how it went: ${c.feedbackUrl}`,
  },
  feedback_request: {
    subject: (c) => `How was ${c.eventTitle}?`,
    body: (c) =>
      `<p>Hi ${c.attendeeName},</p>` +
      `<p>We would love your feedback on <strong>${c.eventTitle}</strong>.</p>` +
      `<p><a href="${c.feedbackUrl}">Leave feedback</a></p>`,
    text: (c) =>
      `Hi ${c.attendeeName},\n\nWe would love your feedback on ${c.eventTitle}.\n\n` +
      `Leave feedback: ${c.feedbackUrl}`,
  },
};

export function renderLifecycleEmail(
  template: LifecycleTemplate,
  raw: LifecycleContext
): RenderedEmail {
  // Escape once, here, so no template can interpolate unescaped text.
  const context: LifecycleContext = {
    attendeeName: escapeHtml(raw.attendeeName),
    eventTitle: escapeHtml(raw.eventTitle),
    eventDate: escapeHtml(raw.eventDate),
    eventLocation: escapeHtml(raw.eventLocation),
    ticketCode: escapeHtml(raw.ticketCode),
    ticketUrl: escapeHtml(raw.ticketUrl),
    feedbackUrl: escapeHtml(raw.feedbackUrl),
    emailOptOut: raw.emailOptOut,
  };

  const definition = templates[template];

  return {
    subject: definition.subject(context),
    html: definition.body(context),
    text: definition.text(context),
  };
}
