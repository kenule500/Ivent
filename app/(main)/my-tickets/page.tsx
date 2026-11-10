/* eslint-disable react-hooks/purity */
"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { useMutation } from "convex/react";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import QRCode from "react-qr-code";

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
  const [selectedTicket, setSelectedTicket] = useState<RegistrationTicket | null>(null);

  const { data: registrations, isLoading } = useConvexQuery(
    api.registrations.getMyRegistrations
  );

  const announce = useAnnounce();
  const announcedReady = useRef(false);

  // Announce once when the tickets arrive, not on every re-render (AC-005, T2.5).
  useEffect(() => {
    if (isLoading || !registrations || announcedReady.current) return;

    announcedReady.current = true;
    const count = registrations.length;
    announce(
      count === 0
        ? "No tickets yet. When you register for an event, the ticket appears here."
        : `Your tickets are ready. ${count} registration${count === 1 ? "" : "s"}.`
    );
  }, [announce, isLoading, registrations]);

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
    if (!window.confirm("Are you sure you want to cancel this registration?"))
      return;

    try {
      await cancelRegistration({ registrationId });
      toast.success("Registration cancelled successfully.");
      announce("Registration cancelled.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
      announce(`Could not cancel the registration. ${errorMessage}`, "assertive");
    }
  };

  if (isLoading) {
    return (
      <div aria-busy="true">
        <p className="sr-only" role="status">
          Loading your tickets
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
          <h1 className="text-4xl font-bold mb-2">My Tickets</h1>
          <p className="text-muted-foreground">
            View and manage your event registrations
          </p>
        </div>

        {/* Upcoming Tickets */}
        {upcomingTickets?.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>

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
            <h2 className="text-2xl font-bold mb-4">Past Events</h2>

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
            title="No tickets yet"
            reason="You have not registered for an event yet. Once you register, your ticket appears here with its QR code."
            icon={<Ticket className="h-10 w-10" />}
            action={{ label: "Browse events", href: "/explore" }}
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
              <DialogTitle>Your Ticket</DialogTitle>
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
                <p className="text-xs text-muted-foreground mb-1">Ticket ID</p>
                <p className="font-mono text-sm">{selectedTicket.qrCode}</p>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(selectedTicket.event.startDate, "PPP, h:mm a")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {selectedTicket.event.locationType === "online"
                      ? "Online Event"
                      : `${selectedTicket.event.city}, ${
                          selectedTicket.event.state ||
                          selectedTicket.event.country
                        }`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Show this QR code at the event entrance for check-in
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
