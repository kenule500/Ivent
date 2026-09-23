import { v } from "convex/values";
import { secureQuery, secureMutation } from "./helpers";

// Cryptographically secure QR code generator
function generateQRCode() {
  return `EVT-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export const registerForEvent = secureMutation({
  args: {
    eventId: v.id("events"),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.registrationCount >= event.capacity) throw new Error("Event is full");

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
        registeredAt: Date.now(),
      });
      await ctx.db.patch(args.eventId, { registrationCount: event.registrationCount + 1 });
      return existingRegistration._id;
    }

    const registrationId = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      userId: ctx.user._id,
      attendeeName: args.attendeeName,
      attendeeEmail: args.attendeeEmail,
      qrCode,
      checkedIn: false,
      status: "confirmed",
      registeredAt: Date.now(),
    });

    await ctx.db.patch(args.eventId, { registrationCount: event.registrationCount + 1 });
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

    if (event.registrationCount > 0) {
      await ctx.db.patch(registration.eventId, {
        registrationCount: event.registrationCount - 1,
      });
    }

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

    if (!registration || registration.status !== "confirmed") {
      throw new Error("Invalid or cancelled QR code");
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




// Register for an event
// export const registerForEvent = mutation({
//   args: {
//     eventId: v.id("events"),
//     attendeeName: v.string(),
//     attendeeEmail: v.string(),
//   },
//   handler: async (ctx, args) => {
//     // const user = await ctx.runQuery(internal.users.getCurrentUser);
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) {
//       throw new Error("Unauthenticated. Please sign in to create events.");
//     }

//     // 2. Fetch the actual user record from your "users" collection
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_token", (q) =>
//         q.eq("tokenIdentifier", identity.tokenIdentifier)
//       )
//       .unique();

//     if (!user) {
//         throw new Error("User profile records not found.");
//     }
    

//     const event = await ctx.db.get(args.eventId);
//     if (!event) {
//       throw new Error("Event not found");
//     }

//     // Check if event is full
//     if (event.registrationCount >= event.capacity) {
//       throw new Error("Event is full");
//     }

//     // Check if user already registered
//     const existingRegistration = await ctx.db
//       .query("registrations")
//       .withIndex("by_event_user", (q) =>
//         q.eq("eventId", args.eventId).eq("userId", user._id)
//       )
//       .unique();

//     if (existingRegistration) {
//       throw new Error("You are already registered for this event");
//     }

//     // Create registration
//     const qrCode = generateQRCode();
//     const registrationId = await ctx.db.insert("registrations", {
//       eventId: args.eventId,
//       userId: user._id,
//       attendeeName: args.attendeeName,
//       attendeeEmail: args.attendeeEmail,
//       qrCode: qrCode,
//       checkedIn: false,
//       status: "confirmed",
//       registeredAt: Date.now(),
//     });

//     // Update event registration count
//     await ctx.db.patch(args.eventId, {
//       registrationCount: event.registrationCount + 1,
//     });

//     return registrationId;
//   },
// });


// Cancel registration
// export const cancelRegistration = mutation({
//   args: { registrationId: v.id("registrations") },
//   handler: async (ctx, args) => {
//     // const user = await ctx.runQuery(internal.users.getCurrentUser);

//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) {
//       throw new Error("Unauthenticated. Please sign in to create events.");
//     }

//     // 2. Fetch the actual user record from your "users" collection
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_token", (q) =>
//         q.eq("tokenIdentifier", identity.tokenIdentifier)
//       )
//       .unique();

//     if (!user) {
//         throw new Error("User profile records not found.");
//     }
    

//     const registration = await ctx.db.get(args.registrationId);
//     if (!registration) {
//       throw new Error("Registration not found");
//     }

//     // Check if user owns this registration
//     if (registration.userId !== user._id) {
//       throw new Error("You are not authorized to cancel this registration");
//     }

//     const event = await ctx.db.get(registration.eventId);
//     if (!event) {
//       throw new Error("Event not found");
//     }

//     // Update registration status
//     await ctx.db.patch(args.registrationId, {
//       status: "cancelled",
//     });

//     // Decrement event registration count
//     if (event.registrationCount > 0) {
//       await ctx.db.patch(registration.eventId, {
//         registrationCount: event.registrationCount - 1,
//       });
//     }

//     return { success: true };
//   },
// });


// Check-in attendee with QR codea
// export const checkInAttendee = mutation({
//   args: { qrCode: v.string() },
//   handler: async (ctx, args) => {
//     // const user = await ctx.runQuery(internal.users.getCurrentUser);
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) {
//       throw new Error("Unauthenticated. Please sign in to create events.");
//     }

//     // 2. Fetch the actual user record from your "users" collection
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_token", (q) =>
//         q.eq("tokenIdentifier", identity.tokenIdentifier)
//       )
//       .unique();

//     if (!user) {
//         throw new Error("User profile records not found.");
//     }
    

//     const registration = await ctx.db
//       .query("registrations")
//       .withIndex("by_qrCode", (q) => q.eq("qrCode", args.qrCode))
//       .unique();

//     if (!registration) {
//       throw new Error("Invalid QR code");
//     }

//     const event = await ctx.db.get(registration.eventId);
//     if (!event) {
//       throw new Error("Event not found");
//     }

//     // Check if user is the organizer
//     if (event.organizerId !== user._id) {
//       throw new Error("You are not authorized to check in attendees");
//     }

//     // Check if already checked in
//     if (registration.checkedIn) {
//       return {
//         success: false,
//         message: "Already checked in",
//         registration,
//       };
//     }

//     // Check in
//     await ctx.db.patch(registration._id, {
//       checkedIn: true,
//       checkedInAt: Date.now(),
//     });

//     return {
//       success: true,
//       message: "Check-in successful",
//       registration: {
//         ...registration,
//         checkedIn: true,
//         checkedInAt: Date.now(),
//       },
//     };
//   },
// });