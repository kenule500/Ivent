"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

/**
 * Explicit offline opt-in (BP-005, AC-010).
 *
 * Nothing is cached until the organizer presses the enable button. The same
 * control shows the cached attendee count and offers a full local wipe.
 */
export function OfflineControls({
  enabled,
  cachedCount,
  onEnable,
  onClear,
}: {
  enabled: boolean;
  cachedCount: number;
  onEnable: () => void;
  onClear: () => void;
}) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("door.offlineSetup")}</CardTitle>
        <CardDescription>{t("door.offlineSetupHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {enabled
            ? `${t("door.offlineEnabled")}${
                cachedCount > 0
                  ? ` · ${t("door.cacheSummary", { count: cachedCount })}`
                  : ""
              }`
            : t("door.offlineSetupHint")}
        </div>
        {enabled ? (
          <Button type="button" variant="outline" onClick={onClear}>
            {t("door.clearOffline")}
          </Button>
        ) : (
          <Button type="button" onClick={onEnable}>
            <WifiOff className="size-4" />
            {t("door.offlineEnable")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
