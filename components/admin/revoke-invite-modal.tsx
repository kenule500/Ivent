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

interface RevokeInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  email: string;
  isLoading?: boolean;
}

export function RevokeInviteModal({
  isOpen,
  onClose,
  onConfirm,
  email,
  isLoading = false,
}: RevokeInviteModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <DialogTitle className="text-xl">Revoke Invite</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Are you sure you want to revoke the invite for{" "}
            <span className="font-semibold text-foreground">{email}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            The invite code will stop working immediately. You can resend the
            invite later if needed.
          </p>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Keep Invite
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
                Revoking...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Revoke Invite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}