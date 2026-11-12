"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={`inline-flex items-center gap-2 text-xs ${className}`}>
      <Languages className="size-4" aria-hidden="true" />
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs text-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        aria-label={t("language.label")}
      >
        <option value="en">{t("language.en")}</option>
        <option value="fr">{t("language.fr")}</option>
      </select>
    </label>
  );
}
