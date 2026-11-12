"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  createTranslator,
  normalizeLocale,
  type Locale,
  type Translator,
} from "@/lib/i18n";

interface LocaleContextValue extends Translator {
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  unsupportedLocale,
  children,
}: {
  initialLocale: Locale;
  unsupportedLocale?: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(
    normalizeLocale(initialLocale)
  );
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const setLocale = useCallback(
    (next: Locale) => {
      const normalized = normalizeLocale(next);
      setLocaleState(normalized);
      document.cookie = `${LOCALE_COOKIE}=${normalized}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = normalized;
      router.refresh();
    },
    [router]
  );

  const value = useMemo<LocaleContextValue>(() => {
    const translator = createTranslator(locale);
    return { ...translator, setLocale };
  }, [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>
      {unsupportedLocale && !noticeDismissed && (
        <div
          role="status"
          className="relative z-50 flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs text-amber-100"
        >
          <span>
            {value.t("language.fallbackNotice", {
              locale: unsupportedLocale,
              fallback: value.t(locale === "fr" ? "language.fr" : "language.en"),
            })}
          </span>
          <button
            type="button"
            className="rounded px-2 py-1 font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            onClick={() => setNoticeDismissed(true)}
            aria-label={value.t("language.dismissNotice")}
          >
            {value.t("common.close")}
          </button>
        </div>
      )}
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useI18n must be used inside a LocaleProvider.");
  }
  return context;
}
