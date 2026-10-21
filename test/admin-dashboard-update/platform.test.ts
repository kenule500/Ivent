import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedUser } from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const superIdentity = identityFor("token|super", "Super", "super@example.com");
const DAY = 24 * 60 * 60 * 1000;

const allFlags = {
  commandPalette: true,
  reports: true,
  broadcasts: true,
  feedbackInbox: true,
  systemHealth: true,
};

async function seedAdmins(t: ReturnType<typeof createConvexTest>) {
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
    return { adminId, superId };
  });
}

describe("platform settings", () => {
  test("AC-021: currency, country, timezone and module flags are validated and persisted as one document", async () => {
    const t = createConvexTest();
    await seedAdmins(t);

    const defaults = await t
      .withIdentity(adminIdentity)
      .query(api.platform.getSettings, {});
    expect(defaults).toMatchObject({
      exists: false,
      defaultCountry: "US",
      defaultCurrency: "USD",
      defaultTimezone: "UTC",
      maintenanceMode: false,
      featureFlags: allFlags,
      updatedAt: null,
      updatedBy: null,
    });

    const options = await t
      .withIdentity(adminIdentity)
      .query(api.platform.getOptions, {});
    expect(options.countries).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "NG", name: "Nigeria" })])
    );
    expect(options.currencies).toContain("NGN");
    expect(options.timezones).toContain("Africa/Lagos");
    expect(options.maintenanceConfirmation).toBe("ENABLE MAINTENANCE");

    const updated = await t.withIdentity(superIdentity).mutation(api.platform.updateSettings, {
      defaultCountry: "ng",
      defaultCurrency: "ngn",
      defaultTimezone: "Africa/Lagos",
      maintenanceMode: false,
      featureFlags: { ...allFlags, commandPalette: false, systemHealth: false },
    });
    expect(updated).toMatchObject({
      exists: true,
      defaultCountry: "NG",
      defaultCurrency: "NGN",
      defaultTimezone: "Africa/Lagos",
      featureFlags: { ...allFlags, commandPalette: false, systemHealth: false },
    });
    expect(updated.updatedAt).toBeGreaterThan(0);
    expect(updated.updatedBy).toBeTruthy();

    const persisted = await t.run(async (ctx) => ({
      settings: await ctx.db.query("platformSettings").collect(),
      audit: await ctx.db.query("auditLogs").collect(),
    }));
    expect(persisted.settings).toHaveLength(1);
    expect(persisted.settings[0]).toMatchObject({
      key: "global",
      defaultCurrency: "NGN",
    });
    expect(persisted.audit).toHaveLength(1);
    expect(persisted.audit[0]).toMatchObject({
      action: "settings.updated",
      targetType: "settings",
      targetId: "global",
    });

    const baseArgs = {
      defaultCountry: "NG",
      defaultCurrency: "NGN",
      defaultTimezone: "Africa/Lagos",
      maintenanceMode: false,
      featureFlags: allFlags,
    };

    await expect(
      t
        .withIdentity(superIdentity)
        .mutation(api.platform.updateSettings, { ...baseArgs, defaultCountry: "ZZ" })
    ).rejects.toThrow("Choose a valid ISO country code.");
    await expect(
      t
        .withIdentity(superIdentity)
        .mutation(api.platform.updateSettings, { ...baseArgs, defaultCurrency: "ZZZ" })
    ).rejects.toThrow("Choose a valid ISO 4217 currency code.");
    await expect(
      t
        .withIdentity(superIdentity)
        .mutation(api.platform.updateSettings, { ...baseArgs, defaultTimezone: "Mars/Base" })
    ).rejects.toThrow("Choose a valid IANA timezone.");
  });

  test("AC-022: only a super admin can change defaults and the change is audited with before/after values", async () => {
    const t = createConvexTest();
    await seedAdmins(t);

    await expect(
      t.withIdentity(adminIdentity).mutation(api.platform.updateSettings, {
        defaultCountry: "GB",
        defaultCurrency: "GBP",
        defaultTimezone: "Europe/London",
        maintenanceMode: false,
        featureFlags: allFlags,
      })
    ).rejects.toThrow("Super admin access required");

    const updated = await t.withIdentity(superIdentity).mutation(api.platform.updateSettings, {
      defaultCountry: "GB",
      defaultCurrency: "GBP",
      defaultTimezone: "Europe/London",
      maintenanceMode: false,
      featureFlags: allFlags,
    });
    expect(updated).toMatchObject({
      defaultCountry: "GB",
      defaultCurrency: "GBP",
      defaultTimezone: "Europe/London",
    });

    const seenByAdmin = await t
      .withIdentity(adminIdentity)
      .query(api.platform.getSettings, {});
    expect(seenByAdmin).toMatchObject({
      defaultCountry: "GB",
      defaultCurrency: "GBP",
      defaultTimezone: "Europe/London",
      updatedBy: expect.any(String),
    });

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "settings.updated"))
        .collect()
    );
    expect(audit).toHaveLength(1);
    expect(audit[0].actorEmail).toBe("super@example.com");
    expect(audit[0].metadata).toMatchObject({
      changes: {
        defaultCountry: { before: "US", after: "GB" },
        defaultCurrency: { before: "USD", after: "GBP" },
        defaultTimezone: { before: "UTC", after: "Europe/London" },
      },
    });
  });

  test("AC-023: maintenance mode needs the typed phrase, is audited, and is public only as mode plus message", async () => {
    const t = createConvexTest();
    await seedAdmins(t);

    const baseArgs = {
      defaultCountry: "US",
      defaultCurrency: "USD",
      defaultTimezone: "Africa/Lagos",
      maintenanceMode: true,
      maintenanceMessage: "We are upgrading the ticketing service.",
      featureFlags: allFlags,
    };

    await expect(
      t.withIdentity(superIdentity).mutation(api.platform.updateSettings, baseArgs)
    ).rejects.toThrow('Type "ENABLE MAINTENANCE" to turn on maintenance mode.');

    await expect(
      t
        .withIdentity(superIdentity)
        .mutation(api.platform.updateSettings, {
          ...baseArgs,
          confirmation: "enable maintenance",
        })
    ).rejects.toThrow('Type "ENABLE MAINTENANCE" to turn on maintenance mode.');

    const enabled = await t.withIdentity(superIdentity).mutation(api.platform.updateSettings, {
      ...baseArgs,
      confirmation: "ENABLE MAINTENANCE",
    });
    expect(enabled.maintenanceMode).toBe(true);

    const publicStatus = await t.query(api.platform.getPublicStatus, {});
    expect(publicStatus).toEqual({
      maintenanceMode: true,
      maintenanceMessage: "We are upgrading the ticketing service.",
    });
    expect(Object.keys(publicStatus).sort()).toEqual([
      "maintenanceMessage",
      "maintenanceMode",
    ]);

    await expect(t.query(api.platform.getSettings, {})).rejects.toThrow("Unauthenticated");

    const audit = await t.run(async (ctx) =>
      ctx.db.query("auditLogs").collect()
    );
    expect(audit.some((entry) => entry.action === "maintenance.changed")).toBe(true);
    const maintenanceAudit = audit.find((entry) => entry.action === "maintenance.changed");
    expect(maintenanceAudit).toMatchObject({
      actorEmail: "super@example.com",
      targetLabel: "Maintenance mode enabled",
      metadata: { before: false, after: true },
    });

    const disabled = await t.withIdentity(superIdentity).mutation(api.platform.updateSettings, {
      ...baseArgs,
      maintenanceMode: false,
    });
    expect(disabled.maintenanceMode).toBe(false);
    expect(await t.query(api.platform.getPublicStatus, {})).toMatchObject({
      maintenanceMode: false,
    });
  });
});
