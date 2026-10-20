"use client";

import { Loader2, Wrench } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/useConvexQuery";

/**
 * Maintenance render gate (FR-025, AC-023).
 *
 * Public pages show the notice while maintenance mode is on. Signed-in admins
 * keep working; authentication routes are untouched because this gate only
 * wraps non-admin content in AdminAwareLayout.
 */

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { data: status, isLoading } = useConvexQuery(
    api.platform.getPublicStatus,
    {}
  );
  const { data: currentUser, isLoading: isLoadingUser } = useConvexQuery(
    api.users.getCurrentUser,
    {}
  );

  // Don't delay first paint on the normal path.
  if (isLoading || !status?.maintenanceMode) {
    return <>{children}</>;
  }

  if (isLoadingUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";
  if (isAdmin) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md space-y-3 rounded-2xl border bg-card p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-orange-500/10">
          <Wrench className="size-6 text-orange-500" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold">Scheduled maintenance</h1>
        <p className="text-sm text-muted-foreground">
          {status.maintenanceMessage}
        </p>
        <p className="text-xs text-muted-foreground">
          Administrators can still sign in and continue working.
        </p>
      </div>
    </div>
  );
}
