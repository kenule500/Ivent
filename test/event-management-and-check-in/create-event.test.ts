import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedUser } from "../helpers/seed";

const identity = identityFor("token|organizer", "Organizer", "organizer@example.com");

function eventArgs(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    title: "My Test Event",
    description: "A description that is comfortably longer than twenty characters.",
    category: "tech",
    tags: ["tech"],
    startDate: now + 86_400_000,
    endDate: now + 90_000_000,
    timezone: "Africa/Lagos",
    locationType: "physical" as const,
    city: "Port Harcourt",
    state: "Rivers",
    country: "Nigeria",
    capacity: 20,
    ticketType: "free" as const,
    ...overrides,
  };
}

async function setup(overrides: { freeEventsCreated?: number } = {}) {
  const t = createConvexTest();
  await t.run(async (ctx) => {
    await seedUser(ctx, {
      name: identity.name,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
      freeEventsCreated: overrides.freeEventsCreated ?? 0,
    });
  });
  return t;
}

describe("AC-002: valid event creation", () => {
  test("AC-002: stores a slug, organizer, zero registrations, and rejects the fourth event in a minute", async () => {
    const t = await setup();

    const firstId = await t.withIdentity(identity).mutation(
      api.events.createEvent,
      eventArgs({ hasPro: true })
    );

    const stored = await t.run(async (ctx) => {
      const event = await ctx.db.get(firstId);
      const organizer = await ctx.db.query("users").first();
      return { event, organizer };
    });

    expect(stored.event?.slug).toMatch(/^my-test-event-\d+$/);
    expect(stored.event?.organizerId).toBe(stored.organizer?._id);
    expect(stored.event?.organizerName).toBe(identity.name);
    expect(stored.event?.registrationCount).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, 5));
    const secondId = await t.withIdentity(identity).mutation(
      api.events.createEvent,
      eventArgs({ hasPro: true })
    );
    await t.withIdentity(identity).mutation(api.events.createEvent, eventArgs({ hasPro: true }));

    const slugs = await t.run(async (ctx) => {
      const events = await ctx.db.query("events").collect();
      return events.map((event) => event.slug);
    });
    expect(new Set(slugs).size).toBe(3);

    const first = await t.run((ctx) => ctx.db.get(firstId));
    const second = await t.run((ctx) => ctx.db.get(secondId));
    expect(first?.slug).not.toBe(second?.slug);

    await expect(
      t.withIdentity(identity).mutation(api.events.createEvent, eventArgs({ hasPro: true }))
    ).rejects.toThrow(/rate limit/i);
  });
});

describe("AC-003: free and Pro limits", () => {
  test("AC-003: a free account with one event is blocked from a second", async () => {
    const t = await setup({ freeEventsCreated: 1 });

    await expect(
      t.withIdentity(identity).mutation(api.events.createEvent, eventArgs())
    ).rejects.toThrow(/free event limit/i);
  });

  test("AC-003: a non-default theme colour requires Pro", async () => {
    const t = await setup();

    await expect(
      t.withIdentity(identity).mutation(
        api.events.createEvent,
        eventArgs({ themeColor: "#4c1d95" })
      )
    ).rejects.toThrow(/pro feature/i);
  });

  test("AC-003: a Pro account bypasses both checks", async () => {
    const t = await setup({ freeEventsCreated: 5 });

    const eventId = await t.withIdentity(identity).mutation(
      api.events.createEvent,
      eventArgs({ hasPro: true, themeColor: "#4c1d95" })
    );

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.themeColor).toBe("#4c1d95");
  });
});
