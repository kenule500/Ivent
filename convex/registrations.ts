import { v } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { secureQuery, secureMutation } from "./helpers";

// Cryptographically secure QR code generator
function generateQRCode() {
  return `EVT-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

/**
 * Count confirmed registrations from the source of truth. The denormalized
 * `events.registrationCount` is always written from this value, so it cannot
 * drift when a registration is cancelled or reactivated.
 */
async function countConfirmedRegistrations(
  ctx: MutationCtx,
  eventId: Id<"events">
) {
  const confirmed = await ctx.db
    .query("registrations")
    .withIndex("by_event_status", (q) =>
      q.eq("eventId", eventId).eq("status", "confirmed")
    )
    .collect();

  return confirmed.length;
}

export const registerForEvent = secureMutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    const confirmedCount = await countConfirmedRegistrations(ctx, args.eventId);
    if (confirmedCount >= event.capacity) throw new Error("Event is full");

    const existingRegistration = await ctx.db
      .query("registrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", ctx.user._id)
      )
      .unique();

    if (existingRegistration && existingRegistration.status === "confirmed") {
      throw new Error("You are already registered for this event");
    }

    const qrCode = generateQRCode();

    if (existingRegistration && existingRegistration.status === "cancelled") {
      await ctx.db.patch(existingRegistration._id, {
        status: "confirmed",
        checkedIn: false,
        qrCode,
        attendeeName: ctx.user.name,
        attendeeEmail: ctx.user.email,
        registeredAt: Date.now(),
      });
      await ctx.db.patch(args.eventId, { registrationCount: confirmedCount + 1 });
      return existingRegistration._id;
    }

    const registrationId = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      userId: ctx.user._id,
      attendeeName: ctx.user.name,
      attendeeEmail: ctx.user.email,
      qrCode,
      checkedIn: false,
      status: "confirmed",
      registeredAt: Date.now(),
    });

    await ctx.db.patch(args.eventId, { registrationCount: confirmedCount + 1 });
    return registrationId;
  },
});

// Check if current user is registered for an event
export const checkRegistration = secureQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("registrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", ctx.user._id)
      )
      .unique();
  },
});

// Get user's registered tickets with event details
export const getMyRegistrations = secureQuery({
  args: {},
  handler: async (ctx) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      registrations.map(async (reg) => {
        const event = await ctx.db.get(reg.eventId);
        return {
          ...reg,
          event,
        };
      })
    );
  },
});

export const cancelRegistration = secureMutation({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) throw new Error("Registration not found");
    if (registration.userId !== ctx.user._id) throw new Error("Unauthorized");

    if (registration.status === "cancelled") {
      throw new Error("Registration is already cancelled");
    }

    const event = await ctx.db.get(registration.eventId);
    if (!event) throw new Error("Event not found");

    await ctx.db.patch(args.registrationId, { status: "cancelled" });

    const confirmedCount = await countConfirmedRegistrations(
      ctx,
      registration.eventId
    );
    await ctx.db.patch(registration.eventId, {
      registrationCount: confirmedCount,
    });

    return { success: true };
  },
});

// Get event attendees (organizers only)
export const getEventRegistrations = secureQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    if (event.organizerId !== ctx.user._id) {
      throw new Error("You are not authorized to view registrations");
    }

    return await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
  },
});

// Check in attendee via QR Code (rate limited to prevent brute forcing)
export const checkInAttendee = secureMutation({
  args: { qrCode: v.string() },
  rateLimitName: "checkInRateLimit", // 👈 Protects against ticket brute-forcing
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_qrCode", (q) => q.eq("qrCode", args.qrCode))
      .unique();

    // Return instead of throwing so the consumed rate-limit token commits.
    // A thrown mutation rolls back its own writes, which would let an attacker
    // keep guessing QR codes without ever hitting the brute-force limit.
    if (!registration || registration.status !== "confirmed") {
      return { success: false, message: "Invalid or cancelled QR code" };
    }

    const event = await ctx.db.get(registration.eventId);
    if (!event) throw new Error("Event not found");
    if (event.organizerId !== ctx.user._id) throw new Error("Unauthorized organizer");

    if (registration.checkedIn) {
      return { success: false, message: "Already checked in", registration };
    }

    const checkedInAt = Date.now();
    await ctx.db.patch(registration._id, { checkedIn: true, checkedInAt });

    return {
      success: true,
      message: "Check-in successful",
      registration: { ...registration, checkedIn: true, checkedInAt },
    };
  },
});
