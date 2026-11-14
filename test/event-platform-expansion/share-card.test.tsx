// @vitest-environment node
import { describe, expect, test, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  imageElements: [] as unknown[],
}));

vi.mock("@/lib/convex-server", () => ({
  getConvexServerClient: () => ({ query: mocks.query }),
}));
vi.mock("@/lib/i18n/server", () => ({
  getRequestLocale: async () => "en",
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useParams: () => ({ slug: "lagos-builders-summit" }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: unknown) {
      mocks.imageElements.push(element);
    }
  },
}));

import { generateMetadata } from "@/app/(public)/events/[slug]/page";
import EventJsonLd from "@/app/(public)/events/[slug]/_components/event-json-ld";
import OpenGraphImage from "@/app/(public)/events/[slug]/opengraph-image";

const startDate = Date.UTC(2027, 4, 12, 9, 0);
const endDate = Date.UTC(2027, 4, 12, 17, 0);

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    _id: "event_123",
    title: "Lagos Builders Summit",
    description:
      "A full day of practical talks, workshops, and networking for people building products in West Africa.",
    slug: "lagos-builders-summit",
    organizerId: "user_123",
    organizerName: "Ada Organizer",
    category: "tech",
    startDate,
    endDate,
    timezone: "Africa/Lagos",
    locationType: "physical",
    venue: "Landmark Centre",
    address: "1 Water Corporation Road",
    city: "Lagos",
    country: "Nigeria",
    countryCode: "NG",
    currency: "NGN",
    locale: "en",
    capacity: 100,
    registrationCount: 42,
    ticketType: "paid",
    ticketPrice: 5000,
    themeColor: "#1e3a8a",
    coverImage: "https://example.com/cover.jpg",
    coverImageUrl: "https://example.com/cover.jpg",
    sponsors: [
      {
        id: "sponsor_1",
        name: "Acme",
        logoStorageId: "storage_1",
        websiteUrl: "https://acme.example",
        order: 0,
        logoUrl: "https://example.com/acme.png",
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  mocks.query.mockReset();
  mocks.imageElements.length = 0;
});

describe("AC-001: public event metadata", () => {
  test("AC-001: public event metadata derives title, description, canonical, Open Graph, and Twitter fields from the event", async () => {
    const event = makeEvent();
    mocks.query.mockResolvedValue(event);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: event.slug }),
    });

    expect(metadata.title).toBe("Lagos Builders Summit");
    expect(metadata.description).toBe(event.description);
    expect(String(metadata.alternates?.canonical)).toContain(
      "/events/lagos-builders-summit"
    );

    const openGraph = metadata.openGraph as Record<string, unknown>;
    expect(openGraph).toMatchObject({
      type: "website",
      title: event.title,
      description: event.description,
      url: "/events/lagos-builders-summit",
    });
    expect(openGraph.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/events/lagos-builders-summit/opengraph-image",
          width: 1200,
          height: 630,
          alt: event.title,
        }),
      ])
    );

    const twitter = metadata.twitter as Record<string, unknown>;
    expect(twitter).toMatchObject({
      card: "summary_large_image",
      title: event.title,
      description: event.description,
    });
    expect(twitter.images).toEqual(
      expect.arrayContaining(["/events/lagos-builders-summit/opengraph-image"])
    );
    expect(JSON.stringify(metadata)).not.toContain(
      "Discover and create amazing events"
    );
  });
});

describe("AC-002: generated social card", () => {
  test("AC-002: the 1200x630 social card includes title, date, city/country, organizer, cover, and a branded fallback", async () => {
    const event = makeEvent();
    mocks.query.mockResolvedValue(event);

    await OpenGraphImage({
      params: Promise.resolve({ slug: event.slug }),
    });

    const card = renderToStaticMarkup(
      mocks.imageElements[0] as ReactElement
    );
    expect(card).toContain(event.title);
    expect(card).toContain("Lagos, Nigeria");
    expect(card).toContain(event.organizerName);
    expect(card).toContain(event.coverImageUrl);

    mocks.imageElements.length = 0;
    mocks.query.mockResolvedValue(
      makeEvent({ coverImage: undefined, coverImageUrl: undefined })
    );

    await OpenGraphImage({
      params: Promise.resolve({ slug: event.slug }),
    });

    const fallback = renderToStaticMarkup(
      mocks.imageElements[0] as ReactElement
    );
    expect(fallback).toContain(event.title);
    expect(fallback).not.toContain("<img");
  });
});

describe("AC-003: event JSON-LD", () => {
  test("AC-003: public event JSON-LD carries valid schema.org Event fields and ISO dates", () => {
    const event = makeEvent();

    const html = renderToStaticMarkup(
      <EventJsonLd event={event as never} />
    );
    const match = html.match(
      /<script type="application\/ld\+json">([\s\S]*)<\/script>/
    );
    expect(match).not.toBeNull();

    const data = JSON.parse(match![1]) as Record<string, any>;

    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("Event");
    expect(data.name).toBe(event.title);
    expect(data.startDate).toBe(new Date(startDate).toISOString());
    expect(data.endDate).toBe(new Date(endDate).toISOString());
    expect(data.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(data.location["@type"]).toBe("Place");
    expect(data.location.name).toBe(event.venue);
    expect(data.location.address.addressLocality).toBe(event.city);
    expect(data.location.address.addressCountry).toBe(event.countryCode);
    expect(data.image).toEqual([event.coverImageUrl]);
    expect(data.organizer).toMatchObject({
      "@type": "Organization",
      name: event.organizerName,
    });
    expect(data.offers).toMatchObject({
      "@type": "Offer",
      price: "5000",
      priceCurrency: "NGN",
    });
  });
});
