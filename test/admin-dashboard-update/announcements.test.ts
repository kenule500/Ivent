import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import {
  seedAnnouncement,
  seedEmailEvent,
  seedEvent,
  seedRegistration,
  seedUser,
} from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const superIdentity = identityFor("token|super", "Super", "super@example.com");
const DAY = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.unstubAllEnvs();
});

async function seedPeople(t: ReturnType<typeof createConvexTest>) {
  return t.run(async (ctx) => {
    const now = Date.now();
    const adminId = await seedUser(ctx, {
      name: "Admin",
      tokenIdentifier: adminIdentity.tokenIdentifier,
      email: adminIdentity.email,
      role: "admin",
      createdAt: now - 120 * DAY,
    });
    const superId = await seedUser(ctx, {
      name: "Super",
      tokenIdentifier: superIdentity.tokenIdentifier,
      email: superIdentity.email,
      role: "super_admin",
      createdAt: now - 120 * DAY,
    });
    const organizer = await seedUser(ctx, {
      name: "Organizer",
      tokenIdentifier: "token|organizer",
      email: "organizer@example.com",
      role: "user",
    });
    const attendee = await seedUser(ctx, {
      name: "Attendee",
      tokenIdentifier: "token|attendee",
      email: "attendee@example.com",
      role: "user",
    });
    const event = await seedEvent(ctx, organizer, {
      title: "Audience event",
      startDate: now + DAY,
      endDate: now + 2 * DAY,
    });
    await seedRegistration(ctx, event, attendee, {
      attendeeName: "Attendee",
      attendeeEmail: "attendee@example.com",
      status: "confirmed",
    });
    const cancelled = await seedUser(ctx, {
      name: "Cancelled",
      tokenIdentifier: "token|cancelled",
      email: "cancelled@example.com",
    });
    await seedRegistration(ctx, event, cancelled, {
      attendeeName: "Cancelled",
      attendeeEmail: "cancelled@example.com",
      status: "cancelled",
    });
    return { adminId, superId, organizer, attendee, event };
  });
}

describe("broadcast announcements", () => {
  test("AC-024: each audience resolves its own recipients, masks samples, and names the confirmation phrase", async () => {
    const t = createConvexTest();
    const { event } = await seedPeople(t);

    const all = await t
      .withIdentity(adminIdentity)
      .query(api.announcements.audiencePreview, { audienceType: "all" });
    expect(all.recipientCount).toBe(5);
    expect(all.truncated).toBe(false);
    expect(all.confirmationPhrase).toBe("SEND ANNOUNCEMENT");
    expect(all.sendingEnabled).toBe(false);
    expect(all.samples).toHaveLength(5);
    expect(all.samples.every((sample) => sample.includes("***@"))).toBe(true);
    expect(all.samples.join(" ")).not.toContain("organizer@example.com");

    const organizers = await t
      .withIdentity(adminIdentity)
      .query(api.announcements.audiencePreview, { audienceType: "organizers" });
    expect(organizers.recipientCount).toBe(1);
    expect(organizers.samples[0]).toBe("o***@example.com");

    const admins = await t
      .withIdentity(adminIdentity)
      .query(api.announcements.audiencePreview, { audienceType: "admins" });
    expect(admins.recipientCount).toBe(2);

    const eventAudience = await t
      .withIdentity(adminIdentity)
      .query(api.announcements.audiencePreview, {
        audienceType: "event",
        audienceEventId: event,
      });
    expect(eventAudience.recipientCount).toBe(1);
    expect(eventAudience.samples[0]).toBe("a***@example.com");
  });

  test("AC-025: sending requires the phrase, is rate limited, schedules bounded delivery, and records per-recipient outcomes", async () => {
    const t = createConvexTest();
    await seedPeople(t);
    vi.stubEnv("BROADCAST_SENDING_ENABLED", "true");

    const beforeConfirmation = await t
      .withIdentity(superIdentity)
      .mutation(api.announcements.send, {
        subject: "Service update",
        body: "We are updating the platform this weekend.",
        audienceType: "all",
        confirmation: "send",
      });
    expect(beforeConfirmation).toMatchObject({ ok: false });
    expect(beforeConfirmation.message).toContain("SEND ANNOUNCEMENT");

    const first = await t.withIdentity(superIdentity).mutation(api.announcements.send, {
      subject: "Service update",
      body: "We are updating the platform this weekend.",
      audienceType: "all",
      confirmation: "SEND ANNOUNCEMENT",
    });
    expect(first).toMatchObject({ ok: true, recipientCount: 5 });
    if (!first.ok) throw new Error(first.message);

    const plan = await t.query(internal.announcements.deliveryPlan, {
      announcementId: first.announcementId,
    });
    expect(plan.recipients).toHaveLength(5);
    expect(plan.announcement.status).toBe("sending");

    const second = await t.withIdentity(superIdentity).mutation(api.announcements.send, {
      subject: "Second update",
      body: "A second message inside the same hour.",
      audienceType: "admins",
      confirmation: "SEND ANNOUNCEMENT",
    });
    expect(second).toMatchObject({ ok: true, recipientCount: 2 });

    const third = await t.withIdentity(superIdentity).mutation(api.announcements.send, {
      subject: "Third update",
      body: "This send should be rejected by the broadcast bucket.",
      audienceType: "admins",
      confirmation: "SEND ANNOUNCEMENT",
    });
    expect(third).toMatchObject({ ok: false });
    expect(third.message).toMatch(/rate limit/i);

    // Record the same outcomes the Node delivery action records per recipient.
    await t.mutation(internal.announcements.recordDelivery, {
      announcementId: first.announcementId,
      email: "organizer@example.com",
      status: "sent",
    });
    await t.mutation(internal.announcements.recordDelivery, {
      announcementId: first.announcementId,
      email: "attendee@example.com",
      status: "failed",
      error: "Mailbox unavailable",
    });
    await t.mutation(internal.announcements.finalize, {
      announcementId: first.announcementId,
    });

    const history = await t
      .withIdentity(adminIdentity)
      .query(api.announcements.history, {});
    const sent = history.find((row) => row.id === first.announcementId);
    expect(sent).toMatchObject({
      subject: "Service update",
      status: "partial",
      recipientCount: 5,
      sentCount: 1,
      failedCount: 1,
      createdByName: "Super",
    });

    const deliveries = await t
      .withIdentity(adminIdentity)
      .query(api.announcements.deliveries, {
        announcementId: first.announcementId,
      });
    expect(deliveries.map((row) => [row.email, row.status])).toEqual([
      ["organizer@example.com", "sent"],
      ["attendee@example.com", "failed"],
    ]);
    expect(deliveries[1].error).toBe("Mailbox unavailable");

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "announcement.sent"))
        .collect()
    );
    expect(audit).toHaveLength(1);
    expect(audit[0].metadata).toMatchObject({
      recipientCount: 5,
      sentCount: 1,
      failedCount: 1,
      status: "partial",
    });
  });

  test("AC-026: partial failure is marked in history and failures surface in system health", async () => {
    const t = createConvexTest();
    const { superId } = await seedPeople(t);

    const now = Date.now();
    const announcementId = await t.run(async (ctx) =>
      seedAnnouncement(ctx, superId, {
        subject: "Partial delivery",
        recipientCount: 3,
        status: "sending",
      })
    );

    await t.mutation(internal.announcements.recordDelivery, {
      announcementId,
      email: "one@example.com",
      status: "sent",
    });
    await t.mutation(internal.announcements.recordDelivery, {
      announcementId,
      email: "two@example.com",
      status: "failed",
      error: "Hard bounce",
    });
    await t.mutation(internal.announcements.recordDelivery, {
      announcementId,
      email: "three@example.com",
      status: "failed",
      error: "Mailbox full",
    });
    await t.mutation(internal.announcements.finalize, { announcementId });

    const history = await t
      .withIdentity(adminIdentity)
      .query(api.announcements.history, {});
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: announcementId,
      status: "partial",
      recipientCount: 3,
      sentCount: 1,
      failedCount: 2,
    });
    expect(history[0].sentAt).toBeGreaterThan(0);

    await t.run(async (ctx) => {
      await seedEmailEvent(ctx, {
        template: "announcement",
        recipient: "two@example.com",
        status: "failed",
        error: "Hard bounce",
        createdAt: now - 60 * 60 * 1000,
      });
      await seedEmailEvent(ctx, {
        template: "announcement",
        recipient: "three@example.com",
        status: "failed",
        error: "Mailbox full",
        createdAt: now - 30 * 60 * 1000,
      });
    });

    const health = await t
      .withIdentity(adminIdentity)
      .query(api.health.getOverview, {});
    expect(health.email.failed24h).toBe(2);
    expect(health.email.recentFailures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recipient: "two@example.com", error: "Hard bounce" }),
        expect.objectContaining({ recipient: "three@example.com", error: "Mailbox full" }),
      ])
    );

    // The announcement is never reported as a clean send.
    expect(history[0].status).not.toBe("sent");
    expect(history[0].failedCount).toBeGreaterThan(0);
  });
});
