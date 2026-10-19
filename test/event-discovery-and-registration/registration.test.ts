import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const identity = identityFor("token|attendee", "Attendee", "attendee@example.com");

async function setup() {
  const t = createConvexTest();
  const ids = await t.run(async (ctx) => {
    const attendeeId = await seedUser(ctx, {
      name: identity.name,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
    });
    const organizerId = await seedUser(ctx, {
      name: "Organizer",
      tokenIdentifier: "token|organizer",
      email: "organizer@example.com",
    });
    const eventId = await seedEvent(ctx, organizerId, { capacity: 10 });
    return { attendeeId, organizerId, eventId };
  });
  return { t, ...ids };
}

describe("AC-008: registration issues a confirmed ticket", () => {
  test("AC-008: a signed-in attendee is stored as confirmed with a unique EVT QR code and the count increments", async () => {
    const { t, eventId } = await setup();

    await t.withIdentity(identity).mutation(api.registrations.registerForEvent, {
      eventId,
      attendeeName: "Ada Lovelace",
      attendeeEmail: "ada@example.com",
    });

    const snapshot = await t.run(async (ctx) => {
      const registrations = await ctx.db.query("registrations").collect();
      const event = await ctx.db.get(eventId);
      return { registrations, event };
    });

    expect(snapshot.registrations).toHaveLength(1);
    expect(snapshot.registrations[0].status).toBe("confirmed");
    expect(snapshot.registrations[0].attendeeName).toBe("Ada Lovelace");
    expect(snapshot.registrations[0].qrCode).toMatch(/^EVT-\d+-[0-9A-F]{8}$/);
    expect(snapshot.event?.registrationCount).toBe(1);
  });
});

describe("AC-009: full, duplicate and cancelled registrations", () => {
  test("AC-009: a full event rejects registration", async () => {
    const { t, eventId } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.patch(eventId, { capacity: 1, registrationCount: 1 });
    });

    await expect(
      t.withIdentity(identity).mutation(api.registrations.registerForEvent, {
        eventId,
        attendeeName: "Ada",
        attendeeEmail: "ada@example.com",
      })
    ).rejects.toThrow(/full/i);
  });

  test("AC-009: a confirmed attendee cannot register twice", async () => {
    const { t, attendeeId, eventId } = await setup();
    await t.run(async (ctx) => {
      await seedRegistration(ctx, eventId, attendeeId, { status: "confirmed" });
    });

    await expect(
      t.withIdentity(identity).mutation(api.registrations.registerForEvent, {
        eventId,
        attendeeName: "Ada",
        attendeeEmail: "ada@example.com",
      })
    ).rejects.toThrow(/already registered/i);
  });

  test("AC-009: a cancelled registration is reactivated and the count increments", async () => {
    const { t, attendeeId, eventId } = await setup();
    const registrationId = await t.run(async (ctx) => {
      await ctx.db.patch(eventId, { registrationCount: 0 });
      return seedRegistration(ctx, eventId, attendeeId, {
        status: "cancelled",
        qrCode: "EVT-OLD-00000000",
      });
    });

    await t.withIdentity(identity).mutation(api.registrations.registerForEvent, {
      eventId,
      attendeeName: "Ada",
      attendeeEmail: "ada@example.com",
    });

    const snapshot = await t.run(async (ctx) => ({
      registration: await ctx.db.get(registrationId),
      event: await ctx.db.get(eventId),
    }));

    expect(snapshot.registration?.status).toBe("confirmed");
    expect(snapshot.registration?.qrCode).not.toBe("EVT-OLD-00000000");
    expect(snapshot.event?.registrationCount).toBe(1);
  });
});

describe("AC-011: cancelling a registration", () => {
  test("AC-011: the owner cancels, the status becomes cancelled, and the event count decreases", async () => {
    const { t, attendeeId, eventId } = await setup();
    const registrationId = await t.run(async (ctx) => {
      await ctx.db.patch(eventId, { registrationCount: 1 });
      return seedRegistration(ctx, eventId, attendeeId);
    });

    await t.withIdentity(identity).mutation(api.registrations.cancelRegistration, {
      registrationId,
    });

    const snapshot = await t.run(async (ctx) => ({
      registration: await ctx.db.get(registrationId),
      event: await ctx.db.get(eventId),
    }));

    expect(snapshot.registration?.status).toBe("cancelled");
    expect(snapshot.event?.registrationCount).toBe(0);
  });

  test("AC-011: another user's registration cannot be cancelled", async () => {
    const { t, eventId } = await setup();
    const registrationId = await t.run(async (ctx) => {
      const otherId = await seedUser(ctx, {
        name: "Other",
        tokenIdentifier: "token|other",
        email: "other@example.com",
      });
      await ctx.db.patch(eventId, { registrationCount: 1 });
      return seedRegistration(ctx, eventId, otherId);
    });

    await expect(
      t.withIdentity(identity).mutation(api.registrations.cancelRegistration, {
        registrationId,
      })
    ).rejects.toThrow(/unauthorized/i);
  });
});
