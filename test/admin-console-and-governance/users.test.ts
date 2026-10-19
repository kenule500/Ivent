import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedUser } from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const superIdentity = identityFor("token|super", "Super", "super@example.com");

async function setup() {
  const t = createConvexTest();
  const ids = await t.run(async (ctx) => {
    const adminId = await seedUser(ctx, {
      name: "Admin",
      tokenIdentifier: adminIdentity.tokenIdentifier,
      email: adminIdentity.email,
      role: "admin",
    });
    const superId = await seedUser(ctx, {
      name: "Super",
      tokenIdentifier: superIdentity.tokenIdentifier,
      email: superIdentity.email,
      role: "super_admin",
    });
    const aliceId = await seedUser(ctx, {
      name: "Alice Johnson",
      tokenIdentifier: "token|alice",
      email: "alice@example.com",
      role: "user",
    });
    const bobId = await seedUser(ctx, {
      name: "Bob Stone",
      tokenIdentifier: "token|bob",
      email: "bob@acme.test",
      role: "user",
    });
    return { adminId, superId, aliceId, bobId };
  });
  return { t, ...ids };
}

describe("AC-003: user moderation", () => {
  test("AC-003: users are searchable by name or email", async () => {
    const { t } = await setup();

    const byName = await t.withIdentity(adminIdentity).query(api.admin.getAllUsers, {
      search: "alice",
    });
    const byEmail = await t.withIdentity(adminIdentity).query(api.admin.getAllUsers, {
      search: "acme.test",
    });

    expect(byName.map((user) => user.name)).toEqual(["Alice Johnson"]);
    expect(byEmail.map((user) => user.name)).toEqual(["Bob Stone"]);
  });

  test("AC-003: an admin can ban and unban a non-admin, and each action is audited", async () => {
    const { t, aliceId } = await setup();

    await t.withIdentity(adminIdentity).mutation(api.admin.toggleUserBan, { userId: aliceId });
    let alice = await t.run((ctx) => ctx.db.get(aliceId));
    expect(alice?.banned).toBe(true);

    await t.withIdentity(adminIdentity).mutation(api.admin.toggleUserBan, { userId: aliceId });
    alice = await t.run((ctx) => ctx.db.get(aliceId));
    expect(alice?.banned).toBe(false);

    const logs = await t.run((ctx) => ctx.db.query("auditLogs").collect());
    expect(logs.map((log) => log.action)).toEqual(["user.banned", "user.unbanned"]);
  });

  test("AC-003: banning another admin is rejected", async () => {
    const { t, superId } = await setup();

    await expect(
      t.withIdentity(adminIdentity).mutation(api.admin.toggleUserBan, { userId: superId })
    ).rejects.toThrow(/cannot ban another admin/i);
  });

  test("AC-003: only a super admin may change a role, and the change is audited", async () => {
    const { t, aliceId } = await setup();

    await expect(
      t.withIdentity(adminIdentity).mutation(api.admin.updateUserRole, {
        userId: aliceId,
        role: "admin",
      })
    ).rejects.toThrow(/only super admin/i);

    await t.withIdentity(superIdentity).mutation(api.admin.updateUserRole, {
      userId: aliceId,
      role: "admin",
    });

    const alice = await t.run((ctx) => ctx.db.get(aliceId));
    expect(alice?.role).toBe("admin");

    const logs = await t.run((ctx) => ctx.db.query("auditLogs").collect());
    expect(logs[0], "a role change must be audited").toBeDefined();
    expect(logs[0].action).toBe("user.role_changed");
    expect(logs[0].metadata).toEqual({ from: "user", to: "admin" });
  });
});
