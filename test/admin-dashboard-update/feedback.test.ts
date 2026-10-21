import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedFeedback, seedUser } from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const userIdentity = identityFor("token|user", "User", "user@example.com");
const DAY = 24 * 60 * 60 * 1000;

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
    const userId = await seedUser(ctx, {
      name: "User",
      tokenIdentifier: userIdentity.tokenIdentifier,
      email: userIdentity.email,
      role: "user",
    });
    const event = await seedEvent(ctx, adminId, {
      title: "Feedback event",
      startDate: now + DAY,
      endDate: now + 2 * DAY,
    });
    return { adminId, userId, event };
  });
}

describe("support and feedback", () => {
  test("AC-027: signed-in submission validates, deduplicates within ten minutes, and rate limits after five sends", async () => {
    const t = createConvexTest();
    const { event } = await seedPeople(t);

    await expect(
      t.mutation(api.feedback.submit, {
        type: "bug",
        message: "This is a sufficiently long report.",
      })
    ).rejects.toThrow("Unauthenticated");

    const short = await t.withIdentity(userIdentity).mutation(api.feedback.submit, {
      type: "bug",
      message: "too short",
    });
    expect(short).toMatchObject({ ok: false });
    expect(short.message).toMatch(/10.*2000 characters/);

    const first = await t.withIdentity(userIdentity).mutation(api.feedback.submit, {
      type: "bug",
      eventId: event,
      message: "The check-in scanner rejected a valid QR code.",
    });
    expect(first).toMatchObject({ ok: true });

    const duplicate = await t.withIdentity(userIdentity).mutation(api.feedback.submit, {
      type: "bug",
      eventId: event,
      message: "A different description of the same problem.",
    });
    expect(duplicate).toMatchObject({ ok: false });
    expect(duplicate.message).toMatch(/last 10 minutes/i);

    const second = await t.withIdentity(userIdentity).mutation(api.feedback.submit, {
      type: "feature",
      eventId: event,
      message: "Please add a speaker list to the public event page.",
    });
    const third = await t.withIdentity(userIdentity).mutation(api.feedback.submit, {
      type: "abuse",
      eventId: event,
      message: "A public event description contains abusive language.",
    });
    const fourth = await t.withIdentity(userIdentity).mutation(api.feedback.submit, {
      type: "other",
      eventId: event,
      message: "A general question about how billing works.",
    });
    expect([second.ok, third.ok, fourth.ok]).toEqual([true, true, true]);

    const limited = await t.withIdentity(userIdentity).mutation(api.feedback.submit, {
      type: "bug",
      message: "This sixth submission should hit the hourly fixed window.",
    });
    expect(limited).toMatchObject({ ok: false });
    expect(limited.message).toMatch(/rate limit/i);

    const stored = await t
      .withIdentity(adminIdentity)
      .query(api.feedback.list, {});
    expect(stored.total).toBe(4);
    const bug = stored.rows.find((row) => row.type === "bug");
    expect(bug).toMatchObject({
      type: "bug",
      status: "open",
      priority: "normal",
      userEmail: "user@example.com",
      eventTitle: "Feedback event",
      eventRemoved: false,
      adminNotes: [],
    });
    expect(bug?.message).toContain("check-in scanner");
  });

  test("AC-028: triage filters, priority, status, notes, resolver and audit trail are recorded", async () => {
    const t = createConvexTest();
    const { adminId, userId, event } = await seedPeople(t);

    const ids = await t.run(async (ctx) => {
      const openBug = await seedFeedback(ctx, userId, {
        type: "bug",
        status: "open",
        priority: "low",
        eventId: event,
        message: "Open low bug",
        createdAt: Date.now() - 2 * DAY,
      });
      const openAbuse = await seedFeedback(ctx, userId, {
        type: "abuse",
        status: "open",
        priority: "high",
        message: "Open high abuse",
        createdAt: Date.now() - DAY,
      });
      const inReview = await seedFeedback(ctx, userId, {
        type: "feature",
        status: "in_review",
        priority: "normal",
        message: "Feature under review",
      });
      const resolved = await seedFeedback(ctx, userId, {
        type: "other",
        status: "resolved",
        priority: "normal",
        message: "Already resolved",
        resolvedBy: adminId,
        resolvedAt: Date.now() - DAY,
      });
      return { openBug, openAbuse, inReview, resolved };
    });

    const all = await t
      .withIdentity(adminIdentity)
      .query(api.feedback.list, {});
    expect(all.total).toBe(4);
    expect(all.counts).toEqual({ open: 2, in_review: 1, resolved: 1, dismissed: 0 });

    const open = await t
      .withIdentity(adminIdentity)
      .query(api.feedback.list, { status: "open" });
    expect(open.total).toBe(2);
    expect(open.rows.map((row) => row.id)).toEqual([ids.openAbuse, ids.openBug]);

    const highAbuse = await t
      .withIdentity(adminIdentity)
      .query(api.feedback.list, { status: "open", type: "abuse", priority: "high" });
    expect(highAbuse.total).toBe(1);
    expect(highAbuse.rows[0].id).toBe(ids.openAbuse);

    const triaged = await t.withIdentity(adminIdentity).mutation(api.feedback.update, {
      feedbackId: ids.openBug,
      status: "in_review",
      priority: "high",
      note: "Reproduced on the staging scanner.",
    });
    expect(triaged).toEqual({ ok: true });

    const resolved = await t.withIdentity(adminIdentity).mutation(api.feedback.update, {
      feedbackId: ids.openBug,
      status: "resolved",
    });
    expect(resolved).toEqual({ ok: true });

    const resolvedRows = await t
      .withIdentity(adminIdentity)
      .query(api.feedback.list, { status: "resolved" });
    const changed = resolvedRows.rows.find((row) => row.id === ids.openBug);
    expect(changed).toMatchObject({
      status: "resolved",
      priority: "high",
      resolvedAt: expect.any(Number),
    });
    expect(changed?.resolvedAt).toBeGreaterThan(0);
    expect(changed?.adminNotes).toEqual([
      expect.objectContaining({
        authorName: "Admin",
        body: "Reproduced on the staging scanner.",
        createdAt: expect.any(Number),
      }),
    ]);
    expect(changed?.updatedAt).toBeGreaterThanOrEqual(changed?.createdAt ?? 0);

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "feedback.updated"))
        .collect()
    );
    expect(audit).toHaveLength(2);
    expect(audit[0].metadata).toMatchObject({
      changes: {
        status: { before: "open", after: "in_review" },
        priority: { before: "low", after: "high" },
        note: { added: "Reproduced on the staging scanner." },
      },
    });
    expect(audit[1].metadata).toMatchObject({
      changes: { status: { before: "in_review", after: "resolved" } },
    });

    const removed = await t.withIdentity(adminIdentity).mutation(api.feedback.remove, {
      feedbackId: ids.openAbuse,
    });
    expect(removed).toEqual({ ok: true });
    const afterRemove = await t
      .withIdentity(adminIdentity)
      .query(api.feedback.list, {});
    expect(afterRemove.total).toBe(3);
    const deleteAudit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "feedback.deleted"))
        .collect()
    );
    expect(deleteAudit).toHaveLength(1);
    expect(deleteAudit[0].targetLabel).toContain("Open high abuse");
  });

  test("AC-029: each item names its event, marks removed events, and leaves unrelated items unlinked", async () => {
    const t = createConvexTest();
    const { userId, event } = await seedPeople(t);

    const ids = await t.run(async (ctx) => {
      const linked = await seedFeedback(ctx, userId, {
        message: "Feedback tied to an event.",
        eventId: event,
      });
      const unlinked = await seedFeedback(ctx, userId, {
        message: "General feedback without an event.",
      });
      const removedEvent = await seedEvent(ctx, userId, {
        title: "Soon deleted",
        startDate: Date.now() + DAY,
        endDate: Date.now() + 2 * DAY,
      });
      const orphan = await seedFeedback(ctx, userId, {
        message: "Feedback whose event will disappear.",
        eventId: removedEvent,
      });
      await ctx.db.delete(removedEvent);
      return { linked, unlinked, orphan };
    });

    await expect(t.query(api.feedback.list, {})).rejects.toThrow("Unauthenticated");

    const list = await t
      .withIdentity(adminIdentity)
      .query(api.feedback.list, {});
    const linked = list.rows.find((row) => row.id === ids.linked);
    const unlinked = list.rows.find((row) => row.id === ids.unlinked);
    const orphan = list.rows.find((row) => row.id === ids.orphan);

    expect(linked).toMatchObject({
      eventId: event,
      eventTitle: "Feedback event",
      eventRemoved: false,
    });
    expect(unlinked).toMatchObject({
      eventId: null,
      eventTitle: null,
      eventRemoved: false,
    });
    expect(orphan).toMatchObject({
      eventId: expect.any(String),
      eventTitle: null,
      eventRemoved: true,
    });
  });
});
