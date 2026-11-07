import { formatDistanceToNowStrict } from "date-fns";

/**
 * Shared display formatters for the admin console (FR-041).
 *
 * Every function takes its locale-sensitive inputs explicitly. Nothing in this
 * module reads a hard-coded currency, country, or browser guess, so a platform
 * default can change at runtime without touching call sites (FR-027).
 */

export interface FormatContext {
  currency: string;
  timezone: string;
  locale?: string;
}

export const DEFAULT_CURRENCY = "USD";
export const DEFAULT_TIMEZONE = "UTC";

export function resolveFormatContext(
  partial?: Partial<FormatContext> | null
): FormatContext {
  return {
    currency: partial?.currency || DEFAULT_CURRENCY,
    timezone: partial?.timezone || DEFAULT_TIMEZONE,
    locale: partial?.locale,
  };
}

/** Format a money amount in the platform currency. */
export function formatCurrency(
  amount: number | null | undefined,
  context: Pick<FormatContext, "currency" | "locale">
) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  try {
    return new Intl.NumberFormat(context.locale, {
      style: "currency",
      currency: context.currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    // An invalid ISO code must not blank the screen.
    return `${context.currency} ${formatNumber(amount, context.locale)}`;
  }
}

/** Plain number with grouping. */
export function formatNumber(value: number | null | undefined, locale?: string) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(locale).format(value);
}

/** Compact number: 1,250 -> 1.3K. */
export function formatCompact(value: number | null | undefined, locale?: string) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Percentage from a ratio (0.256 -> 25.6%). */
export function formatPercent(
  ratio: number | null | undefined,
  options?: { fractionDigits?: number; locale?: string }
) {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  return new Intl.NumberFormat(options?.locale, {
    style: "percent",
    maximumFractionDigits: options?.fractionDigits ?? 1,
  }).format(ratio);
}

/** Relative time using the viewer's clock, e.g. "3 hours ago". */
export function formatRelativeTime(timestamp: number | null | undefined) {
  if (!timestamp) return "—";
  return `${formatDistanceToNowStrict(new Date(timestamp))} ago`;
}

export type DeltaDirection = "up" | "down" | "flat" | "new";

export interface DeltaResult {
  direction: DeltaDirection;
  absolute: number | null;
  percent: number | null;
  /** Short, human label that never relies on colour. */
  label: string;
}

/**
 * Signed delta between two windows.
 * A zero or missing baseline is "new", never Infinity or NaN (AC-005, EC-002).
 */
export function computeDelta(
  current: number | null | undefined,
  previous: number | null | undefined
): DeltaResult {
  const now = current ?? 0;
  const before = previous ?? 0;

  if (before === 0) {
    if (now === 0) {
      return { direction: "flat", absolute: 0, percent: null, label: "no change" };
    }
    return { direction: "new", absolute: now, percent: null, label: "new" };
  }

  const absolute = now - before;
  const percent = (absolute / before) * 100;
  if (absolute === 0) {
    return { direction: "flat", absolute: 0, percent: 0, label: "no change" };
  }

  const direction: DeltaDirection = absolute > 0 ? "up" : "down";
  const sign = absolute > 0 ? "+" : "−";
  const magnitude = Math.abs(percent);
  const percentLabel = magnitude >= 100 ? Math.round(magnitude) : magnitude.toFixed(1);

  return {
    direction,
    absolute,
    percent,
    label: `${sign}${percentLabel}%`,
  };
}

/**
 * Day key for a timestamp in the configured IANA timezone.
 * Never uses toISOString(), which is always UTC (FR-044).
 */
export function dayKey(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${lookup("year")}-${lookup("month")}-${lookup("day")}`;
}

/** Local weekday (0 = Sunday) and hour for a timestamp in the configured timezone. */
export function localWeekdayHour(timestamp: number, timezone: string) {
  const date = new Date(timestamp);
  const weekdayPart = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).format(date);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = Math.max(weekdays.indexOf(weekdayPart), 0);
  // "24" appears at midnight in some engines; normalise it to 0.
  const hour = Number(hourPart) % 24;

  return { weekday, hour };
}

/** Human label for a timestamp in the platform timezone, used by "as of" lines. */
export function formatDateTime(timestamp: number, context: FormatContext) {
  return new Intl.DateTimeFormat(context.locale, {
    timeZone: context.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

/** Date-only label in the platform timezone. */
export function formatDate(timestamp: number, context: FormatContext) {
  return new Intl.DateTimeFormat(context.locale, {
    timeZone: context.timezone,
    dateStyle: "medium",
  }).format(new Date(timestamp));
}

/** Filename-safe date stamp in the platform timezone. */
export function fileDateStamp(timestamp: number, timezone: string) {
  return dayKey(timestamp, timezone);
}

/** Initials fallback for users without a name or avatar (EC-015). */
export function displayName(name?: string | null, email?: string | null) {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  if (email) return email.split("@")[0];
  return "Unknown user";
}

export function initials(name?: string | null, email?: string | null) {
  const source = displayName(name, email);
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
