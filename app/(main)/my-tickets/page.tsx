/* eslint-disable react-hooks/purity */
"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, MapPin, Ticket, Wallet } from "lucide-react";
import { useAction, useMutation } from "convex/react";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { useI18n } from "@/components/locale-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  formatEventDateTime,
  formatEventLocation,
} from "@/lib/event-format";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TicketsSkeleton } from "@/components/skeletons/tickets-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EventCard from "@/components/event-card";
import { useAnnounce } from "@/components/a11y/live-region";
import type { FunctionReturnType } from "convex/server";
import { Id } from "@/convex/_generated/dataModel";

type RegistrationWithEvent = FunctionReturnType<
  typeof api.registrations.getMyRegistrations
>[number];
type RegistrationTicket = RegistrationWithEvent & {
  event: NonNullable<RegistrationWithEvent["event"]>;
};


export default function MyTicketsPage() {
  const { t, locale } = useI18n();
  const [selectedTicket, setSelectedTicket] = useState<RegistrationTicket | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // Optimistic override while the preference mutation settles; otherwise the
  // stored value is the source of truth.
  const [pendingOptOut, setPendingOptOut] = useState<boolean | null>(null);

  const issueWalletPass = useAction(api.wallet.issueWalletPass);

  const { data: registrations, isLoading } = useConvexQuery(
    api.registrations.getMyRegistrations
  );

  const optedOut =
    pendingOptOut ?? registrations?.[0]?.emailOptOut ?? false;
  const setEmailPreference = useMutation(api.registrations.setEmailPreference);

  const announce = useAnnounce();
  const announcedReady = useRef(false);

  // Announce once when the tickets arrive, not on every re-render (AC-005, T2.5).
  useEffect(() => {
    if (isLoading || !registrations || announcedReady.current) return;

    announcedReady.current = true;
    const count = registrations.length;
    announce(
      count === 0
        ? t("ticket.emptyBody")
        : `${t("ticket.title")}: ${count}`
    );
  }, [announce, isLoading, registrations, t]);

  // Cancellation is applied optimistically: the card disappears at once and
  // comes back if the server rejects it (FR-004, FR-005, AC-003, AC-004).
  const cancelRegistration = useMutation(
    api.registrations.cancelRegistration
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.registrations.getMyRegistrations);

    if (current === undefined) return;

    localStore.setQuery(
      api.registrations.getMyRegistrations,
      {},
      current.filter((registration) => registration._id !== args.registrationId)
    );
  });

  const handleCancelRegistration = async (registrationId: Id<"registrations">) => {
    if (!window.confirm(t("ticket.cancelConfirm"))) return;

    try {
      await cancelRegistration({ registrationId });
      toast.success(t("ticket.cancelled"));
      announce(t("ticket.cancelled"));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("common.error");
      toast.error(errorMessage);
      announce(`${t("ticket.cancelError")} ${errorMessage}`, "assertive");
    }
  };

  const handleAddToWallet = async (registrationId: Id<"registrations">) => {
    setWalletLoading(true);
    announce(t("ticket.addingToWallet"));
    try {
      const result = await issueWalletPass({ registrationId });
      if (result.ok) {
        window.open(result.saveUrl, "_blank", "noopener,noreferrer");
        announce(t("ticket.walletAdded"));
        toast.success(t("ticket.walletAdded"));
      } else {
        toast.error(result.message || t("ticket.walletUnavailable"));
        announce(result.message || t("ticket.walletUnavailable"), "assertive");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("ticket.walletError");
      toast.error(message);
      announce(message, "assertive");
    } finally {
      setWalletLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div aria-busy="true">
        <p className="sr-only" role="status">
          {t("common.loadingTickets")}
        </p>
        <TicketsSkeleton />
      </div>
    );
  }

  const now = Date.now();

  const upcomingTickets = registrations?.filter(
    (reg) =>
      reg.event && reg.event.startDate >= now && reg.status === "confirmed"
  ) || [];
  const pastTickets = registrations?.filter(
    (reg) =>
      reg.event && (reg.event.startDate < now || reg.status === "cancelled")
  ) || [];

  

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h1 className="text-4xl font-bold">{t("ticket.title")}</h1>
            <LocaleSwitcher />
          </div>
          <p className="text-muted-foreground">
            {t("ticket.subtitle")}
          </p>

          {/* Reminders and follow-ups are optional; the confirmation is not
              (FR-007, NFR-001). */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const next = !optedOut;
                await setEmailPreference({ emailOptOut: next });
                setPendingOptOut(next);
                announce(
                  next
                    ? "Email reminders turned off. Registration confirmations are still sent."
                    : "Email reminders turned on."
                );
              }}
            >
              {optedOut ? t("ticket.remindersOff") : t("ticket.remindersOn")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("ticket.confirmationsAlways")}
            </p>
          </div>
        </div>

        {/* Upcoming Tickets */}
        {upcomingTickets?.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">{t("ticket.upcoming")}</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingTickets.map((registration) => {
                // ✅ Safety check: If event is null, render nothing
                if (!registration.event) return null;
                const event = registration.event;
                return (
                  <EventCard
                    key={registration._id}
                    event={event}
                    action="ticket"
                    onClick={() =>
                      setSelectedTicket({
                        ...registration,
                        event,
                      })
                    }
                    onDelete={() => handleCancelRegistration(registration._id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Past Tickets */}
        {pastTickets?.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">{t("ticket.past")}</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastTickets.map((registration) => {
                // ✅ Safety check: If event is null, render nothing
                if (!registration.event) return null;
                return (
                  <EventCard
                    key={registration._id}
                    event={registration.event}
                    action={null}
                    className="opacity-60"
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!upcomingTickets?.length && !pastTickets?.length && (
          <EmptyState
            title={t("ticket.emptyTitle")}
            reason={t("ticket.emptyBody")}
            icon={<Ticket className="h-10 w-10" />}
            action={{ label: t("ticket.browse"), href: "/explore" }}
          />
        )}
      </div>

      {/* QR Code Modal */}
      {selectedTicket && (
        <Dialog
          open={!!selectedTicket}
          onOpenChange={() => setSelectedTicket(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("ticket.yourTicket")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-center">
                <p className="font-semibold mb-1">
                  {selectedTicket.attendeeName}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedTicket.event.title}
                </p>
              </div>

              <div className="flex justify-center p-6 bg-white rounded-lg">
                <QRCode value={selectedTicket.qrCode} size={200} level="H" />
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("ticket.ticketId")}
                </p>
                <p className="font-mono text-sm">{selectedTicket.qrCode}</p>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatEventDateTime(selectedTicket.event.startDate, {
                      locale:
                        (selectedTicket.event.locale as string | undefined) ??
                        locale,
                      timezone: selectedTicket.event.timezone,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {selectedTicket.event.locationType === "online"
                      ? t("event.onlineEvent")
                      : formatEventLocation(selectedTicket.event)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {t("ticket.showAtEntrance")}
              </p>

              {selectedTicket.answers && selectedTicket.answers.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    {t("ticket.answersTitle")}
                  </p>
                  <dl className="space-y-1.5 text-sm">
                    {selectedTicket.answers.map((answer) => {
                      const question =
                        selectedTicket.event.registrationQuestions?.find(
                          (item) => item.id === answer.questionId
                        );
                      const label = question?.label ?? answer.questionId;
                      const value = Array.isArray(answer.value)
                        ? answer.value.join(", ")
                        : String(answer.value);
                      return (
                        <div key={answer.questionId}>
                          <dt className="text-xs text-muted-foreground">
                            {label}
                          </dt>
                          <dd>{value || "—"}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}

              {selectedTicket.status === "confirmed" &&
                selectedTicket.event.walletEnabled !== false && (
                  <div className="space-y-1.5">
                    <Button
                      className="w-full gap-2"
                      onClick={() => handleAddToWallet(selectedTicket._id)}
                      disabled={walletLoading}
                    >
                      <Wallet className="w-4 h-4" />
                      {walletLoading
                        ? t("ticket.addingToWallet")
                        : t("ticket.addToWallet")}
                    </Button>
                    {selectedTicket.wallet?.status === "active" && (
                      <p
                        role="status"
                        className="text-center text-xs text-muted-foreground"
                      >
                        {t("ticket.walletStatusActive")}
                      </p>
                    )}
                    {selectedTicket.wallet?.status === "error" && (
                      <p
                        role="status"
                        className="text-center text-xs text-destructive"
                      >
                        {t("ticket.walletStatusFailed")}
                      </p>
                    )}
                    {selectedTicket.wallet?.status === "voided" && (
                      <p
                        role="status"
                        className="text-center text-xs text-muted-foreground"
                      >
                        {t("ticket.walletStatusVoided")}
                      </p>
                    )}
                  </div>
                )}

              <p className="text-center text-[11px] text-muted-foreground">
                {t("ticket.appleUnavailable")}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
