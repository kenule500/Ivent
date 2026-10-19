import { describe, expect, test } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedInvite, seedUser } from "../helpers/seed";

const superIdentity = identityFor("token|super", "Super", "super@example.com");
const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const inviteeIdentity = identityFor("token|invitee", "Invitee", "invitee@example.com");

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
    const adminId = await seedUser(ctx, {
      name: "Admin",
      tokenIdentifier: adminIdentity.tokenIdentifier,
      email: adminIdentity.email,
      role: "admin",
    });
    const inviteeId = await seedUser(ctx, {
      name: "Invitee",
      tokenIdentifier: inviteeIdentity.tokenIdentifier,
      email: inviteeIdentity.email,
      role: "user",
    });
    return { superId, adminId, inviteeId };
  });
  return { t, ...ids };
}

describe("AC-006: invite generation", () => {
  test("AC-006: a super admin creates a pending invite with a seven-day expiry, and regenerating refreshes it", async () => {
    const { t, superId } = await setup();

    const first = await t.withIdentity(superIdentity).mutation(api.admin.generateInviteCode, {
      email: "NewAdmin@Example.com",
    });

    expect(first.inviteCode).toMatch(/^ADMIN-\d+-[0-9A-F]{8}$/);
    expect(first.expiresAt).toBeGreaterThan(Date.now() + 6 * DAY);

    const stored = await t.run(async (ctx) => ctx.db.query("adminInvites").collect());
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      email: "newadmin@example.com",
      status: "pending",
      createdBy: superId,
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await t.withIdentity(superIdentity).mutation(api.admin.generateInviteCode, {
      email: "newadmin@example.com",
    });

    expect(second.inviteCode).not.toBe(first.inviteCode);
    const afterRefresh = await t.run(async (ctx) => ctx.db.query("adminInvites").collect());
    expect(afterRefresh).toHaveLength(1);
  });

  test("AC-006: an accepted invite cannot be regenerated", async () => {
    const { t, superId } = await setup();
    const inviteId = await t.run((ctx) =>
      seedInvite(ctx, superId, { email: "accepted@example.com", status: "accepted" })
    );

    await expect(
      t.withIdentity(superIdentity).mutation(api.admin.generateInviteCode, {
        email: "accepted@example.com",
      })
    ).rejects.toThrow(/accepted admin invite/i);

    const invite = await t.run((ctx) => ctx.db.get(inviteId));
    expect(invite?.status).toBe("accepted");
  });

  test("AC-006: invite generation is limited to ten per minute", async () => {
    const { t } = await setup();

    for (let i = 0; i < 10; i++) {
      await t.withIdentity(superIdentity).mutation(api.admin.generateInviteCode, {
        email: "bulk@example.com",
      });
    }

    await expect(
      t.withIdentity(superIdentity).mutation(api.admin.generateInviteCode, {
        email: "bulk@example.com",
      })
    ).rejects.toThrow(/rate limit/i);
  });

  test("AC-006: only a super admin can generate invites", async () => {
    const { t } = await setup();

    await expect(
      t.withIdentity(adminIdentity).mutation(api.admin.generateInviteCode, {
        email: "nope@example.com",
      })
    ).rejects.toThrow(/only super admin/i);
  });
});

describe("AC-007: accepting an invite", () => {
  test("AC-007: a matching pending code is accepted and promotes the user to admin", async () => {
    const { t, superId, inviteeId } = await setup();
    const inviteId = await t.run((ctx) =>
      seedInvite(ctx, superId, { email: inviteeIdentity.email, inviteCode: "ADMIN-GOOD" })
    );

    await t.withIdentity(inviteeIdentity).mutation(api.admin.verifyInviteCode, {
      email: inviteeIdentity.email,
      inviteCode: "ADMIN-GOOD",
    });

    const snapshot = await t.run(async (ctx) => ({
      invite: await ctx.db.get(inviteId),
      user: await ctx.db.get(inviteeId),
    }));

    expect(snapshot.invite).toMatchObject({ status: "accepted", acceptedBy: inviteeId });
    expect(snapshot.invite?.acceptedAt).toBeTypeOf("number");
    expect(snapshot.user?.role).toBe("admin");
  });

  test("AC-007: missing, wrong, revoked, expired and accepted codes are rejected", async () => {
    const { t, superId } = await setup();

    await expect(
      t.withIdentity(inviteeIdentity).mutation(api.admin.verifyInviteCode, {
        email: "nobody@example.com",
        inviteCode: "ADMIN-X",
      })
    ).rejects.toThrow(/no invite found/i);

    await t.run((ctx) =>
      seedInvite(ctx, superId, { email: "wrong@example.com", inviteCode: "ADMIN-RIGHT" })
    );
    await expect(
      t.withIdentity(inviteeIdentity).mutation(api.admin.verifyInviteCode, {
        email: "wrong@example.com",
        inviteCode: "ADMIN-WRONG",
      })
    ).rejects.toThrow(/invalid invite code/i);

    await t.run((ctx) =>
      seedInvite(ctx, superId, { email: "revoked@example.com", status: "revoked" })
    );
    await expect(
      t.withIdentity(inviteeIdentity).mutation(api.admin.verifyInviteCode, {
        email: "revoked@example.com",
        inviteCode: "ADMIN-TEST-CODE",
      })
    ).rejects.toThrow(/revoked/i);

    await t.run((ctx) =>
      seedInvite(ctx, superId, {
        email: "expired@example.com",
        expiresAt: Date.now() - 1000,
      })
    );
    await expect(
      t.withIdentity(inviteeIdentity).mutation(api.admin.verifyInviteCode, {
        email: "expired@example.com",
        inviteCode: "ADMIN-TEST-CODE",
      })
    ).rejects.toThrow(/expired/i);

    await t.run((ctx) =>
      seedInvite(ctx, superId, { email: "accepted@example.com", status: "accepted" })
    );
    await expect(
      t.withIdentity(inviteeIdentity).mutation(api.admin.verifyInviteCode, {
        email: "accepted@example.com",
        inviteCode: "ADMIN-TEST-CODE",
      })
    ).rejects.toThrow(/already been accepted/i);
  });
});

describe("AC-008: invite lifecycle", () => {
  test("AC-008: a pending invite can be revoked or deleted, and both are audited", async () => {
    const { t, superId } = await setup();
    const revokedId = await t.run((ctx) => seedInvite(ctx, superId, { email: "r@example.com" }));
    const deletedId = await t.run((ctx) => seedInvite(ctx, superId, { email: "d@example.com" }));

    await t.withIdentity(superIdentity).mutation(api.admin.revokeInvite, { inviteId: revokedId });
    await t.withIdentity(superIdentity).mutation(api.admin.deleteInvite, { inviteId: deletedId });

    const snapshot = await t.run(async (ctx) => ({
      revoked: await ctx.db.get(revokedId),
      deleted: await ctx.db.get(deletedId),
      logs: await ctx.db.query("auditLogs").collect(),
    }));

    expect(snapshot.revoked?.status).toBe("revoked");
    expect(snapshot.deleted).toBeNull();
    expect(snapshot.logs.map((log) => log.action).sort()).toEqual([
      "invite.deleted",
      "invite.revoked",
    ]);
  });

  test("AC-008: accepted invites cannot be revoked, deleted or resent", async () => {
    const { t, superId } = await setup();
    const inviteId = await t.run((ctx) =>
      seedInvite(ctx, superId, { email: "accepted@example.com", status: "accepted" })
    );

    await expect(
      t.withIdentity(superIdentity).mutation(api.admin.revokeInvite, { inviteId })
    ).rejects.toThrow(/cannot revoke an accepted/i);
    await expect(
      t.withIdentity(superIdentity).mutation(api.admin.deleteInvite, { inviteId })
    ).rejects.toThrow(/cannot delete an accepted/i);
    await expect(
      t.withIdentity(superIdentity).mutation(api.admin.resendInvite, { inviteId })
    ).rejects.toThrow(/cannot resend an accepted/i);
  });

  test("AC-008: resending an expired invite issues a new code and expiry", async () => {
    const { t, superId } = await setup();
    const inviteId = await t.run((ctx) =>
      seedInvite(ctx, superId, {
        email: "expired@example.com",
        inviteCode: "ADMIN-OLD",
        status: "expired",
        expiresAt: Date.now() - 1000,
      })
    );

    const newCode = await t.withIdentity(superIdentity).mutation(api.admin.resendInvite, {
      inviteId,
    });
    const invite = await t.run((ctx) => ctx.db.get(inviteId));

    expect(newCode).not.toBe("ADMIN-OLD");
    expect(invite).toMatchObject({ status: "pending", inviteCode: newCode });
    expect(invite?.expiresAt).toBeGreaterThan(Date.now() + 6 * DAY);
  });

  test("AC-008: only a super admin may manage invites", async () => {
    const { t, superId } = await setup();
    const inviteId = await t.run((ctx) => seedInvite(ctx, superId, { email: "x@example.com" }));

    await expect(
      t.withIdentity(adminIdentity).mutation(api.admin.revokeInvite, { inviteId })
    ).rejects.toThrow(/only super admin/i);
  });

  test("AC-008: the daily cron marks past-due pending invites as expired", async () => {
    const { t, superId } = await setup();
    const dueId = await t.run((ctx) =>
      seedInvite(ctx, superId, { email: "due@example.com", expiresAt: Date.now() - 1000 })
    );
    const futureId = await t.run((ctx) =>
      seedInvite(ctx, superId, { email: "future@example.com", expiresAt: Date.now() + DAY })
    );

    await t.mutation(internal.crons.markExpiredInvites, {});

    const snapshot = await t.run(async (ctx) => ({
      due: await ctx.db.get(dueId),
      future: await ctx.db.get(futureId),
    }));
    expect(snapshot.due?.status).toBe("expired");
    expect(snapshot.future?.status).toBe("pending");
  });
});
