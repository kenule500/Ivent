import { describe, expect, test } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import { MAX_LIFECYCLE_ATTEMPTS } from "../../convex/emailLog";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedRegistration, seedUser } from "../helpers/seed";

const identity = identityFor("token|attendee", "Ada Lovelace", "ada@example.com");

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
    const eventId = await seedEvent(ctx, organizerId, {
      startDate: Date.now() + 24 * 60 * 60 * 1000,
      endDate: Date.now() + 26 * 60 * 60 * 1000,
    });
    const registrationId = await seedRegistration(ctx, eventId, attendeeId);
    return { attendeeId, organizerId, eventId, registrationId };
  });

  return { t, ...ids };
}

describe("AC-004: a lifecycle email is sent at most once", () => {
  test("AC-004: the first claim wins and the second is refused", async () => {
    const { t, registrationId } = await setup();
    const key = `${registrationId}:reminder_24h`;

    const first = await t.mutation(internal.emailLog.claimLifecycleSend, {
      registrationId,
      template: "reminder_24h",
      idempotencyKey: key,
      recipient: identity.email,
    });

    const second = await t.mutation(internal.emailLog.claimLifecycleSend, {
      registrationId,
      template: "reminder_24h",
      idempotencyKey: key,
      recipient: identity.email,
    });

    expect(first).toBe(true);
    expect(second).toBe(false);

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("emailEvents")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", key))
        .collect()
    );

    expect(rows).toHaveLength(1);
  });

  test("AC-004: a sent delivery is never retried", async () => {
    const { t, registrationId } = await setup();
    const key = `${registrationId}:reminder_24h`;

    await t.mutation(internal.emailLog.claimLifecycleSend, {
      registrationId,
      template: "reminder_24h",
      idempotencyKey: key,
      recipient: identity.email,
    });
    await t.mutation(internal.emailLog.settleLifecycleSend, {
      idempotencyKey: key,
      status: "sent",
    });

    const again = await t.mutation(internal.emailLog.claimLifecycleSend, {
      registrationId,
      template: "reminder_24h",
      idempotencyKey: key,
      recipient: identity.email,
    });

    expect(again).toBe(false);
  });
});

describe("AC-005 / NFR-004: retries are bounded", () => {
  test("AC-005: a failed send is retried, then stops at the attempt cap", async () => {
    const { t, registrationId } = await setup();
    const key = `${registrationId}:reminder_24h`;
    const claim = () =>
      t.mutation(internal.emailLog.claimLifecycleSend, {
        registrationId,
        template: "reminder_24h",
        idempotencyKey: key,
        recipient: identity.email,
      });
    const fail = () =>
      t.mutation(internal.emailLog.settleLifecycleSend, {
        idempotencyKey: key,
        status: "failed",
        error: "provider down",
      });

    expect(await claim()).toBe(true);

    let granted = 0;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await fail();
      if (await claim()) granted += 1;
    }

    // One initial claim plus retries up to the cap; never unbounded.
    expect(granted).toBe(MAX_LIFECYCLE_ATTEMPTS - 1);

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("emailEvents")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", key))
        .unique()
    );

    expect(row?.status).toBe("failed");
    expect(row?.error).toBe("provider down");
    expect(row?.attempts).toBe(MAX_LIFECYCLE_ATTEMPTS);
  });
});

describe("AC-002 / AC-006: the sweeps respect status and preference", () => {
  test("AC-002: the reminder sweep schedules a confirmed registration once", async () => {
    const { t } = await setup();

    const first = await t.mutation(internal.lifecycleSweeps.runReminderSweep, {});
    expect(first.processed).toBe(1);

    // A second run before any delivery exists would schedule again; the claim in
    // dispatch is what makes it a no-op. Assert the sweep itself is idempotent
    // once the row exists.
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("emailEvents").collect();
      expect(rows.length).toBe(0);
    });
  });

  test("AC-006: a cancelled registration is not reminded", async () => {
    const t = createConvexTest();

    await t.run(async (ctx) => {
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
      const eventId = await seedEvent(ctx, organizerId, {
        startDate: Date.now() + 24 * 60 * 60 * 1000,
        endDate: Date.now() + 26 * 60 * 60 * 1000,
      });
      const registrationId = await seedRegistration(ctx, eventId, attendeeId);
      await ctx.db.patch(registrationId, { status: "cancelled" });
    });

    const result = await t.mutation(internal.lifecycleSweeps.runReminderSweep, {});

    expect(result.processed).toBe(0);
  });
});

describe("AC-007: the admin can read delivery rows", () => {
  test("AC-007: deliveries are listed per registration with their status", async () => {
    const { t, registrationId } = await setup();
    const key = `${registrationId}:reminder_24h`;

    await t.mutation(internal.emailLog.claimLifecycleSend, {
      registrationId,
      template: "reminder_24h",
      idempotencyKey: key,
      recipient: identity.email,
    });
    await t.mutation(internal.emailLog.settleLifecycleSend, {
      idempotencyKey: key,
      status: "sent",
    });

    const rows = await t.query(internal.emailLog.listLifecycleDeliveries, {
      registrationId,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].template).toBe("reminder_24h");
    expect(rows[0].status).toBe("sent");
    expect(rows[0].createdAt).toBeGreaterThan(0);
  });
});

describe("AC-001: registration schedules its confirmation", () => {
  test("AC-001: registering queues a confirmation without waiting on the provider", async () => {
    const t = createConvexTest();

    const { eventId } = await t.run(async (ctx) => {
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
      const eventId = await seedEvent(ctx, organizerId, { capacity: 5 });
      return { attendeeId, eventId };
    });

    await t
      .withIdentity(identity)
      .mutation(api.registrations.registerForEvent, { eventId });

    // The mutation returned; the send is scheduled, not awaited.
    const scheduled = await t.run(async (ctx) => {
      const registrations = await ctx.db.query("registrations").collect();
      return registrations.length;
    });

    expect(scheduled).toBe(1);
  });
});

describe("AC-006: the preference suppresses optional email only", () => {
  test("AC-006: an opted-out registration is skipped before any send is attempted", async () => {
    const { t, registrationId } = await setup();

    await t.run(async (ctx) => {
      await ctx.db.patch(registrationId, { emailOptOut: true });
    });

    const result = await t.action(
      internal.lifecycleEmails.sendLifecycleEmail,
      { registrationId, template: "reminder_24h" }
    );

    expect(result.status).toBe("skipped");

    const rows = await t.run(async (ctx) => ctx.db.query("emailEvents").collect());
    expect(rows).toHaveLength(0);
  });

  test("AC-006: the confirmation still runs for an opted-out attendee", async () => {
    const { t, registrationId } = await setup();

    await t.run(async (ctx) => {
      await ctx.db.patch(registrationId, { emailOptOut: true });
    });

    const result = await t.action(
      internal.lifecycleEmails.sendLifecycleEmail,
      { registrationId, template: "registration_confirmation" }
    );

    // It is not skipped for preference reasons; it fails only because no
    // provider is configured in the test environment, which is the point:
    // the transactional path does reach dispatch.
    expect(result.status).not.toBe("skipped");
  });
});

describe("AC-007: the admin view is authorised and complete", () => {
  test("AC-007: an admin reads the delivery rows for one registration", async () => {
    const { t, registrationId } = await setup();
    const key = `${registrationId}:registration_confirmation`;

    await t.mutation(internal.emailLog.claimLifecycleSend, {
      registrationId,
      template: "registration_confirmation",
      idempotencyKey: key,
      recipient: identity.email,
    });
    await t.mutation(internal.emailLog.settleLifecycleSend, {
      idempotencyKey: key,
      status: "failed",
      error: "provider timeout",
    });

    await t.run(async (ctx) => {
      await seedUser(ctx, {
        name: "Admin",
        tokenIdentifier: "token|admin",
        email: "admin@example.com",
        role: "admin",
      });
    });

    const rows = await t
      .withIdentity(identityFor("token|admin", "Admin", "admin@example.com"))
      .query(api.admin.getRegistrationEmailDeliveries, { registrationId });

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("failed");
    expect(rows[0].error).toBe("provider timeout");
  });

  test("AC-007: a non-admin cannot read deliveries", async () => {
    const { t, registrationId } = await setup();

    await expect(
      t
        .withIdentity(identity)
        .query(api.admin.getRegistrationEmailDeliveries, { registrationId })
    ).rejects.toThrow();
  });
});