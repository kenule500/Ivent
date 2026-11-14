// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const state = vi.hoisted(() => ({
  cookie: null as string | null,
  acceptLanguage: null as string | null,
  platformLocale: "en" as "en" | "fr",
  register: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  announce: vi.fn(),
  onClose: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "NEXT_LOCALE" && state.cookie
        ? { name, value: state.cookie }
        : undefined,
  }),
  headers: async () => ({
    get: (name: string) =>
      name.toLowerCase() === "accept-language"
        ? state.acceptLanguage
        : undefined,
  }),
}));

vi.mock("@/lib/convex-server", () => ({
  getConvexServerClient: () => ({
    query: async () => ({ defaultLocale: state.platformLocale }),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("convex/react", () => ({
  useMutation: () => {
    const mutation = state.register;
    (mutation as unknown as { withOptimisticUpdate: () => unknown }).withOptimisticUpdate =
      () => mutation;
    return mutation;
  },
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Ada Lovelace",
      username: "ada",
      primaryEmailAddress: { emailAddress: "ada@example.com" },
    },
  }),
}));
vi.mock("sonner", () => ({
  toast: { success: state.toastSuccess, error: state.toastError },
}));
vi.mock("@/components/a11y/live-region", () => ({
  useAnnounce: () => state.announce,
}));

import {
  LocaleProvider,
  useI18n,
} from "@/components/locale-provider";
import { SponsorStrip } from "@/app/(public)/events/[slug]/_components/sponsor-strip";
import RegisterModal from "@/app/(public)/events/[slug]/_components/register-modal";
import { getLocaleResolution } from "@/lib/i18n/server";
import {
  LOCALE_COOKIE,
  getDictionary,
  normalizeLocale,
} from "@/lib/i18n";
import { normalizeCurrency } from "@/convex/validators";
import { formatEventDate, formatEventPrice } from "@/lib/event-format";
import { renderLifecycleEmail } from "@/convex/lifecycleTemplates";

function Probe() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div>
      <p data-testid="locale">{locale}</p>
      <p>{t("ticket.title")}</p>
      <button type="button" onClick={() => setLocale("fr")}>
        change
      </button>
    </div>
  );
}

beforeEach(() => {
  state.cookie = null;
  state.acceptLanguage = null;
  state.platformLocale = "en";
  state.register.mockReset();
  state.register.mockResolvedValue(undefined);
  state.toastSuccess.mockReset();
  state.toastError.mockReset();
  state.announce.mockReset();
  state.onClose.mockReset();
  document.cookie = `${LOCALE_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  document.documentElement.lang = "en";
});

describe("AC-031: English and French locale resolution", () => {
  test("AC-031: cookie, Accept-Language, platform default, dictionaries, and lifecycle email all resolve in English or French and the selection persists", async () => {
    state.cookie = "fr";
    await expect(getLocaleResolution()).resolves.toEqual({
      locale: "fr",
      requested: null,
    });

    state.cookie = null;
    state.acceptLanguage = "fr-FR,fr;q=0.9,en;q=0.5";
    await expect(getLocaleResolution()).resolves.toEqual({
      locale: "fr",
      requested: null,
    });

    state.acceptLanguage = "en-US,en;q=0.9";
    state.platformLocale = "fr";
    await expect(getLocaleResolution()).resolves.toEqual({
      locale: "fr",
      requested: null,
    });

    state.cookie = "de";
    state.platformLocale = "en";
    await expect(getLocaleResolution()).resolves.toEqual({
      locale: "en",
      requested: "de",
    });

    const en = getDictionary("en");
    const fr = getDictionary("fr");
    for (const key of [
      "event.register",
      "register.title",
      "ticket.title",
      "door.title",
      "offline.title",
    ]) {
      const translator = (locale: "en" | "fr") =>
        key.split(".").reduce<unknown>(
          (value, part) =>
            value && typeof value === "object"
              ? (value as Record<string, unknown>)[part]
              : undefined,
          getDictionary(locale)
        );
      expect(translator("en")).not.toBe(key);
      expect(translator("fr")).not.toBe(key);
      expect(translator("fr")).not.toBe(translator("en"));
    }

    const lifecycleContext = {
      attendeeName: "Ada Lovelace",
      eventTitle: "Lagos Builders Summit",
      eventDate: "12 May 2027",
      eventLocation: "Lagos, Nigeria",
      ticketCode: "EVT-123",
      ticketUrl: "https://ivent.example/tickets",
      feedbackUrl: "https://ivent.example/feedback",
      emailOptOut: false,
    };
    const enEmail = renderLifecycleEmail("registration_confirmation", {
      ...lifecycleContext,
      locale: "en",
    });
    const frEmail = renderLifecycleEmail("registration_confirmation", {
      ...lifecycleContext,
      locale: "fr",
    });
    expect(frEmail.subject).not.toBe(enEmail.subject);
    expect(frEmail.html).toContain("Lagos Builders Summit");
    expect(frEmail.subject).not.toMatch(/^[a-z]+\.[a-z]+$/);

    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="en">
        <Probe />
      </LocaleProvider>
    );
    expect(screen.getByText(en.ticket.title)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "change" }));
    expect(await screen.findByTestId("locale")).toHaveTextContent("fr");
    expect(screen.getByText(fr.ticket.title)).toBeInTheDocument();
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=fr`);
    expect(document.documentElement.lang).toBe("fr");
  });
});

describe("AC-032: French layout and accessible controls", () => {
  test("AC-032: French surfaces render at narrow and wide viewport sizes with locale-aware dates/currency and accessible names", async () => {
    const fr = getDictionary("fr");
    const user = userEvent.setup();
    const sizes = [360, 768, 1280];

    for (const width of sizes) {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
      });
      window.dispatchEvent(new Event("resize"));
      const view = render(
        <LocaleProvider initialLocale="fr">
          <RegisterModal
            event={{
              _id: `event-fr-${width}` as never,
              title: "Sommet des développeurs de Lagos",
              ticketType: "paid",
              ticketPrice: 5000,
              currency: "NGN",
              locale: "fr",
              timezone: "Africa/Lagos",
              registrationQuestions: [
                {
                  id: "full_name",
                  label: "Nom complet",
                  type: "short_text",
                  required: true,
                },
              ],
            }}
            isOpen
            onClose={state.onClose}
          />
        </LocaleProvider>
      );

      expect(screen.getByText(fr.register.privacyNote)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: fr.register.title })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: fr.common.cancel })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Nom complet/)
      ).toBeInTheDocument();
      expect(
        formatEventDate(Date.UTC(2027, 4, 12, 12), {
          locale: "fr",
          timezone: "Africa/Lagos",
        })
      ).toContain("2027");
      expect(
        formatEventPrice("paid", 5000, { locale: "fr", currency: "NGN" })
      ).toBe(
        new Intl.NumberFormat("fr", {
          style: "currency",
          currency: "NGN",
          maximumFractionDigits: 2,
        }).format(5000)
      );
      view.unmount();
    }

    await user.keyboard("{Tab}");
  });
});

describe("AC-033: organizer content is not translated", () => {
  test("AC-033: organizer-entered sponsor and event text is shown exactly as entered while product chrome is localized", () => {
    const fr = getDictionary("fr");
    render(
      <LocaleProvider initialLocale="fr">
        <SponsorStrip
          sponsors={[
            {
              id: "acme",
              name: "Acme & Fils",
              logoUrl: "https://cdn.example.com/acme.png",
              websiteUrl: "https://acme.example",
            },
          ]}
          themeColor="#1e3a8a"
        />
      </LocaleProvider>
    );

    expect(screen.getByText(fr.event.sponsors)).toBeInTheDocument();
    expect(screen.getByAltText("Acme & Fils")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: fr.event.sponsorLink.replace("{name}", "Acme & Fils"),
      })
    ).toHaveAttribute("href", "https://acme.example");
    expect(screen.queryByText("Acme & Sons")).not.toBeInTheDocument();
  });
});

describe("AC-034: unsupported values fall back with a notice", () => {
  test("AC-034: an unsupported locale or currency falls back with a non-blocking notice and never renders raw keys or blank values", async () => {
    const fr = getDictionary("fr");
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="fr" unsupportedLocale="de">
        <Probe />
      </LocaleProvider>
    );

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("de");
    expect(notice).toHaveTextContent(fr.language.fr);
    expect(notice).not.toHaveTextContent("language.fallbackNotice");
    await user.click(
      screen.getByRole("button", { name: fr.language.dismissNotice })
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    expect(normalizeLocale("de")).toBe("en");
    expect(normalizeCurrency("XYZ")).toBe("USD");
    expect(
      formatEventDate(Date.UTC(2027, 4, 12), { locale: "de", timezone: "UTC" })
    ).not.toBe("");
    expect.soft(
      formatEventPrice("paid", 5000, { locale: "de", currency: "XYZ" })
    ).toBe(
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(5000)
    );
    expect(
      formatEventPrice("paid", 5000, { locale: "de", currency: "XYZ" })
    ).not.toBe("");
  });
});
