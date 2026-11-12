import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { consumeRateLimit, requireEventOrganizer, secureMutation, secureQuery } from "./helpers";
import { MAX_OFFLINE_CHECKINS, offlineCheckInValidator } from "./validators";

/**
 * Door mode (BP-005).
 *
 * The query is the source of truth for the door console. It is organizer-only,
 * returns a small attendee payload suitable for IndexedDB, and exposes the
 * counters the console shows before a scan.
 */

export const getDoorSnapshot = secureQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const { event } = await requireEventOrganizer(ctx, args.eventId);

    const confirmed = await ctx.db
      .query("registrations")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "confirmed")
      )
      .collect();

    const checkedIn = await ctx.db
      .query("registrations")
      .withIndex("by_event_checkedIn", (q) =>
        q.eq("eventId", args.eventId).eq("checkedIn", true)
      )
      .collect();

    const recent = await ctx.db
      .query("registrations")
      .withIndex("by_event_checkedInAt", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(50);

    return {
      event: {
        _id: event._id,
        title: event.title,
        slug: event.slug,
        startDate: event.startDate,
        endDate: event.endDate,
        timezone: event.timezone,
        currency: event.currency ?? "USD",
        locale: event.locale ?? "en",
        doorModeEnabled: event.doorModeEnabled !== false,
        locationType: event.locationType,
        venue: event.venue,
        city: event.city,
        state: event.state,
        country: event.country,
      },
      counts: {
        confirmed: confirmed.length,
        checkedIn: checkedIn.length,
        pending: Math.max(0, confirmed.length - checkedIn.length),
      },
      attendees: confirmed.map((registration) => ({
        _id: registration._id,
        attendeeName: registration.attendeeName,
        attendeeEmail: registration.attendeeEmail,
        qrCode: registration.qrCode,
        checkedIn: registration.checkedIn,
        checkedInAt: registration.checkedInAt,
      })),
      recent: recent
        .filter((registration) => registration.checkedIn)
        .slice(0, 10)
        .map((registration) => ({
          _id: registration._id,
          attendeeName: registration.attendeeName,
          checkedInAt: registration.checkedInAt ?? registration.registeredAt,
          offline: registration.offlineScannedAt !== undefined,
        })),
      serverTime: Date.now(),
    };
  },
});

export const searchDoorAttendees = secureQuery({
  args: {
    eventId: v.id("events"),
    term: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireEventOrganizer(ctx, args.eventId);

    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const term = args.term.trim();

    const registrations = term
      ? await ctx.db
          .query("registrations")
          .withSearchIndex("search_attendee", (q) =>
            q.search("attendeeName", term).eq("eventId", args.eventId)
          )
          .take(limit)
      : await ctx.db
          .query("registrations")
          .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
          .take(limit);

    return registrations.map((registration) => ({
      _id: registration._id,
      attendeeName: registration.attendeeName,
      attendeeEmail: registration.attendeeEmail,
      qrCode: registration.qrCode,
      checkedIn: registration.checkedIn,
      checkedInAt: registration.checkedInAt,
      status: registration.status,
    }));
  },
});

export const syncOfflineCheckIns = secureMutation({
  args: {
    eventId: v.id("events"),
    items: v.array(offlineCheckInValidator),
  },
  handler: async (ctx, args) => {
    const { user, event } = await requireEventOrganizer(ctx, args.eventId);

    if (args.items.length > MAX_OFFLINE_CHECKINS) {
      throw new Error(
        `Sync at most ${MAX_OFFLINE_CHECKINS} scans at a time.`
      );
    }

    const budget = await consumeRateLimit(
      ctx,
      "doorSyncRateLimit",
      user._id
    );
    if (!budget.ok) throw new Error(budget.message);

    const results: Array<{
      qrCode: string;
      outcome:
        | "synced"
        | "already_checked_in"
        | "not_found"
        | "wrong_event"
        | "cancelled";
      registrationId?: Id<"registrations">;
    }> = [];

    for (const item of args.items) {
      const registration = await ctx.db
        .query("registrations")
        .withIndex("by_qrCode", (q) => q.eq("qrCode", item.qrCode))
        .unique();

      if (!registration) {
        results.push({ qrCode: item.qrCode, outcome: "not_found" });
        continue;
      }
      if (registration.eventId !== args.eventId) {
        results.push({ qrCode: item.qrCode, outcome: "wrong_event" });
        continue;
      }
      if (registration.status !== "confirmed") {
        results.push({ qrCode: item.qrCode, outcome: "cancelled" });
        continue;
      }
      if (registration.checkedIn) {
        results.push({
          qrCode: item.qrCode,
          outcome: "already_checked_in",
          registrationId: registration._id,
        });
        continue;
      }

      await ctx.db.patch(registration._id, {
        checkedIn: true,
        checkedInAt: Date.now(),
        offlineScannedAt: item.scannedAt,
      });

      results.push({
        qrCode: item.qrCode,
        outcome: "synced",
        registrationId: registration._id,
      });
    }

    return {
      eventId: event._id,
      synced: results.filter((result) => result.outcome === "synced").length,
      results,
    };
  },
});
