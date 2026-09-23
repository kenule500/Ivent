"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

interface InviteStatusBadgeProps {
  status: InviteStatus;
  isExpired?: boolean;
}

export function InviteStatusBadge({ status, isExpired = false }: InviteStatusBadgeProps) {
  // Treat pending-but-expired as expired for display
  const effectiveStatus: InviteStatus = isExpired ? "expired" : status;

  const config = {
    pending: {
      label: "Pending",
      icon: Clock,
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    },
    accepted: {
      label: "Accepted",
      icon: CheckCircle2,
      className: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    expired: {
      label: "Expired",
      icon: AlertCircle,
      className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    },
    revoked: {
      label: "Revoked",
      icon: XCircle,
      className: "bg-red-500/10 text-red-600 border-red-500/20",
    },
  }[effectiveStatus];

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}