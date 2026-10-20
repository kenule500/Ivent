import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireAdmin, clampPage, clampPageSize } from "./helpers";
import {
  dayKeyFor,
  dayKeysBetween,
  getPlatformTimezone,
  timezoneDayBounds,
} from "./analyticsFilters";

/**
 * Reports hub (FR-021, FR-022).
 * One event report composes attendance, check-in trend, capacity, and revenue.
 */

const SEARCH_SCAN_LIMIT = 2000;
const MAX_REPORT_REGISTRATIONS = 10_000;

export const listEvents = query({
  args: {
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const page = clampPage(args.page);
    const pageSize = clampPageSize(args.pageSize);
    const timezone = await getPlatformTimezone(ctx);
    const term = args.search?.trim().toLowerCase();

    let matches: Doc<"events">[];

    if (term) {
      const scanned = await ctx.db.query("events").take(SEARCH_SCAN_LIMIT);
      matches = scanned
        .filter((event) => event.title.toLowerCase().includes(term))
        .sort((a, b) => b.startDate - a.startDate);
    } else {
      matches = await ctx.db
        .query("events")
        .withIndex("by_startDate")
        .order("desc")
        .take(SEARCH_SCAN_LIMIT);
    }

    const start = (page - 1) * pageSize;
    const pageRows = matches.slice(start, start + pageSize);

    const organizerIds = Array.from(new Set(pageRows.map((event) => event.organizerId)));
    const organizerNames = new Map<string, string>();
    for (const organizerId of organizerIds) {
      const organizer = await ctx.db.get(organizerId);
      if (organizer) organizerNames.set(organizerId, organizer.name);
    }

    return {
      timezone,
      page,
      pageSize,
      total: matches.length,
      hasMore: start + pageSize < matches.length,
      rows: pageRows.map((event) => ({
        id: event._id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        city: event.city ?? null,
        category: event.category,
        organizer: organizerNames.get(event.organizerId) ?? "Unknown organizer",
        registrationCount: event.registrationCount,
        capacity: event.capacity,
        ticketType: event.ticketType,
      })),
    };
  },
});

export const getEventReport = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const timezone = await getPlatformTimezone(ctx);
    const now = Date.now();

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(MAX_REPORT_REGISTRATIONS);

    const confirmed = registrations.filter(
      (registration) => registration.status === "confirmed"
    );
    const checkedIn = confirmed.filter((registration) => registration.checkedIn);
    const cancelled = registrations.length - confirmed.length;

    // Check-in series: the event window, capped at 60 days of buckets.
    const windowStart = Math.min(event.startDate, now);
    const windowEnd = Math.max(event.endDate, now);
    const boundedStart = Math.max(
      windowStart,
      windowEnd - 60 * 24 * 60 * 60 * 1000
    );
    const keys = dayKeysBetween(boundedStart, windowEnd, timezone);
    const index = new Map(keys.map((key, position) => [key, position]));
    const trend = keys.map((key) => ({ key, checkedIn: 0 }));

    for (const registration of checkedIn) {
      if (!registration.checkedInAt) continue;
      const position = index.get(dayKeyFor(registration.checkedInAt, timezone));
      if (position !== undefined) trend[position].checkedIn += 1;
    }

    const organizer = await ctx.db.get(event.organizerId);
    const revenue =
      event.ticketType === "paid" ? confirmed.length * (event.ticketPrice ?? 0) : 0;

    const today = timezoneDayBounds(now, timezone);

    return {
      asOf: now,
      timezone,
      event: {
        id: event._id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        city: event.city ?? null,
        country: event.country ?? null,
        category: event.category,
        capacity: event.capacity,
        ticketType: event.ticketType,
        ticketPrice: event.ticketPrice ?? 0,
        organizer: organizer?.name ?? "Unknown organizer",
      },
      attendance: {
        registered: registrations.length,
        confirmed: confirmed.length,
        checkedIn: checkedIn.length,
        noShow: confirmed.length - checkedIn.length,
        cancelled,
        checkInRate: confirmed.length > 0 ? checkedIn.length / confirmed.length : 0,
        capacityUtilisation:
          event.capacity > 0 ? confirmed.length / event.capacity : null,
      },
      revenue,
      trend,
      todayWindow: today,
      registrationScanLimit: MAX_REPORT_REGISTRATIONS,
    };
  },
});
