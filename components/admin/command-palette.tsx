"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ArrowRight, Calendar, Loader2, Search, Ticket, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { ADMIN_NAV, type AdminFeatureFlag } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

/**
 * Ctrl/Cmd+K command palette (FR-004, FR-005, FR-006).
 *
 * Pages resolve locally from the navigation config; data comes from one
 * admin-authorized search call. The component is mounted only while open, so
 * each invocation starts from a clean slate.
 */

interface CommandPaletteProps {
  onOpenChange: (open: boolean) => void;
  enabledFlags?: Partial<Record<AdminFeatureFlag, boolean>>;
}

interface PaletteResult {
  id: string;
  group: "Pages" | "Users" | "Events" | "Registrations";
  label: string;
  hint?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PaletteData {
  users: { id: string; label: string; email: string }[];
  events: { id: string; label: string; city: string | null }[];
  registrations: { id: string; label: string; email: string }[];
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

export function CommandPalette({ onOpenChange, enabledFlags }: CommandPaletteProps) {
  const router = useRouter();
  const search = useMutation(api.admin.searchPalette);
  const [query, setQuery] = React.useState("");
  const [data, setData] = React.useState<PaletteData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [retryToken, setRetryToken] = React.useState(0);

  // Debounced search. All state updates happen from the timer callback or the
  // awaited continuation, never synchronously during the effect.
  React.useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await search({ query: term });
          if (cancelled) return;
          if (result.error) {
            setData(null);
            setError(result.error);
          } else {
            setData({
              users: result.users,
              events: result.events,
              registrations: result.registrations,
            });
          }
        } catch (err) {
          if (!cancelled) {
            setData(null);
            setError(err instanceof Error ? err.message : "Search failed");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, retryToken, search]);

  const handleQueryChange = (next: string) => {
    setQuery(next);
    setActiveIndex(0);
    // Cleared results must not linger after the term becomes too short.
    if (next.trim().length < MIN_QUERY) {
      setData(null);
      setError(null);
      setLoading(false);
    }
  };

  const pages = React.useMemo<PaletteResult[]>(() => {
    const term = query.trim().toLowerCase();
    return ADMIN_NAV.filter((item) => {
      if (item.flag && enabledFlags && enabledFlags[item.flag] === false) return false;
      if (!term) return true;
      return (
        item.label.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
      );
    }).map((item) => ({
      id: `page-${item.href}`,
      group: "Pages",
      label: item.label,
      hint: item.description,
      href: item.href,
      icon: item.icon,
    }));
  }, [query, enabledFlags]);

  const results = React.useMemo<PaletteResult[]>(() => {
    const dataResults: PaletteResult[] = [];

    for (const user of data?.users ?? []) {
      dataResults.push({
        id: `user-${user.id}`,
        group: "Users",
        label: user.label,
        hint: user.email,
        href: "/admin/users",
        icon: Users,
      });
    }

    for (const event of data?.events ?? []) {
      dataResults.push({
        id: `event-${event.id}`,
        group: "Events",
        label: event.label,
        hint: event.city ?? undefined,
        href: "/admin/events",
        icon: Calendar,
      });
    }

    for (const registration of data?.registrations ?? []) {
      dataResults.push({
        id: `registration-${registration.id}`,
        group: "Registrations",
        label: registration.label,
        hint: registration.email,
        href: "/admin/registrations",
        icon: Ticket,
      });
    }

    return [...pages, ...dataResults];
  }, [pages, data]);

  // Clamp during render instead of resetting in an effect, so a shrinking
  // result list can never point past the end.
  const safeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));

  const go = React.useCallback(
    (result: PaletteResult | undefined) => {
      if (!result) return;
      onOpenChange(false);
      router.push(result.href);
    },
    [onOpenChange, router]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(results.length ? (safeIndex + 1) % results.length : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        results.length ? (safeIndex - 1 + results.length) % results.length : 0
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[safeIndex]);
    }
  };

  const showDataHint = query.trim().length < MIN_QUERY;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] max-w-xl translate-y-0 gap-0 p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-sm font-semibold">Command palette</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages, users, events, and registrations.
          </DialogDescription>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              autoFocus
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, users, events, registrations…"
              aria-label="Search admin console"
              className="pl-8"
            />
            {loading && (
              <Loader2
                className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {error ? (
            <div className="space-y-2 px-3 py-4" role="alert">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRetryToken((token) => token + 1)}
              >
                Retry
              </Button>
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches for “{query.trim()}”.
            </p>
          ) : (
            <ul role="listbox" aria-label="Search results" className="space-y-1">
              {results.map((result, index) => {
                const previous = results[index - 1];
                const showGroup = !previous || previous.group !== result.group;
                const isActive = index === safeIndex;
                const Icon = result.icon;

                return (
                  <React.Fragment key={result.id}>
                    {showGroup && (
                      <li
                        role="presentation"
                        className={cn(
                          "px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground",
                          index > 0 && "pt-3"
                        )}
                      >
                        {result.group}
                      </li>
                    )}
                    <li role="option" aria-selected={isActive}>
                      <button
                        type="button"
                        onClick={() => go(result)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">
                            {result.label}
                          </span>
                          {result.hint && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {result.hint}
                            </span>
                          )}
                        </span>
                        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    </li>
                  </React.Fragment>
                );
              })}
            </ul>
          )}

          {showDataHint && (
            <p className="px-3 pb-1 pt-3 text-xs text-muted-foreground">
              Type at least {MIN_QUERY} characters to search users, events, and registrations.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
