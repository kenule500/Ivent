import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAdmin, enforceRateLimit } from "./helpers";
import {
  analyticsFilterValidator,
  estimateRevenue,
  resolveAnalyticsScope,
  dayKeysBetween,
  localWeekdayHour,
  type AnalyticsFilterArgs,
  type AnalyticsScope,
} from "./analyticsFilters";

/**
 * Filter-aware analytics workspace (FR-011 to FR-017).
 *
 * Every handler reuses `resolveAnalyticsScope`, so a filter set has one
 * meaning across summary cards, charts, tables, and exports.
 */

// ============ LEGACY SUMMARIES (kept for existing admin surfaces) ============
// These remain bounded and are superseded by the filter-aware queries above,
// but existing pages and tests still call them.

const LEGACY_DAY_MS = 24 * 60 * 60 * 1000;
const LEGACY_SCAN_LIMIT = 10_000;

function buildDaySeries(
  days: number,
  points: { timestamp: number | undefined }[],
  now = Date.now()
) {
  const buckets: Record<string, number> = {};
  const order: string[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const key = new Date(now - index * LEGACY_DAY_MS).toISOString().slice(0, 10);
    buckets[key] = 0;
    order.push(key);
  }

  const start = now - days * LEGACY_DAY_MS;
  for (const point of points) {
    if (!point.timestamp || point.timestamp < start) continue;
    const key = new Date(point.timestamp).toISOString().slice(0, 10);
    if (buckets[key] !== undefined) buckets[key] += 1;
  }

  return order.map((date) => ({ date, count: buckets[date] }));
}

export const getUserGrowth = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const days = Math.min(Math.max(Math.round(args.days ?? 30), 1), 365);
    const since = Date.now() - days * LEGACY_DAY_MS;

    const users = await ctx.db
      .query("users")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", since))
      .take(LEGACY_SCAN_LIMIT);

    return buildDaySeries(
      days,
      users.map((user) => ({ timestamp: user.createdAt ?? user._creationTime }))
    );
  },
});

export const getEventGrowth = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const days = Math.min(Math.max(Math.round(args.days ?? 30), 1), 365);
    const since = Date.now() - days * LEGACY_DAY_MS;

    const events = await ctx.db
      .query("events")
      .withIndex("by_startDate", (q) => q.gte("startDate", since))
      .take(LEGACY_SCAN_LIMIT);

    return buildDaySeries(
      days,
      events.map((event) => ({ timestamp: event.createdAt ?? event._creationTime }))
    );
  },
});

export const getRegistrationTrend = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const days = Math.min(Math.max(Math.round(args.days ?? 30), 1), 365);
    const since = Date.now() - days * LEGACY_DAY_MS;

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_registeredAt", (q) => q.gte("registeredAt", since))
      .take(LEGACY_SCAN_LIMIT);

    return buildDaySeries(
      days,
      registrations.map((registration) => ({ timestamp: registration.registeredAt }))
    );
  },
});

export const getEventsByCategory = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("events").take(LEGACY_SCAN_LIMIT);
    const counts = new Map<string, number>();
    for (const event of events) {
      counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  },
});

export const getTopEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 50);
    const events = await ctx.db.query("events").take(LEGACY_SCAN_LIMIT);
    return events
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, limit);
  },
});

export const getEventsByCity = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("events").take(LEGACY_SCAN_LIMIT);
    const counts = new Map<string, number>();
    for (const event of events) {
      const city = event.city?.trim() || "Unknown";
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  },
});

export const getSummaryMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const day = LEGACY_DAY_MS;
    const thirtyDays = 30 * day;

    const [users, events, registrations] = await Promise.all([
      ctx.db.query("users").take(LEGACY_SCAN_LIMIT),
      ctx.db.query("events").take(LEGACY_SCAN_LIMIT),
      ctx.db.query("registrations").take(LEGACY_SCAN_LIMIT),
    ]);

    return {
      totalUsers: users.length,
      totalEvents: events.length,
      totalRegistrations: registrations.length,
      upcomingEvents: events.filter((event) => event.startDate > now).length,
      pastEvents: events.filter((event) => event.startDate <= now).length,
      newUsers24h: users.filter(
        (user) => (user.createdAt ?? user._creationTime) >= now - day
      ).length,
      newUsers30d: users.filter(
        (user) => (user.createdAt ?? user._creationTime) >= now - thirtyDays
      ).length,
      regs24h: registrations.filter(
        (registration) => registration.registeredAt >= now - day
      ).length,
      regs30d: registrations.filter(
        (registration) => registration.registeredAt >= now - thirtyDays
      ).length,
    };
  },
});

/** Consume the analytics budget. Queries cannot write, so the page pulses once per filter change. */
export const pulse = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    await enforceRateLimit(ctx, "analytics", admin._id);
    return { ok: true };
  },
});

interface SummaryNumbers {
  users: number;
  events: number;
  registrations: number;
  confirmed: number;
  checkIns: number;
  checkInRate: number;
  revenue: number;
}

function summarize(scope: AnalyticsScope): SummaryNumbers {
  const confirmed = scope.registrations.filter(
    (registration) => registration.status === "confirmed"
  );
  const checkIns = confirmed.filter((registration) => registration.checkedIn).length;

  return {
    users: scope.users.length,
    events: scope.events.length,
    registrations: scope.registrations.length,
    confirmed: confirmed.length,
    checkIns,
    checkInRate: confirmed.length > 0 ? checkIns / confirmed.length : 0,
    revenue: estimateRevenue(scope.events, confirmed),
  };
}

function signedDelta(current: number, previous: number): {
  absolute: number;
  percent: number | null;
  direction: "up" | "down" | "flat";
} {
  const absolute = current - previous;
  return {
    absolute,
    percent: previous === 0 ? null : (absolute / previous) * 100,
    direction: absolute === 0 ? "flat" : absolute > 0 ? "up" : "down",
  };
}

function previousWindow(filters: AnalyticsFilterArgs): AnalyticsFilterArgs {
  const span = filters.end - filters.start;
  const end = filters.start - 1;
  return { ...filters, start: end - span, end };
}

export const getSummary = query({
  args: { filters: analyticsFilterValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const currentScope = await resolveAnalyticsScope(ctx, args.filters);
    const previousScope = await resolveAnalyticsScope(
      ctx,
      previousWindow(args.filters)
    );

    const current = summarize(currentScope);
    const previous = summarize(previousScope);

    return {
      asOf: Date.now(),
      appliedFilters: currentScope.appliedFilters,
      rowCounts: currentScope.rowCounts,
      current,
      previous,
      deltas: {
        users: signedDelta(current.users, previous.users),
        events: signedDelta(current.events, previous.events),
        registrations: signedDelta(current.registrations, previous.registrations),
        revenue: signedDelta(current.revenue, previous.revenue),
        checkInRate: signedDelta(current.checkInRate, previous.checkInRate),
      },
    };
  },
});

interface SeriesBucket {
  key: string;
  users: number;
  events: number;
  registrations: number;
  revenue: number;
  freeRevenue: number;
  paidRevenue: number;
}

function buildSeries(scope: AnalyticsScope, keys: string[]): SeriesBucket[] {
  const index = new Map(keys.map((key, position) => [key, position]));
  const buckets: SeriesBucket[] = keys.map((key) => ({
    key,
    users: 0,
    events: 0,
    registrations: 0,
    revenue: 0,
    freeRevenue: 0,
    paidRevenue: 0,
  }));

  const keyFor = (timestamp: number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: scope.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(timestamp));

  const priceByEvent = new Map(
    scope.events.map((event) => [
      event._id,
      event.ticketType === "paid" ? event.ticketPrice ?? 0 : 0,
    ])
  );
  const paidById = new Map(
    scope.events.map((event) => [event._id, event.ticketType === "paid"])
  );

  for (const user of scope.users) {
    const position = index.get(keyFor(user.createdAt ?? user._creationTime));
    if (position !== undefined) buckets[position].users += 1;
  }

  for (const event of scope.events) {
    const position = index.get(keyFor(event.createdAt ?? event._creationTime));
    if (position !== undefined) buckets[position].events += 1;
  }

  for (const registration of scope.registrations) {
    const position = index.get(keyFor(registration.registeredAt));
    if (position === undefined) continue;
    buckets[position].registrations += 1;

    if (registration.status !== "confirmed") continue;
    const amount = priceByEvent.get(registration.eventId) ?? 0;
    buckets[position].revenue += amount;
    if (paidById.get(registration.eventId)) {
      buckets[position].paidRevenue += amount;
    } else {
      buckets[position].freeRevenue += amount;
    }
  }

  return buckets;
}

export const getTimeSeries = query({
  args: {
    filters: analyticsFilterValidator,
    compare: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const scope = await resolveAnalyticsScope(ctx, args.filters);
    const keys = dayKeysBetween(args.filters.start, args.filters.end, scope.timezone);
    const current = buildSeries(scope, keys);

    let previous: SeriesBucket[] | null = null;
    if (args.compare) {
      const previousFilters = previousWindow(args.filters);
      const previousScope = await resolveAnalyticsScope(ctx, previousFilters);
      const previousKeys = dayKeysBetween(
        previousFilters.start,
        previousFilters.end,
        scope.timezone
      );
      previous = buildSeries(previousScope, previousKeys);
    }

    return {
      timezone: scope.timezone,
      appliedFilters: scope.appliedFilters,
      buckets: current,
      previous,
    };
  },
});

export const getFunnel = query({
  args: { filters: analyticsFilterValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const scope = await resolveAnalyticsScope(ctx, args.filters);
    const registered = scope.registrations.length;
    const confirmed = scope.registrations.filter(
      (registration) => registration.status === "confirmed"
    ).length;
    const checkedIn = scope.registrations.filter(
      (registration) => registration.checkedIn
    ).length;

    const steps = [
      { key: "registered", label: "Registered", value: registered },
      { key: "confirmed", label: "Confirmed", value: confirmed },
      { key: "checked_in", label: "Checked in", value: checkedIn },
    ].map((step, index, all) => ({
      ...step,
      conversionFromPrevious:
        index === 0 ? 1 : all[index - 1].value > 0 ? step.value / all[index - 1].value : 0,
      conversionFromStart: registered > 0 ? step.value / registered : 0,
    }));

    const keys = dayKeysBetween(args.filters.start, args.filters.end, scope.timezone);
    const index = new Map(keys.map((key, position) => [key, position]));
    const trend = keys.map((key) => ({ key, confirmed: 0, checkedIn: 0 }));

    const keyFor = (timestamp: number) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: scope.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(timestamp));

    for (const registration of scope.registrations) {
      const position = index.get(keyFor(registration.registeredAt));
      if (position === undefined) continue;
      if (registration.status === "confirmed") trend[position].confirmed += 1;
      if (registration.checkedIn) trend[position].checkedIn += 1;
    }

    const capacityBuckets = [
      { label: "0–25%", min: 0, max: 0.25, count: 0 },
      { label: "26–50%", min: 0.25, max: 0.5, count: 0 },
      { label: "51–75%", min: 0.5, max: 0.75, count: 0 },
      { label: "76–99%", min: 0.75, max: 1, count: 0 },
      { label: "Full", min: 1, max: Infinity, count: 0 },
    ];

    for (const event of scope.events) {
      if (!event.capacity || event.capacity <= 0) continue;
      const utilisation = event.registrationCount / event.capacity;
      const bucket =
        capacityBuckets.find(
          (candidate) =>
            utilisation >= candidate.min &&
            (utilisation < candidate.max || candidate.max === Infinity)
        ) ?? capacityBuckets[capacityBuckets.length - 1];
      bucket.count += 1;
    }

    return {
      timezone: scope.timezone,
      appliedFilters: scope.appliedFilters,
      steps,
      trend,
      capacity: {
        eventsWithCapacity: scope.events.filter((event) => (event.capacity ?? 0) > 0).length,
        buckets: capacityBuckets.map(({ label, count }) => ({ label, count })),
      },
    };
  },
});

export const getCohorts = query({
  args: { filters: analyticsFilterValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const scope = await resolveAnalyticsScope(ctx, args.filters);
    const monthKey = (timestamp: number) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: scope.timezone,
        year: "numeric",
        month: "2-digit",
      }).format(new Date(timestamp));

    const cohortMap = new Map<string, Doc<"registrations">[]>();
    for (const registration of scope.registrations) {
      const key = monthKey(registration.registeredAt);
      const list = cohortMap.get(key) ?? [];
      list.push(registration);
      cohortMap.set(key, list);
    }

    // Earliest registration per attendee defines "returning". Bound the lookup
    // so a wide range cannot fan out into thousands of index reads.
    const attendeeIds = Array.from(
      new Set(scope.registrations.map((registration) => registration.userId))
    ).slice(0, 300);

    const firstRegistration = new Map<string, number>();
    for (const userId of attendeeIds) {
      const earliest = await ctx.db
        .query("registrations")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("asc")
        .take(1);
      if (earliest[0]) {
        firstRegistration.set(userId, earliest[0].registeredAt);
      }
    }

    const cohorts = Array.from(cohortMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, registrations]) => {
        const cohortStart = registrations.reduce(
          (min, registration) => Math.min(min, registration.registeredAt),
          Number.POSITIVE_INFINITY
        );

        const seen = new Set<string>();
        let newCount = 0;
        let returningCount = 0;

        for (const registration of registrations) {
          if (seen.has(registration.userId)) continue;
          seen.add(registration.userId);
          const first = firstRegistration.get(registration.userId) ?? registration.registeredAt;
          if (first < cohortStart) {
            returningCount += 1;
          } else {
            newCount += 1;
          }
        }

        return { key, newCount, returningCount, total: newCount + returningCount };
      });

    const insufficient = scope.registrations.length < 5 || cohorts.length < 2;

    return {
      timezone: scope.timezone,
      appliedFilters: scope.appliedFilters,
      definition:
        "Returning attendees had a first registration before the cohort period; new attendees registered for the first time inside it.",
      insufficient,
      minimumRequirement:
        "Retention needs at least 5 registrations across 2 or more months.",
      cohorts,
    };
  },
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const getHeatmap = query({
  args: { filters: analyticsFilterValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const scope = await resolveAnalyticsScope(ctx, args.filters);
    const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0) as number[]);

    for (const registration of scope.registrations) {
      const { weekday, hour } = localWeekdayHour(registration.registeredAt, scope.timezone);
      matrix[weekday][hour] += 1;
    }

    const max = Math.max(1, ...matrix.flat());

    return {
      timezone: scope.timezone,
      appliedFilters: scope.appliedFilters,
      weekdays: WEEKDAYS,
      hours: Array.from({ length: 24 }, (_, hour) => hour),
      matrix,
      max,
      total: scope.registrations.length,
    };
  },
});

const BREAKDOWN_DIMENSIONS = [
  "category",
  "country",
  "city",
  "ticketType",
  "status",
  "organizer",
] as const;

export const getBreakdown = query({
  args: {
    filters: analyticsFilterValidator,
    dimension: v.union(
      v.literal("category"),
      v.literal("country"),
      v.literal("city"),
      v.literal("ticketType"),
      v.literal("status"),
      v.literal("organizer")
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const scope = await resolveAnalyticsScope(ctx, args.filters);
    const eventsById = new Map(scope.events.map((event) => [event._id, event]));
    const counts = new Map<string, number>();

    const add = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);

    if (args.dimension === "status") {
      for (const registration of scope.registrations) add(registration.status);
    } else if (args.dimension === "organizer") {
      for (const registration of scope.registrations) {
        const event = eventsById.get(registration.eventId);
        add(event?.organizerId ?? "unknown");
      }
    } else {
      for (const registration of scope.registrations) {
        const event = eventsById.get(registration.eventId);
        if (!event) {
          add("Unknown");
          continue;
        }
        if (args.dimension === "category") add(event.category || "Uncategorised");
        else if (args.dimension === "country") add(event.country?.trim() || "Unknown");
        else if (args.dimension === "city") add(event.city?.trim() || "Unknown");
        else add(event.ticketType === "paid" ? "Paid" : "Free");
      }
    }

    const rows = Array.from(counts.entries())
      .map(([key, value]) => ({ key, label: key, value }))
      .sort((a, b) => b.value - a.value);

    // Organizer ids are not readable labels; resolve the names in one pass.
    if (args.dimension === "organizer") {
      for (const row of rows) {
        if (row.key === "unknown") {
          row.label = "Unknown organizer";
          continue;
        }
        const organizer = await ctx.db.get(row.key as Id<"users">);
        row.label = organizer?.name || "Unknown organizer";
      }
    }

    return {
      dimension: args.dimension,
      dimensions: BREAKDOWN_DIMENSIONS,
      appliedFilters: scope.appliedFilters,
      rows,
    };
  },
});

/** Distinct values available to the filter bar, bounded to the event table size. */
export const getFilterOptions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const events = await ctx.db.query("events").take(2000);
    const unique = (values: (string | undefined)[]) =>
      Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
        .sort((a, b) => a.localeCompare(b));

    const organizerIds = Array.from(
      new Set(events.map((event) => event.organizerId))
    ).slice(0, 200);

    const organizers: { id: string; label: string }[] = [];
    for (const organizerId of organizerIds) {
      const organizer = await ctx.db.get(organizerId);
      if (organizer) organizers.push({ id: organizer._id, label: organizer.name });
    }

    return {
      categories: unique(events.map((event) => event.category)),
      countries: unique(events.map((event) => event.country)),
      cities: unique(events.map((event) => event.city)),
      organizers: organizers.sort((a, b) => a.label.localeCompare(b.label)),
    };
  },
});
