import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default async function OfflinePage() {
  const locale = await getRequestLocale();
  const { t } = createTranslator(locale);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
          <WifiOff className="size-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold">{t("offline.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("offline.body")}</p>
        <p className="text-xs text-muted-foreground">{t("offline.doorHint")}</p>
        <Button render={<Link href="/my-events" />}>{t("common.back")}</Button>
      </div>
    </main>
  );
}
