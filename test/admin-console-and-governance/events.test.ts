import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");

async function setup() {
  const t = createConvexTest();
  const ids = await t.run(async (ctx) => {
    const adminId = await seedUser(ctx, {
      name: "Admin",
      tokenIdentifier: adminIdentity.tokenIdentifier,
      email: adminIdentity.email,
      role: "super_admin",
    });
    const attendeeId = await seedUser(ctx, {
      name: "Attendee",
      tokenIdentifier: "token|attendee",
      email: "attendee@example.com",
    });
    const eventId = await seedEvent(ctx, adminId, {
      title: "Lagos Tech Summit",
      registrationCount: 1,
    });
    await seedEvent(ctx, adminId, { title: "Abuja Music Night" });
    await seedRegistration(ctx, eventId, attendeeId);
    return { adminId, attendeeId, eventId };
  });
  return { t, ...ids };
}

describe("AC-004: event oversight", () => {
  test("AC-004: events are listed and searchable by title", async () => {
    const { t } = await setup();

    const all = await t.withIdentity(adminIdentity).query(api.admin.getAllEvents, {});
    const filtered = await t.withIdentity(adminIdentity).query(api.admin.getAllEvents, {
      search: "lagos",
    });

    expect(all).toHaveLength(2);
    expect(filtered.map((event) => event.title)).toEqual(["Lagos Tech Summit"]);
  });

  test("AC-004: deleting an event removes its registrations and writes an event.deleted audit entry", async () => {
    const { t, eventId } = await setup();

    await t.withIdentity(adminIdentity).mutation(api.admin.deleteEvent, { eventId });

    const snapshot = await t.run(async (ctx) => ({
      event: await ctx.db.get(eventId),
      registrations: await ctx.db.query("registrations").collect(),
      logs: await ctx.db.query("auditLogs").collect(),
    }));

    expect(snapshot.event).toBeNull();
    expect(snapshot.registrations).toHaveLength(0);

    const log = snapshot.logs.find((entry) => entry.action === "event.deleted");
    expect(log).toBeDefined();
    expect(log).toMatchObject({
      targetType: "event",
      targetLabel: "Lagos Tech Summit",
      metadata: { registrationCount: 1 },
    });
  });

  test("AC-004: deleting an unknown event is rejected", async () => {
    const { t, eventId } = await setup();
    await t.withIdentity(adminIdentity).mutation(api.admin.deleteEvent, { eventId });
    await expect(
      t.withIdentity(adminIdentity).mutation(api.admin.deleteEvent, { eventId })
    ).rejects.toThrow(/event not found/i);
  });
});
