import { cookies, headers } from "next/headers";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { LOCALE_COOKIE, isSupportedLocale, type Locale } from ".";

export interface LocaleResolution {
  locale: Locale;
  /** A requested but unsupported locale, shown in a non-blocking notice. */
  requested: string | null;
}

async function platformLocale(): Promise<Locale> {
  try {
    const status = await getConvexServerClient().query(
      api.platform.getPublicStatus,
      {}
    );
    return status.defaultLocale === "fr" ? "fr" : "en";
  } catch {
    // No deployment or network: English remains a safe default.
    return "en";
  }
}

/**
 * Resolve the request locale on the server. An explicit supported cookie wins;
 * a French Accept-Language header is honored next; the platform default follows;
 * English is the final fallback. An unsupported cookie value falls back to the
 * platform default and is reported so the layout can show a non-blocking notice.
 */
export async function getLocaleResolution(): Promise<LocaleResolution> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value?.trim();

  if (fromCookie) {
    if (isSupportedLocale(fromCookie)) {
      return { locale: fromCookie, requested: null };
    }
    return { locale: await platformLocale(), requested: fromCookie };
  }

  const headerStore = await headers();
  const accept = headerStore.get("accept-language")?.toLowerCase() ?? "";
  if (/(^|,)\s*fr\b/.test(accept)) {
    return { locale: "fr", requested: null };
  }

  return { locale: await platformLocale(), requested: null };
}

export async function getRequestLocale(): Promise<Locale> {
  return (await getLocaleResolution()).locale;
}
