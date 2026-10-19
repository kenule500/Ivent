import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedAuditLog, seedUser } from "../helpers/seed";

const superIdentity = identityFor("token|super", "Super", "super@example.com");
const DAY = 24 * 60 * 60 * 1000;

async function setup() {
  const t = createConvexTest();
  const ids = await t.run(async (ctx) => {
    const superId = await seedUser(ctx, {
      name: "Super",
      tokenIdentifier: superIdentity.tokenIdentifier,
      email: superIdentity.email,
      role: "super_admin",
    });
    const aliceId = await seedUser(ctx, {
      name: "Alice",
      tokenIdentifier: "token|alice",
      email: "alice@example.com",
    });
    return { superId, aliceId };
  });
  return { t, ...ids };
}

describe("AC-009: audit trail", () => {
  test("AC-009: an administrative mutation records actor, action, target, label and time", async () => {
    const { t, aliceId } = await setup();

    await t.withIdentity(superIdentity).mutation(api.admin.toggleUserBan, { userId: aliceId });

    const logs = await t.run((ctx) => ctx.db.query("auditLogs").collect());
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      actorName: "Super",
      actorEmail: "super@example.com",
      action: "user.banned",
      targetType: "user",
      targetId: aliceId,
      targetLabel: "alice@example.com",
    });
    expect(logs[0].createdAt).toBeTypeOf("number");
  });

  test("AC-009: logs support text search and action filtering", async () => {
    const { t, superId, aliceId } = await setup();
    await t.run(async (ctx) => {
      await seedAuditLog(ctx, superId, {
        actorName: "Moderator",
        actorEmail: "mod@example.com",
        action: "user.banned",
        targetLabel: "alice@example.com",
        createdAt: Date.now(),
      });
      await seedAuditLog(ctx, superId, {
        actorName: "Moderator",
        actorEmail: "mod@example.com",
        action: "event.deleted",
        targetLabel: "Lagos Tech Summit",
        createdAt: Date.now() - 2 * DAY,
      });
      await seedAuditLog(ctx, superId, {
        actorName: "Other",
        actorEmail: "other@example.com",
        action: "event.deleted",
        targetLabel: "Old Event",
        createdAt: Date.now() - 8 * DAY,
      });
      void aliceId;
    });

    const searched = await t.withIdentity(superIdentity).query(api.audit.getAuditLogs, {
      search: "lagos",
    });
    expect(searched).toHaveLength(1);

    const filtered = await t.withIdentity(superIdentity).query(api.audit.getAuditLogs, {
      actionFilter: "event.deleted",
    });
    expect(filtered).toHaveLength(2);

    const all = await t.withIdentity(superIdentity).query(api.audit.getAuditLogs, {
      actionFilter: "all",
    });
    expect(all).toHaveLength(3);
  });

  test("AC-009: audit stats report total, 24-hour and 7-day counts", async () => {
    const { t, superId } = await setup();
    await t.run(async (ctx) => {
      await seedAuditLog(ctx, superId, { createdAt: Date.now() });
      await seedAuditLog(ctx, superId, { createdAt: Date.now() - 2 * DAY });
      await seedAuditLog(ctx, superId, { createdAt: Date.now() - 8 * DAY });
    });

    const stats = await t.withIdentity(superIdentity).query(api.audit.getAuditStats, {});
    expect(stats).toEqual({ total: 3, last24h: 1, last7d: 2 });
  });
});
