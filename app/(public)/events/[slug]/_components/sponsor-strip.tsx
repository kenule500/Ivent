"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SmartImage } from "@/components/SmartImage";
import { useI18n } from "@/components/locale-provider";

/**
 * Public sponsor strip (BP-003).
 *
 * Sponsor names and logos are organizer-entered content and are never machine
 * translated. Only the strip heading and link label come from the dictionary.
 */

interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
}

function darken(color: string, amount: number) {
  const value = color.replace("#", "");
  const num = parseInt(value, 16);
  const r = Math.max(0, (num >> 16) - amount * 255);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount * 255);
  const b = Math.max(0, (num & 0x0000ff) - amount * 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function SponsorStrip({
  sponsors,
  themeColor,
}: {
  sponsors?: Sponsor[] | null;
  themeColor?: string | null;
}) {
  const { t } = useI18n();
  const visible = (sponsors ?? []).filter((sponsor) => sponsor.logoUrl);
  if (visible.length === 0) return null;

  return (
    <Card
      className="pt-0"
      style={{
        backgroundColor: themeColor ? darken(themeColor, 0.04) : "#1e3a8a",
      }}
    >
      <CardContent className="pt-6">
        <h2 className="mb-4 text-2xl font-bold">{t("event.sponsors")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {visible.map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.websiteUrl || undefined}
              target={sponsor.websiteUrl ? "_blank" : undefined}
              rel={sponsor.websiteUrl ? "noopener noreferrer" : undefined}
              aria-label={t("event.sponsorLink", { name: sponsor.name })}
              className="flex min-h-24 items-center justify-center rounded-lg bg-white/95 p-4 transition-transform hover:scale-[1.02]"
            >
              <SmartImage
                src={sponsor.logoUrl!}
                alt={sponsor.name}
                width={160}
                height={80}
                className="max-h-16 w-auto object-contain"
              />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
