import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const ownerIdentity = identityFor("token|owner", "Owner", "owner@example.com");
const otherIdentity = identityFor("token|other", "Other", "other@example.com");

async function setup() {
  const t = createConvexTest();
  const ids = await t.run(async (ctx) => {
    const ownerId = await seedUser(ctx, {
      name: "Owner",
      tokenIdentifier: ownerIdentity.tokenIdentifier,
      email: ownerIdentity.email,
    });
    await seedUser(ctx, {
      name: "Other",
      tokenIdentifier: otherIdentity.tokenIdentifier,
      email: otherIdentity.email,
    });
    const attendeeA = await seedUser(ctx, { name: "A", tokenIdentifier: "token|a", email: "a@example.com" });
    const attendeeB = await seedUser(ctx, { name: "B", tokenIdentifier: "token|b", email: "b@example.com" });
    const attendeeC = await seedUser(ctx, { name: "C", tokenIdentifier: "token|c", email: "c@example.com" });
    const eventId = await seedEvent(ctx, ownerId, {
      title: "Paid Summit",
      ticketType: "paid",
      ticketPrice: 500,
      capacity: 10,
      registrationCount: 2,
    });
    await seedRegistration(ctx, eventId, attendeeA, { checkedIn: true, checkedInAt: Date.now() });
    await seedRegistration(ctx, eventId, attendeeB);
    await seedRegistration(ctx, eventId, attendeeC, { status: "cancelled" });
    return { ownerId, eventId };
  });
  return { t, ...ids };
}

describe("AC-006: event dashboard statistics and authorization", () => {
  test("AC-006: the organizer sees confirmed, checked-in, pending, capacity, rate, revenue and time", async () => {
    const { t, eventId } = await setup();

    const result = await t.withIdentity(ownerIdentity).query(api.dashboard.getEventDashboard, {
      eventId,
    });

    expect(result.stats).toMatchObject({
      totalRegistrations: 2,
      checkedInCount: 1,
      pendingCount: 1,
      capacity: 10,
      checkInRate: 50,
      totalRevenue: 1000,
      isEventPast: false,
      isEventToday: false,
    });
    expect(result.stats.hoursUntilEvent).toBeGreaterThanOrEqual(0);
  });

  test("AC-006: a non-organizer is rejected", async () => {
    const { t, eventId } = await setup();

    await expect(
      t.withIdentity(otherIdentity).query(api.dashboard.getEventDashboard, { eventId })
    ).rejects.toThrow(/not authorized/i);
  });
});
