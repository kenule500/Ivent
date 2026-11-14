// @vitest-environment node
import { describe, expect, test } from "vitest";
import { api } from "@/convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedUser } from "../helpers/seed";

const organizerToken = "token|sponsor-organizer";
const organizerIdentity = identityFor(organizerToken, "Sponsor Organizer");

async function storeLogo(
  t: ReturnType<typeof createConvexTest>,
  type = "image/png",
  bytes = 4
) {
  return await t.run(async (ctx) => {
    const payload = new Uint8Array(bytes);
    if (bytes <= 65_536) {
      globalThis.crypto.getRandomValues(payload);
    }
    const storageId = await ctx.storage.store(new Blob([payload], { type }));
    // convex-test does not copy the Blob MIME type into the `_storage`
    // metadata row, so set it explicitly to mirror an upload.
    await ctx.db.patch(storageId as never, { contentType: type } as never);
    return storageId;
  });
}

async function setup() {
  const t = createConvexTest();
  const organizerId = await t.run(async (ctx) =>
    seedUser(ctx, {
      tokenIdentifier: organizerToken,
      name: "Sponsor Organizer",
      email: "sponsor-organizer@example.com",
    })
  );
  const firstLogo = await storeLogo(t);
  const secondLogo = await storeLogo(t);
  const thirdLogo = await storeLogo(t);
  const eventId = await t.run(async (ctx) =>
    seedEvent(ctx, organizerId, {
      slug: "sponsor-fixture",
      title: "Sponsor Fixture",
      currency: "NGN",
      countryCode: "NG",
      sponsors: [
        {
          id: "alpha",
          name: "Alpha",
          logoStorageId: firstLogo,
          websiteUrl: "https://alpha.example",
          order: 0,
        },
        {
          id: "beta",
          name: "Beta",
          logoStorageId: secondLogo,
          websiteUrl: "https://beta.example",
          order: 1,
        },
        {
          id: "gamma",
          name: "Gamma",
          logoStorageId: thirdLogo,
          websiteUrl: "https://gamma.example",
          order: 2,
        },
      ],
    })
  );

  return { t, organizerId, eventId, firstLogo, secondLogo, thirdLogo };
}

describe("AC-005: sponsor validation", () => {
  test("AC-005: sponsor saves reject empty names, unsupported logos, oversized logos, and non-HTTP(S) URLs", async () => {
    const { t, eventId, firstLogo } = await setup();
    const asOrganizer = t.withIdentity(organizerIdentity);

    const baseSponsor = {
      id: "sponsor-1",
      name: "Acme",
      logoStorageId: firstLogo,
      websiteUrl: "https://acme.example",
      order: 0,
    };

    await expect(
      asOrganizer.mutation(api.events.updateEventSettings, {
        eventId,
        sponsors: [{ ...baseSponsor, name: "   " }],
      })
    ).rejects.toThrow(/needs a name/i);

    const textLogo = await storeLogo(t, "text/plain");
    await expect(
      asOrganizer.mutation(api.events.updateEventSettings, {
        eventId,
        sponsors: [{ ...baseSponsor, logoStorageId: textLogo }],
      })
    ).rejects.toThrow(/PNG, JPEG, or WebP/i);

    const oversizedLogo = await storeLogo(t, "image/png", 2 * 1024 * 1024 + 1);
    await expect(
      asOrganizer.mutation(api.events.updateEventSettings, {
        eventId,
        sponsors: [{ ...baseSponsor, logoStorageId: oversizedLogo }],
      })
    ).rejects.toThrow(/2 MB or smaller/i);

    await expect(
      asOrganizer.mutation(api.events.updateEventSettings, {
        eventId,
        sponsors: [
          { ...baseSponsor, websiteUrl: "javascript:alert('xss')" },
        ],
      })
    ).rejects.toThrow(/URL|http/i);
  });
});

describe("AC-006: sponsor ordering and removal", () => {
  test("AC-006: reordering or removing one sponsor preserves the event, other sponsors, public order, and audit attribution", async () => {
    const { t, eventId, firstLogo, secondLogo, thirdLogo } = await setup();
    const asOrganizer = t.withIdentity(organizerIdentity);

    await asOrganizer.mutation(api.events.updateEventSettings, {
      eventId,
      sponsors: [
        {
          id: "gamma",
          name: "Gamma",
          logoStorageId: thirdLogo,
          websiteUrl: "https://gamma.example",
          order: 0,
        },
        {
          id: "alpha",
          name: "Alpha",
          logoStorageId: firstLogo,
          websiteUrl: "https://alpha.example",
          order: 1,
        },
      ],
    });

    const event = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(event).not.toBeNull();
    expect(event!.title).toBe("Sponsor Fixture");
    expect(event!.sponsors?.map((sponsor) => sponsor.name)).toEqual([
      "Gamma",
      "Alpha",
    ]);

    const publicEvent = await t.query(api.events.getEventBySlug, {
      slug: "sponsor-fixture",
    });
    expect(publicEvent?.sponsors.map((sponsor) => sponsor.name)).toEqual([
      "Gamma",
      "Alpha",
    ]);
    const publicLogoUrls = publicEvent?.sponsors.map(
      (sponsor) => sponsor.logoUrl
    );
    expect(publicLogoUrls?.[0]).toBeTruthy();
    expect(publicLogoUrls?.[1]).toBeTruthy();
    expect(publicLogoUrls?.[0]).not.toBe(publicLogoUrls?.[1]);

    const audit = await t.run(async (ctx) =>
      ctx.db.query("auditLogs").collect()
    );
    const sponsorAudit = audit.find(
      (row) => row.action === "event.sponsors_updated"
    );
    expect(sponsorAudit).toBeDefined();
    expect(sponsorAudit?.actorName).toBe("Sponsor Organizer");
    expect(sponsorAudit?.targetId).toBe(String(eventId));
    expect(sponsorAudit?.targetLabel).toBe("Sponsor Fixture");

    const untouched = await t.run(async (ctx) =>
      ctx.db.system.get("_storage", secondLogo)
    );
    expect(untouched).not.toBeNull();
  });
});
