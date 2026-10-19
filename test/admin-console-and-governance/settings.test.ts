import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedUser } from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const userIdentity = identityFor("token|user", "User", "user@example.com");

async function setup() {
  const t = createConvexTest();
  await t.run(async (ctx) => {
    await seedUser(ctx, {
      name: "Admin",
      tokenIdentifier: adminIdentity.tokenIdentifier,
      email: adminIdentity.email,
      role: "admin",
    });
    await seedUser(ctx, {
      name: "User",
      tokenIdentifier: userIdentity.tokenIdentifier,
      email: userIdentity.email,
      role: "user",
    });
  });
  return t;
}

describe("AC-011: admin email preferences", () => {
  test("AC-011: defaults are returned when no preferences are stored", async () => {
    const t = await setup();

    const profile = await t.withIdentity(adminIdentity).query(api.settings.getMyProfile, {});

    expect(profile.preferences).toEqual({
      emailOnNewEvent: true,
      emailOnNewRegistration: true,
      emailOnNewAdminInvite: true,
      emailOnNewUser: true,
    });
  });

  test("AC-011: updated preferences persist on the user record", async () => {
    const t = await setup();

    await t.withIdentity(adminIdentity).mutation(api.settings.updateMyPreferences, {
      preferences: {
        emailOnNewEvent: false,
        emailOnNewRegistration: true,
        emailOnNewAdminInvite: false,
        emailOnNewUser: true,
      },
    });

    const profile = await t.withIdentity(adminIdentity).query(api.settings.getMyProfile, {});
    expect(profile.preferences).toMatchObject({
      emailOnNewEvent: false,
      emailOnNewAdminInvite: false,
    });
  });

  test("AC-011: a non-admin cannot read or update admin preferences", async () => {
    const t = await setup();

    await expect(t.withIdentity(userIdentity).query(api.settings.getMyProfile, {})).rejects.toThrow(
      /admin access required/i
    );
    await expect(
      t.withIdentity(userIdentity).mutation(api.settings.updateMyPreferences, {
        preferences: {
          emailOnNewEvent: true,
          emailOnNewRegistration: true,
          emailOnNewAdminInvite: true,
          emailOnNewUser: true,
        },
      })
    ).rejects.toThrow(/admin access required/i);
  });
});
