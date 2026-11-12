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
  /** Registration locale, then event locale, then the platform default. */
  locale?: "en" | "fr";
  /** Set when the attendee has opted out of optional email. */
  emailOptOut: boolean;
}

/** Format an event's date range in the attendee's locale and the event timezone. */
export function formatLifecycleDate(
  start: number,
  end: number,
  timezone: string | undefined,
  locale: "en" | "fr"
): string {
  let zone = "UTC";
  if (timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
      zone = timezone;
    } catch {
      zone = "UTC";
    }
  }

  const date = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: zone,
  });
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  });

  return `${date.format(new Date(start))} · ${time.format(new Date(start))}–${time.format(new Date(end))}`;
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

const templates: Record<
  LifecycleTemplate,
  Record<"en" | "fr", TemplateDefinition>
> = {
  registration_confirmation: {
    en: {
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
    fr: {
      subject: (c) => `Vous êtes inscrit à ${c.eventTitle}`,
      body: (c) =>
        `<p>Bonjour ${c.attendeeName},</p>` +
        `<p>Votre inscription à <strong>${c.eventTitle}</strong> est confirmée.</p>` +
        `<p>${c.eventDate}${c.eventLocation ? ` &middot; ${c.eventLocation}` : ""}</p>` +
        `<p>Votre code de billet est <strong>${c.ticketCode}</strong>.</p>` +
        `<p><a href="${c.ticketUrl}">Voir votre billet</a></p>`,
      text: (c) =>
        `Bonjour ${c.attendeeName},\n\nVotre inscription à ${c.eventTitle} est confirmée.\n` +
        `${c.eventDate}${c.eventLocation ? ` - ${c.eventLocation}` : ""}\n` +
        `Code du billet : ${c.ticketCode}\n\nVoir votre billet : ${c.ticketUrl}`,
    },
  },
  reminder_24h: {
    en: {
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
    fr: {
      subject: (c) => `${c.eventTitle} a lieu demain`,
      body: (c) =>
        `<p>Bonjour ${c.attendeeName},</p>` +
        `<p><strong>${c.eventTitle}</strong> commence demain.</p>` +
        `<p>${c.eventDate}${c.eventLocation ? ` &middot; ${c.eventLocation}` : ""}</p>` +
        `<p><a href="${c.ticketUrl}">Ouvrir votre billet</a></p>`,
      text: (c) =>
        `Bonjour ${c.attendeeName},\n\n${c.eventTitle} commence demain.\n` +
        `${c.eventDate}${c.eventLocation ? ` - ${c.eventLocation}` : ""}\n\n` +
        `Ouvrir votre billet : ${c.ticketUrl}`,
    },
  },
  post_event_thankyou: {
    en: {
      subject: (c) => `Thanks for coming to ${c.eventTitle}`,
      body: (c) =>
        `<p>Hi ${c.attendeeName},</p>` +
        `<p>Thanks for attending <strong>${c.eventTitle}</strong>.</p>` +
        `<p><a href="${c.feedbackUrl}">Tell the organiser how it went</a></p>`,
      text: (c) =>
        `Hi ${c.attendeeName},\n\nThanks for attending ${c.eventTitle}.\n\n` +
        `Tell the organiser how it went: ${c.feedbackUrl}`,
    },
    fr: {
      subject: (c) => `Merci d'avoir participé à ${c.eventTitle}`,
      body: (c) =>
        `<p>Bonjour ${c.attendeeName},</p>` +
        `<p>Merci d'avoir participé à <strong>${c.eventTitle}</strong>.</p>` +
        `<p><a href="${c.feedbackUrl}">Dites à l'organisateur comment cela s'est passé</a></p>`,
      text: (c) =>
        `Bonjour ${c.attendeeName},\n\nMerci d'avoir participé à ${c.eventTitle}.\n\n` +
        `Dites à l'organisateur comment cela s'est passé : ${c.feedbackUrl}`,
    },
  },
  feedback_request: {
    en: {
      subject: (c) => `How was ${c.eventTitle}?`,
      body: (c) =>
        `<p>Hi ${c.attendeeName},</p>` +
        `<p>We would love your feedback on <strong>${c.eventTitle}</strong>.</p>` +
        `<p><a href="${c.feedbackUrl}">Leave feedback</a></p>`,
      text: (c) =>
        `Hi ${c.attendeeName},\n\nWe would love your feedback on ${c.eventTitle}.\n\n` +
        `Leave feedback: ${c.feedbackUrl}`,
    },
    fr: {
      subject: (c) => `Comment s'est passé ${c.eventTitle} ?`,
      body: (c) =>
        `<p>Bonjour ${c.attendeeName},</p>` +
        `<p>Votre avis sur <strong>${c.eventTitle}</strong> nous intéresse.</p>` +
        `<p><a href="${c.feedbackUrl}">Donner mon avis</a></p>`,
      text: (c) =>
        `Bonjour ${c.attendeeName},\n\nVotre avis sur ${c.eventTitle} nous intéresse.\n\n` +
        `Donner mon avis : ${c.feedbackUrl}`,
    },
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
    locale: raw.locale === "fr" ? "fr" : "en",
    emailOptOut: raw.emailOptOut,
  };

  const locale = context.locale === "fr" ? "fr" : "en";

  const definition = templates[template][locale];

  return {
    subject: definition.subject(context),
    html: definition.body(context),
    text: definition.text(context),
  };
}
