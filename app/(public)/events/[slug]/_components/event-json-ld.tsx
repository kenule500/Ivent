import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

type EventRecord = NonNullable<
  FunctionReturnType<typeof api.events.getEventBySlug>
>;

/**
 * Server-rendered schema.org Event data (BP-002).
 *
 * The JSON is escaped before it is embedded so a title containing `</script>`
 * cannot break out of the script element.
 */
export default function EventJsonLd({ event }: { event: EventRecord }) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000";

  const location =
    event.locationType === "online"
      ? {
          "@type": "VirtualLocation",
          url: `${siteUrl}/events/${event.slug}`,
        }
      : {
          "@type": "Place",
          name: event.venue || event.city || event.country || "Venue",
          address: {
            "@type": "PostalAddress",
            addressLocality: event.city ?? undefined,
            addressRegion: event.state ?? undefined,
            addressCountry: event.countryCode || event.country || undefined,
            streetAddress: event.address ?? undefined,
          },
        };

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: new Date(event.startDate).toISOString(),
    endDate: new Date(event.endDate).toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode:
      event.locationType === "online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    url: `${siteUrl}/events/${event.slug}`,
    image: event.coverImageUrl ? [event.coverImageUrl] : undefined,
    location,
    organizer: {
      "@type": "Organization",
      name: event.organizerName,
    },
    offers: {
      "@type": "Offer",
      price:
        event.ticketType === "paid" ? String(event.ticketPrice ?? 0) : "0",
      priceCurrency: event.currency ?? "USD",
      availability:
        event.registrationCount >= event.capacity
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
      url: `${siteUrl}/events/${event.slug}`,
    },
    sponsor: (event.sponsors ?? []).map((sponsor) => ({
      "@type": "Organization",
      name: sponsor.name,
      url: sponsor.websiteUrl,
      logo: sponsor.logoUrl,
    })),
  };

  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return (
    <script
      type="application/ld+json"
      // The payload is escaped above; this is the only safe way to embed JSON-LD.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
