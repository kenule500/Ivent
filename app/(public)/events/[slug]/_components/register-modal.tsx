"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ticket, CheckCircle } from "lucide-react";
import { useConvexMutation } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAnnounce } from "@/components/a11y/live-region";
import { Id } from "@/convex/_generated/dataModel";

interface RegisterModalProps {
  event: {
    _id: Id<"events">;
    title: string;
    ticketType: string;
    ticketPrice?: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function RegisterModal({ event, isOpen, onClose }: RegisterModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const announce = useAnnounce();

  const attendeeName = user?.fullName ?? user?.username ?? "Guest";
  const attendeeEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const { mutate: registerForEvent, isLoading } = useConvexMutation(
    api.registrations.registerForEvent
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Guard against a second submission from an impatient double tap or Enter
    // while the first request is still in flight (AC-002).
    if (isLoading) return;

    setErrorMessage(null);

    try {
      await registerForEvent({
        eventId: event._id,
      });

      setIsSuccess(true);
      toast.success("Registration successful! 🎉");
      announce("Registration confirmed. Your ticket is in My Tickets.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.";
      // Show the reason inline and announce it, so the failure is not a
      // transient toast that a screen reader never reaches (AC-004, AC-005).
      setErrorMessage(message);
      announce(`Registration failed. ${message}`, "assertive");
      toast.error(message);
    }
  };

  const handleViewTicket = () => {
    router.push("/my-tickets");
    onClose();
  };

  // Success state
  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center space-y-4 py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold mb-2">
                You&apos;re All Set!
              </DialogTitle>
              <DialogDescription>
                Your registration is confirmed. Check your Tickets for event
                details and your QR code ticket.
              </DialogDescription>
            </div>
            <Separator />
            <div className="w-full space-y-2">
              <Button className="w-full gap-2" onClick={handleViewTicket}>
                <Ticket className="w-4 h-4" />
                View My Ticket
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Registration form
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register for Event</DialogTitle>
          <DialogDescription>
            Fill in your details to register for {event.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-semibold">{event.title}</p>
            <p className="text-sm text-muted-foreground">
              {event.ticketType === "free" ? (
                "Free Event"
              ) : (
                <span>
                  Price: ₦{event.ticketPrice}{" "}
                  <span className="text-xs">(Pay at venue)</span>
                </span>
              )}
            </p>
          </div>

          {/* Ticket holder (from the signed-in account) */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Ticket holder</p>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <p className="font-medium">{attendeeName}</p>
              {attendeeEmail && (
                <p className="text-muted-foreground">{attendeeEmail}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Your ticket is issued to your signed-in account.
            </p>
          </div>

          {/* Terms */}
          <p className="text-xs text-muted-foreground">
            By registering, you agree to receive event updates and reminders via
            email.
          </p>

          {/* Inline, announced failure reason (AC-004, AC-005) */}
          {errorMessage && (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  Register
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
