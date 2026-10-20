import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const organizerIdentity = identityFor("token|organizer", "Organizer", "organizer@example.com");
const otherIdentity = identityFor("token|other", "Other", "other@example.com");

async function setup() {
  const t = createConvexTest();
  const ids = await t.run(async (ctx) => {
    const organizerId = await seedUser(ctx, {
      name: "Organizer",
      tokenIdentifier: organizerIdentity.tokenIdentifier,
      email: organizerIdentity.email,
    });
    const attendeeId = await seedUser(ctx, {
      name: "Attendee",
      tokenIdentifier: "token|attendee",
      email: "attendee@example.com",
    });
    await seedUser(ctx, {
      name: "Other",
      tokenIdentifier: otherIdentity.tokenIdentifier,
      email: otherIdentity.email,
    });
    const eventId = await seedEvent(ctx, organizerId);
    const registrationId = await seedRegistration(ctx, eventId, attendeeId, {
      qrCode: "EVT-1-ABCD1234",
    });
    return { organizerId, attendeeId, eventId, registrationId };
  });
  return { t, ...ids };
}

describe("AC-007: QR check-in", () => {
  test("AC-007: a valid confirmed ticket is checked in", async () => {
    const { t, registrationId } = await setup();

    const result = await t.withIdentity(organizerIdentity).mutation(
      api.registrations.checkInAttendee,
      { qrCode: "EVT-1-ABCD1234" }
    );

    const registration = await t.run((ctx) => ctx.db.get(registrationId));

    expect(result.success).toBe(true);
    expect(registration?.checkedIn).toBe(true);
    expect(registration?.checkedInAt).toBeTypeOf("number");
  });

  test("AC-007: unknown and cancelled codes are rejected", async () => {
    const { t, registrationId } = await setup();

    const unknown = await t.withIdentity(organizerIdentity).mutation(
      api.registrations.checkInAttendee,
      { qrCode: "EVT-UNKNOWN" }
    );
    expect(unknown.success).toBe(false);
    expect(unknown.message).toMatch(/invalid or cancelled/i);

    await t.run((ctx) => ctx.db.patch(registrationId, { status: "cancelled" }));

    const cancelled = await t.withIdentity(organizerIdentity).mutation(
      api.registrations.checkInAttendee,
      { qrCode: "EVT-1-ABCD1234" }
    );
    expect(cancelled.success).toBe(false);
    expect(cancelled.message).toMatch(/invalid or cancelled/i);
  });

  test("AC-007: a second scan reports that the attendee is already checked in", async () => {
    const { t } = await setup();

    await t.withIdentity(organizerIdentity).mutation(api.registrations.checkInAttendee, {
      qrCode: "EVT-1-ABCD1234",
    });
    const second = await t.withIdentity(organizerIdentity).mutation(
      api.registrations.checkInAttendee,
      { qrCode: "EVT-1-ABCD1234" }
    );

    expect(second.success).toBe(false);
    expect(second.message).toMatch(/already checked in/i);
  });

  test("AC-007: a non-organizer cannot check attendees in", async () => {
    const { t } = await setup();

    await expect(
      t.withIdentity(otherIdentity).mutation(api.registrations.checkInAttendee, {
        qrCode: "EVT-1-ABCD1234",
      })
    ).rejects.toThrow(/unauthorized organizer/i);
  });

  test("AC-007: check-in is limited to ten attempts per minute", async () => {
    const { t } = await setup();

    // The first scan checks the attendee in; the next nine are committed
    // "already checked in" responses, each consuming one token.
    for (let i = 0; i < 10; i++) {
      const result = await t.withIdentity(organizerIdentity).mutation(
        api.registrations.checkInAttendee,
        { qrCode: "EVT-1-ABCD1234" }
      );
      expect(result).toBeDefined();
    }

    await expect(
      t.withIdentity(organizerIdentity).mutation(api.registrations.checkInAttendee, {
        qrCode: "EVT-1-ABCD1234",
      })
    ).rejects.toThrow(/rate limit/i);
  });

  test("AC-007: failed scans also count toward the brute-force limit", async () => {
    const { t } = await setup();

    for (let i = 0; i < 10; i++) {
      const result = await t.withIdentity(organizerIdentity).mutation(
        api.registrations.checkInAttendee,
        { qrCode: `EVT-GUESS-${i}` }
      );
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/invalid or cancelled/i);
    }

    // The failed scan must still consume its token: if the handler threw, the
    // surrounding transaction would roll the token back and an attacker could
    // keep guessing codes without ever hitting the limit. The eleventh scan
    // proves the ten already spent tokens were committed.
    await expect(
      t.withIdentity(organizerIdentity).mutation(api.registrations.checkInAttendee, {
        qrCode: "EVT-GUESS-FINAL",
      })
    ).rejects.toThrow(/rate limit/i);
  });
});
