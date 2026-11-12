import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import EventDetail from "./event-detail";
import EventJsonLd from "./_components/event-json-ld";

type EventRecord = NonNullable<
  FunctionReturnType<typeof api.events.getEventBySlug>
>;

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

async function loadEvent(slug: string): Promise<EventRecord | null> {
  try {
    return await getConvexServerClient().query(api.events.getEventBySlug, {
      slug,
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);

  if (!event) {
    const locale = await getRequestLocale();
    const { t } = createTranslator(locale);
    return {
      title: t("event.notFoundTitle"),
      description: t("event.notFoundBody"),
      robots: { index: false, follow: false },
    };
  }

  const description = event.description.replace(/\s+/g, " ").slice(0, 160);
  const canonical = `/events/${event.slug}`;
  const image = `/events/${event.slug}/opengraph-image`;

  return {
    title: event.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: event.title,
      description,
      url: canonical,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [image],
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await loadEvent(slug);

  if (!event) notFound();

  return (
    <>
      <EventJsonLd event={event} />
      <EventDetail />
    </>
  );
}
