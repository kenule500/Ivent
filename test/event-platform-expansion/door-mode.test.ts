// @vitest-environment node
import { describe, expect, test } from "vitest";
import { api } from "@/convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const organizerToken = "token|door-organizer";
const otherToken = "token|door-other";
const organizerIdentity = identityFor(organizerToken, "Door Organizer");
const otherIdentity = identityFor(otherToken, "Other User");

async function setup() {
  const t = createConvexTest();
  const organizerId = await t.run(async (ctx) =>
    seedUser(ctx, {
      tokenIdentifier: organizerToken,
      name: "Door Organizer",
      email: "door-organizer@example.com",
    })
  );
  const otherId = await t.run(async (ctx) =>
    seedUser(ctx, {
      tokenIdentifier: otherToken,
      name: "Other User",
      email: "other@example.com",
    })
  );
  const eventId = await t.run(async (ctx) =>
    seedEvent(ctx, organizerId, {
      slug: "door-fixture",
      title: "Door Fixture",
      capacity: 50,
      countryCode: "NG",
      currency: "NGN",
    })
  );

  return { t, organizerId, otherId, eventId };
}

describe("AC-007: door snapshot", () => {
  test("AC-007: door snapshot returns counts, rate inputs, last check-in, ten recent check-ins, and connection-ready data", async () => {
    const { t, eventId } = await setup();
    const base = Date.now() - 60_000;

    await t.run(async (ctx) => {
      for (let index = 0; index < 12; index += 1) {
        await seedRegistration(ctx, eventId, await seedUser(ctx, {
          tokenIdentifier: `token|door-attendee-${index}`,
          name: `Attendee ${index}`,
          email: `attendee-${index}@example.com`,
        }), {
          attendeeName: `Attendee ${index}`,
          attendeeEmail: `attendee-${index}@example.com`,
          qrCode: `DOOR-${index}`,
          checkedIn: index < 11,
          checkedInAt: index < 11 ? base + index * 1000 : undefined,
          offlineScannedAt: index === 4 ? base + 4000 : undefined,
        });
      }
    });

    const snapshot = await t
      .withIdentity(organizerIdentity)
      .query(api.door.getDoorSnapshot, { eventId });

    expect(snapshot.event.title).toBe("Door Fixture");
    expect(snapshot.event.doorModeEnabled).toBe(true);
    expect(snapshot.counts).toEqual({ confirmed: 12, checkedIn: 11, pending: 1 });
    expect(snapshot.attendees).toHaveLength(12);
    expect(snapshot.recent).toHaveLength(10);
    expect(snapshot.recent[0].checkedInAt).toBe(base + 10_000);
    expect(snapshot.recent[0].attendeeName).toBe("Attendee 10");
    expect(snapshot.recent.some((entry) => entry.offline)).toBe(true);
    expect(snapshot.serverTime).toBeGreaterThan(0);
    expect(snapshot.event.currency).toBe("NGN");
    expect(snapshot.event.locale).toBe("en");
  });
});

describe("AC-008: check-in outcomes", () => {
  test("AC-008: confirmed tickets check in once; duplicates keep the original time; cancelled and unknown tickets are distinct", async () => {
    const { t, eventId } = await setup();
    const attendeeId = await t.run(async (ctx) =>
      seedUser(ctx, {
        tokenIdentifier: "token|door-ada",
        name: "Ada Lovelace",
        email: "ada@example.com",
      })
    );
    const registrationId = await t.run(async (ctx) =>
      seedRegistration(ctx, eventId, attendeeId, {
        attendeeName: "Ada Lovelace",
        attendeeEmail: "ada@example.com",
        qrCode: "EVT-DOOR-ADA",
      })
    );
    await t.run(async (ctx) =>
      seedRegistration(ctx, eventId, attendeeId, {
        attendeeName: "Cancelled Person",
        attendeeEmail: "cancelled@example.com",
        qrCode: "EVT-DOOR-CANCELLED",
        status: "cancelled",
      })
    );

    const asOrganizer = t.withIdentity(organizerIdentity);
    const first = await asOrganizer.mutation(api.registrations.checkInAttendee, {
      qrCode: "EVT-DOOR-ADA",
      eventId,
      source: "door",
    });
    expect(first).toMatchObject({
      success: true,
      outcome: "checked_in",
    });
    const firstTimestamp = first.registration?.checkedInAt;
    expect(firstTimestamp).toBeTypeOf("number");

    const second = await asOrganizer.mutation(api.registrations.checkInAttendee, {
      qrCode: "EVT-DOOR-ADA",
      eventId,
      source: "door",
    });
    expect(second).toMatchObject({
      success: false,
      outcome: "already_checked_in",
    });
    expect(second.registration?.checkedInAt).toBe(firstTimestamp);

    const cancelled = await asOrganizer.mutation(
      api.registrations.checkInAttendee,
      { qrCode: "EVT-DOOR-CANCELLED", eventId, source: "door" }
    );
    expect(cancelled).toMatchObject({
      success: false,
      outcome: "cancelled",
    });

    const unknown = await asOrganizer.mutation(
      api.registrations.checkInAttendee,
      { qrCode: "EVT-DOOR-UNKNOWN", eventId, source: "door" }
    );
    expect(unknown).toMatchObject({
      success: false,
      outcome: "not_found",
    });

    const search = await asOrganizer.query(api.door.searchDoorAttendees, {
      eventId,
      term: "Ada",
    });
    expect(search.map((entry) => entry.attendeeName)).toContain("Ada Lovelace");
    expect(search[0].status).toBe("confirmed");

    const stored = await t.run(async (ctx) => ctx.db.get(registrationId));
    expect(stored?.checkedIn).toBe(true);
    expect(stored?.checkedInAt).toBe(firstTimestamp);

    const snapshot = await asOrganizer.query(api.door.getDoorSnapshot, {
      eventId,
    });
    expect(snapshot.counts.checkedIn).toBe(1);
  });
});

describe("AC-009: door authorization", () => {
  test("AC-009: non-organizers and unauthenticated callers are denied every door query and mutation server-side", async () => {
    const { t, eventId } = await setup();

    await expect(
      t.query(api.door.getDoorSnapshot, { eventId })
    ).rejects.toThrow(/Unauthenticated/i);

    await expect(
      t.withIdentity(otherIdentity).query(api.door.getDoorSnapshot, { eventId })
    ).rejects.toThrow(/not authorized/i);

    await expect(
      t.withIdentity(otherIdentity).query(api.door.searchDoorAttendees, {
        eventId,
        term: "Ada",
      })
    ).rejects.toThrow(/not authorized/i);

    await expect(
      t.withIdentity(otherIdentity).mutation(api.door.syncOfflineCheckIns, {
        eventId,
        items: [{ qrCode: "EVT-ANY", scannedAt: Date.now() }],
      })
    ).rejects.toThrow(/not authorized/i);
  });
});
