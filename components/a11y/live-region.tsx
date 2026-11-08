"use client";

import * as React from "react";

/**
 * Live-region announcer (AC-005, T1.3).
 *
 * One provider mounted in the root layout owns two visually hidden regions:
 * `polite` for successful outcomes and `assertive` for failures. Callers use the
 * `useAnnounce` hook, so no screen re-implements its own `aria-live` node and
 * nothing has to move focus to be heard.
 *
 * The content is cleared before the new message is written. Without that reset,
 * announcing the same sentence twice in a row is silent because the text node
 * never changed.
 */
type Politeness = "polite" | "assertive";

type Announcer = (message: string, politeness?: Politeness) => void;

const LiveRegionContext = React.createContext<Announcer>(noopAnnounce);

/**
 * Used only when a component renders outside the provider — for example a page
 * mounted in isolation by a test. It warns in development instead of throwing:
 * a thrown error would take the whole page down for a missing announcement,
 * which is worse than a dropped one. In the app the provider always exists.
 */
function noopAnnounce() {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "useAnnounce was called outside <LiveRegionProvider>; the announcement was dropped."
    );
  }
}

const RESET_DELAY_MS = 50;

export function LiveRegionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [politeMessage, setPoliteMessage] = React.useState("");
  const [assertiveMessage, setAssertiveMessage] = React.useState("");
  const timers = React.useRef<number[]>([]);

  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const announce = React.useCallback<Announcer>((message, politeness = "polite") => {
    const text = message.trim();
    if (!text) return;

    const setMessage =
      politeness === "assertive" ? setAssertiveMessage : setPoliteMessage;

    // Clear first so an identical message is announced again.
    setMessage("");
    const timer = window.setTimeout(() => setMessage(text), RESET_DELAY_MS);
    timers.current.push(timer);
  }, []);

  const value = React.useMemo(() => announce, [announce]);

  return (
    <LiveRegionContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}

/**
 * Announce an async outcome.
 */
export function useAnnounce(): Announcer {
  return React.useContext(LiveRegionContext);
}
