import { v } from "convex/values";
import { mutation, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireAdmin, consumeRateLimit } from "./helpers";
import { logAdminAction } from "./audit";
import {
  analyticsFilterValidator,
  getPlatformTimezone,
  dayKeysBetween,
  dayKeyFor,
  resolveAnalyticsScope,
  type AnalyticsFilterArgs,
} from "./analyticsFilters";
import {
  MAX_EXPORT_ROWS,
  csvFilename,
  serializeCsv,
  type CsvColumn,
} from "../lib/csv";

/**
 * CSV exports (FR-018 to FR-020, NFR-013).
 *
 * The mutation returns CSV text rather than a storage URL: the client turns it
 * into a Blob and the file never becomes publicly addressable. Only columns
 * that the corresponding screen already shows are exported.
 */

const EXPORT_MODULES = [
  "users",
  "events",
  "registrations",
  "audit",
  "analytics",
  "report",
] as const;

type ExportModule = (typeof EXPORT_MODULES)[number];

export type ExportResponse =
  | { ok: true; filename: string; csv: string; rowCount: number }
  | {
      ok: false;
      reason: "rate_limited" | "too_many_rows" | "empty";
      message: string;
    };

const iso = (timestamp: number | undefined) =>
  timestamp ? new Date(timestamp).toISOString() : "";

function tooMany(rowCount: number): ExportResponse {
  return {
    ok: false,
    reason: "too_many_rows",
    message: `This export has ${rowCount.toLocaleString("en-US")} rows. Narrow the filters to ${MAX_EXPORT_ROWS.toLocaleString("en-US")} rows or fewer.`,
  };
}

function userColumns(): CsvColumn<Doc<"users">>[] {
  return [
    { key: "name", header: "Name", value: (row) => row.name },
    { key: "email", header: "Email", value: (row) => row.email },
    { key: "role", header: "Role", value: (row) => row.role ?? "user" },
    { key: "status", header: "Status", value: (row) => (row.banned ? "banned" : "active") },
    { key: "joined", header: "Joined", value: (row) => iso(row.createdAt) },
    { key: "city", header: "City", value: (row) => row.location?.city ?? "" },
    { key: "country", header: "Country", value: (row) => row.location?.country ?? "" },
  ];
}

function eventColumns(): CsvColumn<Doc<"events">>[] {
  return [
    { key: "title", header: "Title", value: (row) => row.title },
    { key: "category", header: "Category", value: (row) => row.category },
    { key: "city", header: "City", value: (row) => row.city ?? "" },
    { key: "country", header: "Country", value: (row) => row.country ?? "" },
    { key: "start", header: "Starts", value: (row) => iso(row.startDate) },
    { key: "capacity", header: "Capacity", value: (row) => row.capacity },
    {
      key: "registrations",
      header: "Registrations",
      value: (row) => row.registrationCount,
    },
    { key: "ticket", header: "Ticket type", value: (row) => row.ticketType },
    { key: "price", header: "Ticket price", value: (row) => row.ticketPrice ?? 0 },
  ];
}

function registrationColumns(
  eventTitles: Map<string, string>
): CsvColumn<Doc<"registrations">>[] {
  return [
    { key: "name", header: "Attendee", value: (row) => row.attendeeName },
    { key: "email", header: "Email", value: (row) => row.attendeeEmail },
    {
      key: "event",
      header: "Event",
      value: (row) => eventTitles.get(row.eventId) ?? "",
    },
    { key: "status", header: "Status", value: (row) => row.status },
    { key: "checkedIn", header: "Checked in", value: (row) => (row.checkedIn ? "yes" : "no") },
    { key: "registered", header: "Registered", value: (row) => iso(row.registeredAt) },
    { key: "checkedInAt", header: "Checked in at", value: (row) => iso(row.checkedInAt) },
  ];
}

function auditColumns(): CsvColumn<Doc<"auditLogs">>[] {
  return [
    { key: "actor", header: "Actor", value: (row) => row.actorName },
    { key: "email", header: "Actor email", value: (row) => row.actorEmail },
    { key: "action", header: "Action", value: (row) => row.action },
    { key: "targetType", header: "Target type", value: (row) => row.targetType },
    { key: "target", header: "Target", value: (row) => row.targetLabel },
    { key: "createdAt", header: "When", value: (row) => iso(row.createdAt) },
  ];
}

interface AnalyticsRow {
  day: string;
  users: number;
  events: number;
  registrations: number;
  revenue: number;
  freeRevenue: number;
  paidRevenue: number;
}

function analyticsColumns(): CsvColumn<AnalyticsRow>[] {
  return [
    { key: "day", header: "Day", value: (row) => row.day },
    { key: "users", header: "New users", value: (row) => row.users },
    { key: "events", header: "New events", value: (row) => row.events },
    {
      key: "registrations",
      header: "Registrations",
      value: (row) => row.registrations,
    },
    { key: "revenue", header: "Estimated revenue", value: (row) => row.revenue },
    { key: "free", header: "Free revenue", value: (row) => row.freeRevenue },
    { key: "paid", header: "Paid revenue", value: (row) => row.paidRevenue },
  ];
}

async function loadUsers(
  ctx: MutationCtx,
  search: string | undefined
) {
  const rows = await ctx.db
    .query("users")
    .order("desc")
    .take(MAX_EXPORT_ROWS + 1);

  if (!search) return rows;
  const term = search.toLowerCase();
  return rows.filter(
    (row) =>
      row.name.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term)
  );
}

export const generate = mutation({
  args: {
    module: v.union(
      v.literal("users"),
      v.literal("events"),
      v.literal("registrations"),
      v.literal("audit"),
      v.literal("analytics"),
      v.literal("report")
    ),
    search: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
    filters: v.optional(analyticsFilterValidator),
  },
  handler: async (ctx, args): Promise<ExportResponse> => {
    const admin = await requireAdmin(ctx);

    const limit = await consumeRateLimit(ctx, "adminExport", admin._id);
    if (!limit.ok) {
      return { ok: false, reason: "rate_limited", message: limit.message };
    }

    const timezone = await getPlatformTimezone(ctx);
    const stamp = dayKeyFor(Date.now(), timezone);
    const exportModule = args.module as ExportModule;

    let rows: unknown[] = [];
    let columns: CsvColumn<unknown>[] = [];

    if (exportModule === "report") {
      if (!args.eventId) {
        return {
          ok: false,
          reason: "empty",
          message: "Choose an event before exporting its report.",
        };
      }

      const event = await ctx.db.get(args.eventId);
      if (!event) {
        return { ok: false, reason: "empty", message: "Event not found." };
      }

      const registrations = await ctx.db
        .query("registrations")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId!))
        .take(MAX_EXPORT_ROWS + 1);

      if (registrations.length > MAX_EXPORT_ROWS) {
        return tooMany(registrations.length);
      }

      const confirmed = registrations.filter(
        (registration) => registration.status === "confirmed"
      );
      const checkedIn = confirmed.filter((registration) => registration.checkedIn);

      const reportRows = [
        { metric: "Registered", value: registrations.length },
        { metric: "Confirmed", value: confirmed.length },
        { metric: "Checked in", value: checkedIn.length },
        { metric: "No-show", value: confirmed.length - checkedIn.length },
        { metric: "Cancelled", value: registrations.length - confirmed.length },
        {
          metric: "Capacity",
          value: event.capacity,
        },
        {
          metric: "Check-in rate",
          value:
            confirmed.length > 0
              ? `${((checkedIn.length / confirmed.length) * 100).toFixed(1)}%`
              : "0%",
        },
        {
          metric: "Estimated revenue",
          value:
            event.ticketType === "paid"
              ? confirmed.length * (event.ticketPrice ?? 0)
              : 0,
        },
        { metric: "Event", value: event.title },
        {
          metric: "Event starts",
          value: new Date(event.startDate).toISOString(),
        },
        {
          metric: "Event ends",
          value: new Date(event.endDate).toISOString(),
        },
      ];

      rows = reportRows;
      columns = [
        { key: "metric", header: "Metric", value: (row) => (row as { metric: string }).metric },
        { key: "value", header: "Value", value: (row) => (row as { value: string | number }).value },
      ] as CsvColumn<unknown>[];
    } else if (exportModule === "users") {
      const users = await loadUsers(ctx, args.search);
      if (users.length > MAX_EXPORT_ROWS) return tooMany(users.length);
      rows = users;
      columns = userColumns() as CsvColumn<unknown>[];
    } else if (exportModule === "events") {
      let events = await ctx.db
        .query("events")
        .withIndex("by_startDate")
        .order("desc")
        .take(MAX_EXPORT_ROWS + 1);

      if (args.search) {
        const term = args.search.toLowerCase();
        events = events.filter((event) => event.title.toLowerCase().includes(term));
      }
      if (events.length > MAX_EXPORT_ROWS) return tooMany(events.length);

      rows = events;
      columns = eventColumns() as CsvColumn<unknown>[];
    } else if (exportModule === "registrations") {
      let registrations = await ctx.db
        .query("registrations")
        .withIndex("by_registeredAt")
        .order("desc")
        .take(MAX_EXPORT_ROWS + 1);

      if (args.search) {
        const term = args.search.toLowerCase();
        registrations = registrations.filter(
          (registration) =>
            registration.attendeeName.toLowerCase().includes(term) ||
            registration.attendeeEmail.toLowerCase().includes(term)
        );
      }
      if (registrations.length > MAX_EXPORT_ROWS) {
        return tooMany(registrations.length);
      }

      const titles = new Map<string, string>();
      const eventIds = Array.from(
        new Set(registrations.map((registration) => registration.eventId))
      ).slice(0, 500);
      for (const eventId of eventIds) {
        const event = await ctx.db.get(eventId);
        if (event) titles.set(eventId, event.title);
      }

      rows = registrations;
      columns = registrationColumns(titles) as CsvColumn<unknown>[];
    } else if (exportModule === "audit") {
      const from = args.filters?.start;
      const to = args.filters?.end;

      let logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_createdAt", (q) => {
          if (from !== undefined && to !== undefined) {
            return q.gte("createdAt", from).lte("createdAt", to);
          }
          if (from !== undefined) return q.gte("createdAt", from);
          if (to !== undefined) return q.lte("createdAt", to);
          return q;
        })
        .order("desc")
        .take(MAX_EXPORT_ROWS + 1);

      if (args.search) {
        const term = args.search.toLowerCase();
        logs = logs.filter(
          (log) =>
            log.actorName.toLowerCase().includes(term) ||
            log.actorEmail.toLowerCase().includes(term) ||
            log.targetLabel.toLowerCase().includes(term)
        );
      }
      if (logs.length > MAX_EXPORT_ROWS) return tooMany(logs.length);

      rows = logs;
      columns = auditColumns() as CsvColumn<unknown>[];
    } else {
      const filters: AnalyticsFilterArgs =
        args.filters ??
        ({
          start: Date.now() - 30 * 24 * 60 * 60 * 1000,
          end: Date.now(),
        } as AnalyticsFilterArgs);

      const scope = await resolveAnalyticsScope(ctx, filters);
      const keys = dayKeysBetween(filters.start, filters.end, scope.timezone);
      const index = new Map(keys.map((key, position) => [key, position]));

      const buckets: AnalyticsRow[] = keys.map((day) => ({
        day,
        users: 0,
        events: 0,
        registrations: 0,
        revenue: 0,
        freeRevenue: 0,
        paidRevenue: 0,
      }));

      const keyFor = (timestamp: number) => dayKeyFor(timestamp, scope.timezone);
      const priceByEvent = new Map(
        scope.events.map((event) => [
          event._id,
          event.ticketType === "paid" ? event.ticketPrice ?? 0 : 0,
        ])
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
        if (registration.status === "confirmed") {
          const price = priceByEvent.get(registration.eventId) ?? 0;
          buckets[position].revenue += price;
          if (price > 0) buckets[position].paidRevenue += price;
          else buckets[position].freeRevenue += price;
        }
      }

      rows = buckets;
      columns = analyticsColumns() as CsvColumn<unknown>[];
    }

    if (rows.length === 0) {
      return {
        ok: false,
        reason: "empty",
        message: "There is nothing to export for this filter set.",
      };
    }

    const csv = serializeCsv(rows, columns);
    const filename = csvFilename(exportModule, stamp);

    await logAdminAction(
      ctx,
      admin,
      "export.generated",
      "export",
      exportModule,
      `${exportModule} export (${rows.length} rows)`,
      { module: exportModule, rowCount: rows.length, filename }
    );

    return { ok: true, filename, csv, rowCount: rows.length };
  },
});
