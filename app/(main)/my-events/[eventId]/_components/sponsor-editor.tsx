"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { ChevronDown, ChevronUp, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Sponsor editor (BP-003).
 *
 * Files are checked in the browser before upload, but the server repeats the
 * type, size, count, and URL checks so a crafted request cannot bypass them.
 */

export interface SponsorDraft {
  id: string;
  name: string;
  logoStorageId: string;
  websiteUrl?: string;
  order: number;
}

const SPONSOR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SPONSORS = 6;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function SponsorLogo({ storageId }: { storageId: string }) {
  const { data: url } = useConvexQuery(api.events.getImageUrl, {
    imageSource: storageId,
  });

  if (!url) {
    return (
      <div className="flex h-12 w-20 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
        Logo
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="h-12 w-20 rounded bg-white object-contain p-1"
    />
  );
}

export function SponsorEditor({
  sponsors,
  onChange,
}: {
  sponsors: SponsorDraft[];
  onChange: (sponsors: SponsorDraft[]) => void;
}) {
  const { t } = useI18n();
  const generateUploadUrl = useMutation(api.events.generateUploadUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const readFile = async (file: File) => {
    if (!SPONSOR_TYPES.includes(file.type)) {
      toast.error(t("settings.logoType"));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(t("settings.logoSize"));
      return;
    }

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const body = (await response.json()) as { storageId?: string };
      if (!body.storageId) throw new Error("Upload failed");

      if (sponsors.length >= MAX_SPONSORS) {
        toast.error(t("settings.sponsorLimit"));
        return;
      }

      onChange([
        ...sponsors,
        {
          id: `sponsor_${crypto.randomUUID()}`,
          name: "",
          logoStorageId: body.storageId,
          websiteUrl: "",
          order: sponsors.length,
        },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{t("settings.sponsors")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("settings.sponsorsHint")}
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={SPONSOR_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading || sponsors.length >= MAX_SPONSORS}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {t("settings.addSponsor")}
          </Button>
        </div>
      </div>

      {sponsors.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
          {t("settings.sponsorsHint")}
        </p>
      ) : (
        <div className="space-y-3">
          {sponsors.map((sponsor, index) => (
            <div
              key={sponsor.id}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[auto_1fr_1fr_auto]"
            >
              <SponsorLogo storageId={sponsor.logoStorageId} />
              <div className="space-y-1.5">
                <Label htmlFor={`sponsor-name-${sponsor.id}`}>
                  {t("settings.sponsorName")}
                </Label>
                <Input
                  id={`sponsor-name-${sponsor.id}`}
                  value={sponsor.name}
                  onChange={(event) =>
                    onChange(
                      sponsors.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, name: event.target.value }
                          : item
                      )
                    )
                  }
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`sponsor-url-${sponsor.id}`}>
                  {t("settings.sponsorWebsite")}
                </Label>
                <Input
                  id={`sponsor-url-${sponsor.id}`}
                  value={sponsor.websiteUrl ?? ""}
                  onChange={(event) =>
                    onChange(
                      sponsors.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, websiteUrl: event.target.value }
                          : item
                      )
                    )
                  }
                  placeholder="https://"
                />
              </div>
              <div className="flex items-center gap-1 self-end sm:flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("settings.moveUp")}
                  disabled={index === 0}
                  onClick={() => {
                    if (index === 0) return;
                    const next = [...sponsors];
                    [next[index - 1], next[index]] = [
                      next[index],
                      next[index - 1],
                    ];
                    onChange(
                      next.map((item, itemIndex) => ({
                        ...item,
                        order: itemIndex,
                      }))
                    );
                  }}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("settings.moveDown")}
                  disabled={index === sponsors.length - 1}
                  onClick={() => {
                    if (index >= sponsors.length - 1) return;
                    const next = [...sponsors];
                    [next[index], next[index + 1]] = [
                      next[index + 1],
                      next[index],
                    ];
                    onChange(
                      next.map((item, itemIndex) => ({
                        ...item,
                        order: itemIndex,
                      }))
                    );
                  }}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("settings.remove")}
                  onClick={() =>
                    onChange(
                      sponsors
                        .filter((item) => item.id !== sponsor.id)
                        .map((item, itemIndex) => ({
                          ...item,
                          order: itemIndex,
                        }))
                    )
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
