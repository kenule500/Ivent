"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { clearDoorData } from "@/lib/offline/db";

/**
 * Register the offline shell worker after first paint. Registration is skipped
 * in development so hot reload is not served from a stale cache.
 *
 * Signing out also removes cached attendee PII from IndexedDB (BP-005, AC-013).
 */
const KILL_SWITCH_KEY = "ivent:disable-service-worker";

export function ServiceWorkerRegister() {
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    void clearDoorData();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // Kill switch: set NEXT_PUBLIC_DISABLE_SERVICE_WORKER=true for a deployment,
    // or visit any page with ?sw=off to disable it on one device. ?sw=on clears
    // the device flag. Disabling also removes cached shells.
    const params = new URLSearchParams(window.location.search);
    if (params.get("sw") === "on") {
      localStorage.removeItem(KILL_SWITCH_KEY);
    }
    if (params.get("sw") === "off") {
      localStorage.setItem(KILL_SWITCH_KEY, "1");
    }

    const disabled =
      process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER === "true" ||
      localStorage.getItem(KILL_SWITCH_KEY) === "1";

    if (disabled) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister())
          )
        )
        .catch(() => undefined);
      if ("caches" in window) {
        void caches
          .keys()
          .then((keys) =>
            Promise.all(keys.map((key) => caches.delete(key)))
          )
          .catch(() => undefined);
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is optional; the app still works online */
      });
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
