import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedUser } from "../helpers/seed";

describe("AC-001: admin-only Convex access", () => {
  test("AC-001: unauthenticated, ordinary users, admins and super admins are distinguished", async () => {
    const t = createConvexTest();
    const plainIdentity = identityFor("token|plain", "Plain", "plain@example.com");
    const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
    const superIdentity = identityFor("token|super", "Super", "super@example.com");

    await t.run(async (ctx) => {
      await seedUser(ctx, {
        name: "Plain",
        tokenIdentifier: plainIdentity.tokenIdentifier,
        email: plainIdentity.email,
        role: "user",
      });
      await seedUser(ctx, {
        name: "Admin",
        tokenIdentifier: adminIdentity.tokenIdentifier,
        email: adminIdentity.email,
        role: "admin",
      });
      await seedUser(ctx, {
        name: "Super",
        tokenIdentifier: superIdentity.tokenIdentifier,
        email: superIdentity.email,
        role: "super_admin",
      });
    });

    await expect(t.query(api.admin.getDashboardStats, {})).rejects.toThrow(/unauthenticated/i);
    await expect(
      t.withIdentity(plainIdentity).query(api.admin.getDashboardStats, {})
    ).rejects.toThrow(/admin access required/i);

    await expect(
      t.withIdentity(adminIdentity).query(api.admin.getDashboardStats, {})
    ).resolves.toMatchObject({ totalUsers: 3 });
    await expect(
      t.withIdentity(superIdentity).query(api.admin.getDashboardStats, {})
    ).resolves.toMatchObject({ totalUsers: 3 });
  });
});
