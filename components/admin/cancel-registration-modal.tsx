"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle, AlertTriangle } from "lucide-react";

interface CancelRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  attendeeName: string;
  eventTitle: string;
  isLoading?: boolean;
}

export function CancelRegistrationModal({
  isOpen,
  onClose,
  onConfirm,
  attendeeName,
  eventTitle,
  isLoading = false,
}: CancelRegistrationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <DialogTitle className="text-xl">Cancel Registration</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Are you sure you want to cancel the registration for{" "}
            <span className="font-semibold text-foreground">{attendeeName}</span>{" "}
            for{" "}
            <span className="font-semibold text-foreground">{eventTitle}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            <span className="font-semibold">Note:</span> The attendee will lose
            their spot and their QR code will be invalidated. This action cannot
            be undone.
          </p>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Keep Registration
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Cancel Registration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}