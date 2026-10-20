import { v } from "convex/values";
import { QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * The single analytics filter contract (FR-011, FR-017).
 *
 * Every analytics chart, comparison, and export resolves its data through
 * `resolveAnalyticsScope` so one filter set cannot mean two different things.
 */

export const analyticsFilterValidator = v.object({
  start: v.number(),
  end: v.number(),
  categories: v.optional(v.array(v.string())),
  countries: v.optional(v.array(v.string())),
  cities: v.optional(v.array(v.string())),
  ticketTypes: v.optional(
    v.array(v.union(v.literal("free"), v.literal("paid")))
  ),
  organizerId: v.optional(v.id("users")),
  registrationStatus: v.optional(
    v.union(v.literal("confirmed"), v.literal("cancelled"))
  ),
  checkIn: v.optional(
    v.union(v.literal("checked_in"), v.literal("not_checked_in"))
  ),
  timezone: v.optional(v.string()),
});

export type AnalyticsFilterArgs = {
  start: number;
  end: number;
  categories?: string[];
  countries?: string[];
  cities?: string[];
  ticketTypes?: ("free" | "paid")[];
  organizerId?: Doc<"users">["_id"];
  registrationStatus?: "confirmed" | "cancelled";
  checkIn?: "checked_in" | "not_checked_in";
  timezone?: string;
};

export const MAX_RANGE_DAYS = 730;
export const MAX_SCOPE_EVENTS = 20_000;
export const MAX_SCOPE_REGISTRATIONS = 50_000;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AppliedFilters {
  start: number;
  end: number;
  categories: string[];
  countries: string[];
  cities: string[];
  ticketTypes: ("free" | "paid")[];
  organizerId: string | null;
  registrationStatus: "confirmed" | "cancelled" | null;
  checkIn: "checked_in" | "not_checked_in" | null;
  timezone: string;
}

export interface AnalyticsScope {
  events: Doc<"events">[];
  registrations: Doc<"registrations">[];
  users: Doc<"users">[];
  appliedFilters: AppliedFilters;
  rowCounts: {
    events: number;
    registrations: number;
    users: number;
    truncated: boolean;
  };
  timezone: string;
}

/** Read the platform timezone, falling back to UTC before the document exists. */
export async function getPlatformTimezone(ctx: QueryCtx) {
  const settings = await ctx.db
    .query("platformSettings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
  return settings?.defaultTimezone || "UTC";
}

function validateWindow(start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error("Invalid date range");
  }
  if (start > end) {
    throw new Error("The start date must be on or before the end date");
  }
  if ((end - start) / DAY_MS > MAX_RANGE_DAYS) {
    throw new Error(`Ranges are limited to ${MAX_RANGE_DAYS} days`);
  }
}

function matchesEventFilters(
  event: Doc<"events">,
  filters: AnalyticsFilterArgs
) {
  if (
    filters.categories?.length &&
    !filters.categories.includes(event.category)
  ) {
    return false;
  }

  if (filters.countries?.length) {
    const country = event.country?.trim();
    if (!country || !filters.countries.includes(country)) return false;
  }

  if (filters.cities?.length) {
    const city = event.city?.trim();
    if (!city || !filters.cities.includes(city)) return false;
  }

  if (filters.ticketTypes?.length && !filters.ticketTypes.includes(event.ticketType)) {
    return false;
  }

  if (filters.organizerId && event.organizerId !== filters.organizerId) {
    return false;
  }

  return true;
}

/**
 * Resolve the filtered event, registration, and user sets once per handler.
 * Index ranges narrow each collection; in-memory filtering only runs on the
 * narrowed set. No call ever collects a whole table (FR-042, NFR-008).
 */
export async function resolveAnalyticsScope(
  ctx: QueryCtx,
  filters: AnalyticsFilterArgs
): Promise<AnalyticsScope> {
  validateWindow(filters.start, filters.end);

  const timezone = filters.timezone || (await getPlatformTimezone(ctx));

  // Events: a single category can use by_category, otherwise the startDate range.
  const singleCategory =
    filters.categories && filters.categories.length === 1 ? filters.categories[0] : null;

  const rawEvents = singleCategory
    ? await ctx.db
        .query("events")
        .withIndex("by_category", (q) => q.eq("category", singleCategory))
        .take(MAX_SCOPE_EVENTS)
    : await ctx.db
        .query("events")
        .withIndex("by_startDate", (q) =>
          q.gte("startDate", filters.start).lte("startDate", filters.end)
        )
        .take(MAX_SCOPE_EVENTS);

  const events = rawEvents.filter((event) => matchesEventFilters(event, filters));
  const eventIds = new Set(events.map((event) => event._id));

  // Registrations: by_registeredAt for the window, then narrow to the event set.
  const registrationCandidates = await ctx.db
    .query("registrations")
    .withIndex("by_registeredAt", (q) =>
      q.gte("registeredAt", filters.start).lte("registeredAt", filters.end)
    )
    .take(MAX_SCOPE_REGISTRATIONS);

  const registrations = registrationCandidates.filter((registration) => {
    if (!eventIds.has(registration.eventId)) return false;
    if (
      filters.registrationStatus &&
      registration.status !== filters.registrationStatus
    ) {
      return false;
    }
    if (filters.checkIn === "checked_in" && !registration.checkedIn) return false;
    if (filters.checkIn === "not_checked_in" && registration.checkedIn) return false;
    return true;
  });

  // Users are bounded to the window for growth series.
  const users = await ctx.db
    .query("users")
    .withIndex("by_createdAt", (q) =>
      q.gte("createdAt", filters.start).lte("createdAt", filters.end)
    )
    .take(MAX_SCOPE_EVENTS);

  return {
    events,
    registrations,
    users,
    timezone,
    appliedFilters: {
      start: filters.start,
      end: filters.end,
      categories: filters.categories ?? [],
      countries: filters.countries ?? [],
      cities: filters.cities ?? [],
      ticketTypes: filters.ticketTypes ?? [],
      organizerId: filters.organizerId ?? null,
      registrationStatus: filters.registrationStatus ?? null,
      checkIn: filters.checkIn ?? null,
      timezone,
    },
    rowCounts: {
      events: events.length,
      registrations: registrations.length,
      users: users.length,
      truncated:
        rawEvents.length >= MAX_SCOPE_EVENTS ||
        registrationCandidates.length >= MAX_SCOPE_REGISTRATIONS,
    },
  };
}

/** Offset in ms between the given timezone and UTC at that instant. */
export function timezoneOffsetMs(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(timestamp));

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  const asUtc = Date.UTC(
    lookup("year"),
    lookup("month") - 1,
    lookup("day"),
    lookup("hour") % 24,
    lookup("minute"),
    lookup("second")
  );

  return asUtc - timestamp;
}

/** Inclusive start and exclusive end of the local day containing `timestamp`. */
export function timezoneDayBounds(timestamp: number, timezone: string) {
  const offset = timezoneOffsetMs(timestamp, timezone);
  const start = Math.floor((timestamp + offset) / DAY_MS) * DAY_MS - offset;
  return { start, end: start + DAY_MS };
}

/** Revenue contributed by a set of registrations, using each event's ticket price. */
export function estimateRevenue(
  events: Doc<"events">[],
  registrations: Doc<"registrations">[]
) {
  const priceByEvent = new Map(
    events.map((event) => [
      event._id,
      event.ticketType === "paid" ? event.ticketPrice ?? 0 : 0,
    ])
  );

  return registrations.reduce(
    (sum, registration) => sum + (priceByEvent.get(registration.eventId) ?? 0),
    0
  );
}
