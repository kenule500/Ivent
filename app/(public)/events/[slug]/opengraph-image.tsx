import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import {
  formatEventDateRange,
  formatEventLocation,
} from "@/lib/event-format";

export const alt = "Ivent event";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let event = null;
  try {
    event = await getConvexServerClient().query(api.events.getEventBySlug, {
      slug,
    });
  } catch {
    event = null;
  }

  const font = await readFile(
    join(process.cwd(), "assets/Geist-Regular.ttf")
  ).catch(() => null);
  const themeColor = event?.themeColor || "#1e3a8a";
  const title = event?.title || "Event on Ivent";
  const date = event
    ? formatEventDateRange(event.startDate, event.endDate, {
        locale: event.locale,
        timezone: event.timezone,
      })
    : "Discover events on Ivent";
  const location = event ? formatEventLocation(event) : "ivent";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 64,
          position: "relative",
          background: themeColor,
          color: "white",
          fontFamily: "Geist",
        }}
      >
        {event?.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.82) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 30,
              letterSpacing: 2,
              textTransform: "uppercase",
              opacity: 0.9,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "white",
                color: themeColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              I
            </div>
            Ivent
          </div>
          <div
            style={{
              fontSize: title.length > 54 ? 58 : 74,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 30, opacity: 0.92 }}>{date}</div>
          <div style={{ fontSize: 26, opacity: 0.8 }}>{location}</div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(font
        ? {
            fonts: [
              {
                name: "Geist",
                data: font,
                style: "normal" as const,
                weight: 400 as const,
              },
            ],
          }
        : {}),
    }
  );
}
