"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { useI18n } from "@/components/locale-provider";
import { useAnnounce } from "@/components/a11y/live-region";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  cacheDoorSnapshot,
  clearDoorData,
  enableDoorOffline,
  isDoorOfflineEnabled,
  purgeExpiredDoorData,
  queueOfflineCheckIn,
  readDoorSnapshot,
  readQueuedCheckIns,
  type CachedDoorSnapshot,
  type QueuedCheckIn,
} from "@/lib/offline/db";
import { syncDoorQueue } from "@/lib/offline/sync";
import { formatEventDateTime, formatEventLocation } from "@/lib/event-format";
import { DoorScannerModal } from "../door/_components/door-scanner-modal";
import { OfflineControls } from "./offline-controls";
import { Id } from "@/convex/_generated/dataModel";

type LiveSnapshot = FunctionReturnType<typeof api.door.getDoorSnapshot>;

function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function DoorDashboard() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as Id<"events">;
  const { t, locale } = useI18n();
  const announce = useAnnounce();

  // Reading navigator through an external store avoids a setState-in-effect
  // cascade and keeps the online badge in sync with the browser.
  const isOnline = useSyncExternalStore(
    subscribeToConnectivity,
    () => navigator.onLine,
    () => true
  );
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cachedSnapshot, setCachedSnapshot] =
    useState<CachedDoorSnapshot | null>(null);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [queue, setQueue] = useState<QueuedCheckIn[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const syncLock = useRef(false);

  const liveData = useConvexQuery(api.door.getDoorSnapshot, { eventId });
  const checkInAttendee = useMutation(api.registrations.checkInAttendee);
  const syncOffline = useMutation(api.door.syncOfflineCheckIns);

  const snapshot: CachedDoorSnapshot | LiveSnapshot | null =
    isOnline && liveData.data ? liveData.data : cachedSnapshot;

  const attendees = useMemo(() => snapshot?.attendees ?? [], [snapshot]);

  const filteredAttendees = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return attendees;
    return attendees.filter(
      (attendee) =>
        attendee.attendeeName.toLowerCase().includes(term) ||
        attendee.attendeeEmail.toLowerCase().includes(term) ||
        attendee.qrCode.toLowerCase().includes(term)
    );
  }, [attendees, searchQuery]);

  const recent = isOnline && liveData.data?.recent
    ? liveData.data.recent
    : attendees
        .filter((attendee) => attendee.checkedIn && attendee.checkedInAt)
        .sort((a, b) => (b.checkedInAt ?? 0) - (a.checkedInAt ?? 0))
        .slice(0, 10)
        .map((attendee) => ({
          _id: attendee._id,
          attendeeName: attendee.attendeeName,
          checkedInAt: attendee.checkedInAt ?? 0,
          offline: false,
        }));

  useEffect(() => {
    void purgeExpiredDoorData();
    void isDoorOfflineEnabled(eventId).then(setOfflineEnabled);
    void readDoorSnapshot(eventId).then(setCachedSnapshot);
    void readQueuedCheckIns(eventId).then(setQueue);
  }, [eventId]);

  // Refresh the offline copy when connectivity drops so the door keeps
  // working without waiting for a reload.
  useEffect(() => {
    if (isOnline) return;
    void readDoorSnapshot(eventId).then(setCachedSnapshot);
  }, [eventId, isOnline]);

  useEffect(() => {
    if (!offlineEnabled || !liveData.data) return;

    const next: CachedDoorSnapshot = {
      eventId,
      event: liveData.data.event,
      counts: liveData.data.counts,
      attendees: liveData.data.attendees,
      cachedAt: Date.now(),
    };
    void cacheDoorSnapshot(next);
  }, [eventId, liveData.data, offlineEnabled]);

  const handleEnableOffline = async () => {
    try {
      await enableDoorOffline(eventId);
      setOfflineEnabled(true);
      if (liveData.data) {
        const next: CachedDoorSnapshot = {
          eventId,
          event: liveData.data.event,
          counts: liveData.data.counts,
          attendees: liveData.data.attendees,
          cachedAt: Date.now(),
        };
        setCachedSnapshot(next);
        await cacheDoorSnapshot(next);
      }
      toast.success(t("door.offlineEnabled"));
    } catch {
      toast.error(t("door.offlineUnavailable"));
    }
  };

  const handleClearOffline = async () => {
    await clearDoorData(eventId);
    setOfflineEnabled(false);
    setCachedSnapshot(null);
    setQueue([]);
    toast.success(t("door.offlineCleared"));
  };

  const handleCheckIn = useCallback(
    async (qrCode: string, source: "qr" | "manual") => {
      const code = qrCode.trim();
      if (!code || checkingIn) return;

      const attendee = attendees.find((item) => item.qrCode === code);
      if (!attendee) {
        toast.error(t("door.notFound"));
        announce(t("door.notFound"), "assertive");
        return;
      }
      if (attendee.checkedIn) {
        toast.error(t("door.alreadyCheckedIn"));
        announce(t("door.alreadyCheckedIn"), "assertive");
        return;
      }

      setCheckingIn(true);
      try {
        if (isOnline) {
          const result = await checkInAttendee({
            qrCode: code,
            eventId,
            source,
          });
          if (result.success) {
            toast.success(
              t("door.checkedInSuccess", { name: attendee.attendeeName })
            );
            announce(
              t("door.checkedInSuccess", { name: attendee.attendeeName })
            );
          } else {
            const message =
              result.outcome === "already_checked_in"
                ? t("door.alreadyCheckedIn")
                : result.outcome === "wrong_event"
                  ? t("door.wrongEvent")
                  : result.outcome === "cancelled"
                    ? t("door.cancelled")
                    : t("door.notFound");
            toast.error(message);
            announce(message, "assertive");
          }
        } else {
          const item: QueuedCheckIn = {
            id: crypto.randomUUID(),
            eventId,
            qrCode: code,
            attendeeName: attendee.attendeeName,
            scannedAt: Date.now(),
          };

          setQueue((current) => [...current, item]);
          await queueOfflineCheckIn(item);

          if (cachedSnapshot) {
            const checkedInAt = Date.now();
            const next: CachedDoorSnapshot = {
              ...cachedSnapshot,
              attendees: cachedSnapshot.attendees.map((entry) =>
                entry.qrCode === code
                  ? { ...entry, checkedIn: true, checkedInAt }
                  : entry
              ),
              counts: {
                ...cachedSnapshot.counts,
                checkedIn: cachedSnapshot.counts.checkedIn + 1,
                pending: Math.max(0, cachedSnapshot.counts.pending - 1),
              },
              cachedAt: checkedInAt,
            };
            setCachedSnapshot(next);
            await cacheDoorSnapshot(next);
          }

          toast.success(
            t("door.offlineSuccess", { name: attendee.attendeeName })
          );
          announce(
            t("door.offlineSuccess", { name: attendee.attendeeName })
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("common.error");
        toast.error(message);
        announce(message, "assertive");
      } finally {
        setCheckingIn(false);
        setManualCode("");
      }
    },
    [
      announce,
      attendees,
      cachedSnapshot,
      checkInAttendee,
      checkingIn,
      eventId,
      isOnline,
      t,
    ]
  );

  const syncQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0 || syncLock.current) return;
    syncLock.current = true;
    setIsSyncing(true);

    try {
      const summary = await syncDoorQueue(eventId, (items) =>
        syncOffline({ eventId, items })
      );
      const remaining = await readQueuedCheckIns(eventId);
      setQueue(remaining);

      if (summary.synced > 0) {
        toast.success(t("door.synced", { count: summary.synced }));
        announce(t("door.synced", { count: summary.synced }));
      } else if (summary.failed > 0) {
        toast.error(t("door.syncFailed", { count: summary.failed }));
      } else {
        toast.success(t("door.noneQueued"));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setIsSyncing(false);
      syncLock.current = false;
    }
  }, [announce, eventId, isOnline, queue, syncOffline, t]);

  useEffect(() => {
    if (!isOnline || queue.length === 0) return;
    const timer = window.setTimeout(() => void syncQueue(), 0);
    return () => window.clearTimeout(timer);
  }, [isOnline, queue.length, syncQueue]);

  if (!snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const event = snapshot.event;
  const counts = snapshot.counts;
  const rate =
    counts.confirmed > 0
      ? Math.round((counts.checkedIn / counts.confirmed) * 100)
      : 0;
  const lastCheckIn = recent[0]?.checkedInAt;

  return (
    <div className="min-h-screen px-4 pb-20 pt-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push(`/my-events/${eventId}`)}
            className="-ml-2 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Button>
          <Badge variant={isOnline ? "secondary" : "destructive"} className="gap-1.5">
            {isOnline ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {isOnline ? t("door.online") : t("door.offline")}
          </Badge>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("door.title")}</h1>
          <p className="text-sm text-muted-foreground">{event.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatEventDateTime(event.startDate, {
              locale: event.locale ?? locale,
              timezone: event.timezone,
            })}{" "}
            · {formatEventLocation(event)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: t("door.confirmed"),
              value: counts.confirmed,
              icon: Users,
              tone: "text-blue-500",
            },
            {
              label: t("door.checkedIn"),
              value: counts.checkedIn,
              icon: CheckCircle2,
              tone: "text-emerald-500",
            },
            {
              label: t("door.pending"),
              value: counts.pending,
              icon: Clock,
              tone: "text-amber-500",
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <stat.icon className={`size-5 ${stat.tone}`} />
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>{t("door.rate", { rate })}</span>
          <span>
            {t("door.lastCheckIn")}:{" "}
            {lastCheckIn
              ? formatEventDateTime(lastCheckIn, {
                  locale: event.locale ?? locale,
                  timezone: event.timezone,
                })
              : t("door.noRecent")}
          </span>
        </div>

        <OfflineControls
          enabled={offlineEnabled}
          cachedCount={cachedSnapshot?.attendees.length ?? 0}
          onEnable={() => void handleEnableOffline()}
          onClear={() => void handleClearOffline()}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("door.scan")}</CardTitle>
            <CardDescription>{t("door.cachedHint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => setScannerOpen(true)}
              disabled={checkingIn}
            >
              <QrCode className="size-5" />
              {t("door.scan")}
            </Button>

            <form
              className="flex gap-2"
              onSubmit={(formEvent) => {
                formEvent.preventDefault();
                void handleCheckIn(manualCode, "manual");
              }}
            >
              <Input
                value={manualCode}
                onChange={(inputEvent) => setManualCode(inputEvent.target.value)}
                placeholder={t("door.manualPlaceholder")}
                aria-label={t("door.manual")}
              />
              <Button type="submit" disabled={checkingIn || !manualCode.trim()}>
                {checkingIn ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t("door.checkIn")
                )}
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs">
              <span className="text-muted-foreground">
                {queue.length > 0
                  ? t("door.queued", { count: queue.length })
                  : t("door.noneQueued")}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void syncQueue()}
                disabled={!isOnline || queue.length === 0 || isSyncing}
              >
                <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? t("door.syncing") : t("door.syncNow")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="gap-1">
              <CardTitle className="text-base">{t("door.cached")}</CardTitle>
              <CardDescription>
                {(() => {
                  const cachedAt =
                    "cachedAt" in snapshot
                      ? snapshot.cachedAt
                      : liveData.data?.serverTime;
                  return cachedAt
                    ? formatEventDateTime(cachedAt, {
                        locale: event.locale ?? locale,
                        timezone: event.timezone,
                      })
                    : null;
                })()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(inputEvent) => setSearchQuery(inputEvent.target.value)}
                  placeholder={t("door.searchPlaceholder")}
                  className="pl-9"
                />
              </div>

              <div className="max-h-80 space-y-1 overflow-y-auto">
                {filteredAttendees.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t("common.search")}
                  </p>
                ) : (
                  filteredAttendees.map((attendee) => (
                    <div
                      key={attendee._id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {attendee.attendeeName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {attendee.attendeeEmail}
                        </p>
                      </div>
                      {attendee.checkedIn ? (
                        <Badge variant="secondary" className="shrink-0 gap-1">
                          <CheckCircle2 className="size-3" />
                          {t("door.checkedIn")}
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleCheckIn(attendee.qrCode, "manual")}
                        >
                          {t("door.checkIn")}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("door.recent")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("door.noRecent")}</p>
              ) : (
                recent.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {item.attendeeName}
                      {item.offline && (
                        <Badge
                          variant="outline"
                          className="ml-2 align-middle text-[10px]"
                        >
                          {t("door.offlineBadge")}
                        </Badge>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatEventDateTime(item.checkedInAt, {
                        locale: event.locale ?? locale,
                        timezone: event.timezone,
                      })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DoorScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(qrCode) => {
          setScannerOpen(false);
          void handleCheckIn(qrCode, "qr");
        }}
      />
    </div>
  );
}
