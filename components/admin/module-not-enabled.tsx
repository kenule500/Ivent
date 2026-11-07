"use client";

import Link from "next/link";
import { ArrowLeft, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Direct-URL fallback when a module is disabled by a feature flag (T5.4).
 * The server rejects the module's functions too, so this is presentation only.
 */
export function ModuleNotEnabled({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <PowerOff className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold">{label} is not enabled</h1>
          <p className="text-sm text-muted-foreground">
            This module is turned off in platform settings. A super admin can
            re-enable it, and the server will keep rejecting its requests until
            then.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/admin/dashboard" />}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
