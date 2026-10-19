import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedUser } from "../helpers/seed";

const identity = identityFor("token|organizer", "Organizer", "organizer@example.com");

async function setup() {
  const t = createConvexTest();
  await t.run(async (ctx) => {
    await seedUser(ctx, {
      name: identity.name,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
    });
  });
  return t;
}

describe("AC-004: cover image storage", () => {
  test("AC-004: an upload URL is issued and external URLs pass through", async () => {
    const t = await setup();

    const uploadUrl = await t.withIdentity(identity).mutation(api.events.generateUploadUrl, {});
    expect(typeof uploadUrl).toBe("string");
    expect(uploadUrl.length).toBeGreaterThan(0);

    await expect(
      t.query(api.events.getImageUrl, { imageSource: "https://example.com/a.png" })
    ).resolves.toBe("https://example.com/a.png");
    await expect(
      t.query(api.events.getImageUrl, { imageSource: "data:image/png;base64,AAAA" })
    ).resolves.toBe("data:image/png;base64,AAAA");
  });

  test("AC-004: a storage id resolves to a displayable URL and the event page exposes it", async () => {
    const t = await setup();

    const storageId = await t.run(async (ctx) => {
      return ctx.storage.store(new Blob(["fake-image"], { type: "image/png" }));
    });

    const resolved = await t.query(api.events.getImageUrl, {
      imageSource: storageId as unknown as string,
    });
    expect(resolved).toBeTruthy();

    const now = Date.now();
    const eventId = await t.withIdentity(identity).mutation(api.events.createEvent, {
      title: "Cover Event",
      description: "A description that is comfortably longer than twenty characters.",
      category: "tech",
      tags: ["tech"],
      startDate: now + 86_400_000,
      endDate: now + 90_000_000,
      timezone: "Africa/Lagos",
      locationType: "physical",
      city: "Port Harcourt",
      state: "Rivers",
      country: "Nigeria",
      capacity: 20,
      ticketType: "free",
      coverImage: storageId as unknown as string,
      hasPro: true,
    });

    const stored = await t.run((ctx) => ctx.db.get(eventId));
    const bySlug = await t.query(api.events.getEventBySlug, { slug: stored!.slug });
    expect(bySlug?.coverImageUrl).toBeTruthy();
  });
});
