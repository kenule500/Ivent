import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedUser } from "../helpers/seed";

const identity = identityFor("token|attendee", "Attendee", "attendee@example.com");

describe("AC-012: attendee onboarding persistence", () => {
  test("AC-012: completion stores the location, interests and hasCompletedOnboarding", async () => {
    const t = createConvexTest();
    const userId = await t.run((ctx) =>
      seedUser(ctx, {
        name: identity.name,
        tokenIdentifier: identity.tokenIdentifier,
        email: identity.email,
        hasCompletedOnboarding: false,
      })
    );

    await t.withIdentity(identity).mutation(api.users.completeOnboarding, {
      location: { city: "Port Harcourt", state: "Rivers", country: "Nigeria" },
      interests: ["tech", "music", "food"],
    });

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.hasCompletedOnboarding).toBe(true);
    expect(user?.location).toEqual({
      city: "Port Harcourt",
      state: "Rivers",
      country: "Nigeria",
    });
    expect(user?.interests).toEqual(["tech", "music", "food"]);
  });
});
