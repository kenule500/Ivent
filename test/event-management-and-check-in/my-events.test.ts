import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const identity = identityFor("token|owner", "Owner", "owner@example.com");

async function setup() {
  const t = createConvexTest();
  const ids = await t.run(async (ctx) => {
    const ownerId = await seedUser(ctx, {
      name: identity.name,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
      freeEventsCreated: 1,
    });
    const otherId = await seedUser(ctx, {
      name: "Other",
      tokenIdentifier: "token|other",
      email: "other@example.com",
    });
    const ownerEventId = await seedEvent(ctx, ownerId, { title: "Owner Event" });
    const otherEventId = await seedEvent(ctx, otherId, { title: "Other Event" });
    return { ownerId, otherId, ownerEventId, otherEventId };
  });
  return { t, ...ids };
}

describe("AC-005: managing my events", () => {
  test("AC-005: only the signed-in organizer's events are listed", async () => {
    const { t } = await setup();

    const events = await t.withIdentity(identity).query(api.events.getMyEvents, {});

    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Owner Event");
  });

  test("AC-005: deletion removes registrations, deletes the cover, and reclaims the free credit", async () => {
    const { t, ownerEventId, otherId } = await setup();

    const storageId = await t.run(async (ctx) => {
      const id = await ctx.storage.store(new Blob(["cover"], { type: "image/png" }));
      await ctx.db.patch(ownerEventId, { coverImage: id as unknown as string });
      await seedRegistration(ctx, ownerEventId, otherId);
      return id;
    });

    await t.withIdentity(identity).mutation(api.events.deleteEvent, { eventId: ownerEventId });

    const snapshot = await t.run(async (ctx) => ({
      event: await ctx.db.get(ownerEventId),
      registrations: await ctx.db.query("registrations").collect(),
      user: await ctx.db.query("users").first(),
      coverUrl: await ctx.storage.getUrl(storageId),
    }));

    expect(snapshot.event).toBeNull();
    expect(snapshot.registrations).toHaveLength(0);
    expect(snapshot.user?.freeEventsCreated).toBe(0);
    expect(snapshot.coverUrl).toBeNull();
  });

  test("AC-005: a non-owner cannot delete the event", async () => {
    const { t, otherEventId } = await setup();

    await expect(
      t.withIdentity(identity).mutation(api.events.deleteEvent, { eventId: otherEventId })
    ).rejects.toThrow(/not authorized/i);
  });
});
