import { v } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { secureQuery, secureMutation } from "./helpers";
import { internal } from "./_generated/api";
import {
  localeValidator,
  registrationAnswerValidator,
  validateAnswers,
} from "./validators";

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
    answers: v.optional(v.array(registrationAnswerValidator)),
    locale: v.optional(localeValidator),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    const confirmedCount = await countConfirmedRegistrations(ctx, args.eventId);
    if (confirmedCount >= event.capacity) throw new Error("Event is full");

    const answers = validateAnswers(
      event.registrationQuestions ?? [],
      args.answers
    );
    const locale = args.locale ?? event.locale ?? "en";

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
        answers: answers.length > 0 ? answers : undefined,
        locale,
      });
      await ctx.db.patch(args.eventId, { registrationCount: confirmedCount + 1 });

      await ctx.scheduler.runAfter(
        0,
        internal.lifecycleEmails.sendLifecycleEmail,
        {
          registrationId: existingRegistration._id,
          template: "registration_confirmation",
        }
      );

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
      answers: answers.length > 0 ? answers : undefined,
      locale,
    });

    await ctx.db.patch(args.eventId, { registrationCount: confirmedCount + 1 });

    // Confirmation is scheduled, never awaited: provider latency must not
    // become registration latency (FR-002, NFR-002).
    await ctx.scheduler.runAfter(
      0,
      internal.lifecycleEmails.sendLifecycleEmail,
      { registrationId, template: "registration_confirmation" }
    );

    return registrationId;
  },
});

/**
 * Attendee email preference (FR-007).
 *
 * Turns reminders and follow-ups on or off for the caller's own registrations.
 * The registration confirmation is transactional and is not affected (NFR-001).
 */
export const setEmailPreference = secureMutation({
  args: { emailOptOut: v.boolean() },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    for (const registration of registrations) {
      await ctx.db.patch(registration._id, { emailOptOut: args.emailOptOut });
    }

    return { updated: registrations.length, emailOptOut: args.emailOptOut };
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

    const walletObjectId = registration.wallet?.objectId;
    await ctx.db.patch(args.registrationId, {
      status: "cancelled",
      ...(registration.wallet
        ? {
            wallet: {
              ...registration.wallet,
              status: "voided" as const,
              updatedAt: Date.now(),
            },
          }
        : {}),
    });

    if (walletObjectId) {
      // The provider call is best-effort: the local state is already voided,
      // and a missing Google credential must not block cancellation.
      await ctx.scheduler.runAfter(
        0,
        internal.walletNode.voidWalletPass,
        { objectId: walletObjectId }
      );
    }

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

/**
 * Check in attendee via QR Code (rate limited to prevent brute forcing).
 *
 * `eventId` is optional for backward compatibility with the existing scanner,
 * but the door console always supplies it so a ticket from another event cannot
 * be checked in by mistake. The stable `success`/`message` shape is preserved;
 * `outcome` adds machine-readable detail for the newer UI.
 */
export const checkInAttendee = secureMutation({
  args: {
    qrCode: v.string(),
    eventId: v.optional(v.id("events")),
    source: v.optional(
      v.union(
        v.literal("qr"),
        v.literal("door"),
        v.literal("manual"),
        v.literal("offline")
      )
    ),
  },
  rateLimitName: "checkInRateLimit", // 👈 Protects against ticket brute-forcing
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_qrCode", (q) => q.eq("qrCode", args.qrCode))
      .unique();

    // Return instead of throwing so the consumed rate-limit token commits.
    // A thrown mutation rolls back its own writes, which would let an attacker
    // keep guessing QR codes without ever hitting the brute-force limit.
    if (!registration) {
      return {
        success: false,
        outcome: "not_found" as const,
        message: "Invalid QR code",
      };
    }

    if (registration.status !== "confirmed") {
      return {
        success: false,
        outcome: "cancelled" as const,
        message: "This registration was cancelled",
      };
    }

    if (args.eventId && registration.eventId !== args.eventId) {
      return {
        success: false,
        outcome: "wrong_event" as const,
        message: "This ticket belongs to a different event",
      };
    }

    const event = await ctx.db.get(registration.eventId);
    if (!event) throw new Error("Event not found");
    if (event.organizerId !== ctx.user._id) throw new Error("Unauthorized organizer");

    if (registration.checkedIn) {
      return {
        success: false,
        outcome: "already_checked_in" as const,
        message: "Already checked in",
        registration,
      };
    }

    const checkedInAt = Date.now();
    await ctx.db.patch(registration._id, { checkedIn: true, checkedInAt });

    return {
      success: true,
      outcome: "checked_in" as const,
      message: "Check-in successful",
      registration: { ...registration, checkedIn: true, checkedInAt },
    };
  },
});
