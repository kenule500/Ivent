import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedUser } from "../helpers/seed";

const adminIdentity = identityFor("token|admin", "Admin", "admin@example.com");
const DAY = 24 * 60 * 60 * 1000;

describe("settings projection", () => {
  test("AC-033: the admin settings query returns only admin-relevant fields, never attendee profile data", async () => {
    const t = createConvexTest();
    const now = Date.now();

    await t.run(async (ctx) => {
      await seedUser(ctx, {
        name: "Admin Person",
        tokenIdentifier: adminIdentity.tokenIdentifier,
        email: adminIdentity.email,
        role: "admin",
        image: "https://images.example.com/admin.png",
        createdAt: now - 30 * DAY,
        hasCompletedOnboarding: true,
        location: { city: "Lagos", country: "Nigeria" },
        preferences: {
          emailOnNewEvent: false,
          emailOnNewRegistration: true,
          emailOnNewAdminInvite: false,
          emailOnNewUser: true,
        },
      });
    });

    const profile = await t
      .withIdentity(adminIdentity)
      .query(api.settings.getMyProfile, {});

    expect(profile).toEqual({
      _id: expect.any(String),
      name: "Admin Person",
      email: "admin@example.com",
      image: "https://images.example.com/admin.png",
      role: "admin",
      createdAt: now - 30 * DAY,
      preferences: {
        emailOnNewEvent: false,
        emailOnNewRegistration: true,
        emailOnNewAdminInvite: false,
        emailOnNewUser: true,
      },
    });

    // Attendee-only fields and internal auth values must not cross the boundary.
    expect(profile).not.toHaveProperty("location");
    expect(profile).not.toHaveProperty("interests");
    expect(profile).not.toHaveProperty("hasCompletedOnboarding");
    expect(profile).not.toHaveProperty("tokenIdentifier");
    expect(profile).not.toHaveProperty("banned");
  });

  test("AC-034: a record missing optional fields degrades to honest defaults rather than invented values", async () => {
    const t = createConvexTest();

    await t.run(async (ctx) => {
      await seedUser(ctx, {
        name: "Minimal Admin",
        tokenIdentifier: adminIdentity.tokenIdentifier,
        email: adminIdentity.email,
        role: "admin",
        image: undefined,
        createdAt: undefined,
        preferences: undefined,
      });
    });

    const profile = await t
      .withIdentity(adminIdentity)
      .query(api.settings.getMyProfile, {});

    expect(profile).toMatchObject({
      name: "Minimal Admin",
      email: "admin@example.com",
      image: null,
      role: "admin",
      preferences: {
        emailOnNewEvent: true,
        emailOnNewRegistration: true,
        emailOnNewAdminInvite: true,
        emailOnNewUser: true,
      },
    });
    expect(profile.createdAt).toBeGreaterThan(0);
  });
});
