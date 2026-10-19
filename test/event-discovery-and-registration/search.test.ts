import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createConvexTest } from "../helpers/convex";
import { seedEvent, seedUser } from "../helpers/seed";

async function setup() {
  const t = createConvexTest();
  await t.run(async (ctx) => {
    const organizerId = await seedUser(ctx);
    const now = Date.now();
    for (let i = 0; i < 7; i++) {
      await seedEvent(ctx, organizerId, {
        title: `React Meetup ${i}`,
        startDate: now + (i + 1) * 86_400_000,
        endDate: now + (i + 1) * 86_400_000 + 3_600_000,
      });
    }
    await seedEvent(ctx, organizerId, {
      title: "React Meetup Past",
      startDate: now - 86_400_000,
      endDate: now - 80_000_000,
    });
    await seedEvent(ctx, organizerId, { title: "Unrelated Concert" });
  });
  return t;
}

describe("AC-013: event title search", () => {
  test("AC-013: a two-character query returns at most five upcoming matching events", async () => {
    const t = await setup();

    const results = await t.query(api.search.searchEvents, { query: "react" });

    expect(results.length).toBeLessThanOrEqual(5);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((event) => event.title.toLowerCase().includes("react"))).toBe(true);
    expect(results.every((event) => event.startDate >= Date.now())).toBe(true);
  });

  test("AC-013: blank or single-character queries return an empty list", async () => {
    const t = await setup();

    await expect(t.query(api.search.searchEvents, { query: "" })).resolves.toEqual([]);
    await expect(t.query(api.search.searchEvents, { query: "r" })).resolves.toEqual([]);
  });
});
