import { normalizeLocale, type Locale } from "@/lib/i18n";

/**
 * Event-aware formatting (BP-014).
 *
 * Unlike the admin formatters, these functions always receive the event's own
 * locale, timezone, and currency. A French event in Lagos therefore renders in
 * French with NGN even when the viewer's browser is set to English.
 */

export interface EventFormatContext {
  locale?: string | null;
  timezone?: string | null;
  currency?: string | null;
}

function localeTag(locale?: string | null) {
  return normalizeLocale(locale) satisfies Locale;
}

function safeTimezone(timezone?: string | null) {
  const value = timezone?.trim();
  if (!value) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return "UTC";
  }
}

export function formatEventDate(
  timestamp: number,
  context: EventFormatContext,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
) {
  return new Intl.DateTimeFormat(localeTag(context.locale), {
    ...options,
    timeZone: safeTimezone(context.timezone),
  }).format(new Date(timestamp));
}

export function formatEventTime(
  timestamp: number,
  context: EventFormatContext
) {
  return new Intl.DateTimeFormat(localeTag(context.locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: safeTimezone(context.timezone),
  }).format(new Date(timestamp));
}

export function formatEventDateTime(
  timestamp: number,
  context: EventFormatContext
) {
  return new Intl.DateTimeFormat(localeTag(context.locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: safeTimezone(context.timezone),
  }).format(new Date(timestamp));
}

export function formatEventDateRange(
  startDate: number,
  endDate: number,
  context: EventFormatContext
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timezone = safeTimezone(context.timezone);
  const locale = localeTag(context.locale);
  const dayKey = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone,
    }).format(date);

  if (dayKey(start) !== dayKey(end)) {
    return `${formatEventDate(startDate, context)} – ${formatEventDate(
      endDate,
      context
    )}`;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(start);
}

export function formatEventTimeRange(
  startDate: number,
  endDate: number,
  context: EventFormatContext
) {
  const timezone = safeTimezone(context.timezone);
  const locale = localeTag(context.locale);
  const dayKey = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone,
    }).format(date);

  const startTime = formatEventTime(startDate, context);
  const endTime = formatEventTime(endDate, context);

  if (dayKey(new Date(startDate)) === dayKey(new Date(endDate))) {
    return `${startTime} – ${endTime}`;
  }

  return `${startTime} – ${new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(endDate))}`;
}

export function formatEventPrice(
  ticketType: "free" | "paid" | string,
  ticketPrice: number | null | undefined,
  context: EventFormatContext
) {
  if (ticketType !== "paid" || ticketPrice === null || ticketPrice === undefined) {
    return null;
  }

  const currency = (context.currency ?? "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(localeTag(context.locale), {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(ticketPrice);
  } catch {
    return `${currency} ${ticketPrice.toFixed(2)}`;
  }
}

export interface EventLocationFields {
  locationType: "physical" | "online" | string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  venue?: string | null;
}

export function formatEventLocation(event: EventLocationFields) {
  if (event.locationType === "online") return "Online";
  return [event.city, event.state || event.country]
    .filter(Boolean)
    .join(", ");
}
