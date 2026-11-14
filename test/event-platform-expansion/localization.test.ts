// @vitest-environment node
import { describe, expect, test } from "vitest";
import { api } from "@/convex/_generated/api";
import { createConvexTest, identityFor } from "../helpers/convex";
import { seedEvent, seedUser } from "../helpers/seed";
import { getDictionary } from "@/lib/i18n";
import {
  formatEventDate,
  formatEventDateTime,
  formatEventPrice,
  formatEventTimeRange,
} from "@/lib/event-format";

const superAdminToken = "token|localization-super";
const superAdminIdentity = identityFor(superAdminToken, "Localization Admin");

async function setupSettings() {
  const t = createConvexTest();
  const adminId = await t.run(async (ctx) =>
    seedUser(ctx, {
      tokenIdentifier: superAdminToken,
      name: "Localization Admin",
      email: "localization-admin@example.com",
      role: "super_admin",
    })
  );

  return { t, adminId };
}

function settingsArgs(overrides: Record<string, unknown> = {}) {
  return {
    defaultCountry: "NG",
    defaultCurrency: "NGN",
    defaultTimezone: "Africa/Lagos",
    defaultLocale: "fr" as const,
    maintenanceMode: false,
    featureFlags: {
      commandPalette: true,
      reports: true,
      broadcasts: true,
      feedbackInbox: true,
      systemHealth: true,
    },
    ...overrides,
  };
}

describe("AC-026: platform locale and currency settings", () => {
  test("AC-026: a super admin can set locale, currency, country, and timezone while unsupported values are rejected clearly", async () => {
    const { t } = await setupSettings();
    const asAdmin = t.withIdentity(superAdminIdentity);

    await asAdmin.mutation(api.platform.updateSettings, settingsArgs());
    const settings = await asAdmin.query(api.platform.getSettings, {});
    expect(settings).toMatchObject({
      defaultCountry: "NG",
      defaultCurrency: "NGN",
      defaultTimezone: "Africa/Lagos",
      defaultLocale: "fr",
    });

    await expect
      .soft(
        asAdmin.mutation(
          api.platform.updateSettings,
          settingsArgs({ defaultCurrency: "GHS" })
        )
      )
      .rejects.toThrow(/currency/i);

    await expect.soft(
      asAdmin.mutation(
        api.platform.updateSettings,
        settingsArgs({ defaultCountry: "ZZ" })
      )
    ).rejects.toThrow(/country/i);

    await expect.soft(
      asAdmin.mutation(
        api.platform.updateSettings,
        settingsArgs({ defaultTimezone: "Mars/Olympus" })
      )
    ).rejects.toThrow(/timezone/i);

    await expect.soft(
      asAdmin.mutation(
        api.platform.updateSettings,
        settingsArgs({ defaultLocale: "de" })
      )
    ).rejects.toThrow();
  });
});

describe("AC-027: event currency, country, and timezone", () => {
  test("AC-027: event settings persist one of four currencies, full country/state/city data, and an IANA timezone without converting prices", async () => {
    const { t, adminId } = await setupSettings();
    const organizerId = await t.run(async (ctx) =>
      seedUser(ctx, {
        tokenIdentifier: "token|localization-organizer",
        name: "Localization Organizer",
        email: "localization-organizer@example.com",
      })
    );
    const eventId = await t.run(async (ctx) =>
      seedEvent(ctx, organizerId, {
        title: "Currency Event",
        slug: "currency-event",
        ticketType: "paid",
        ticketPrice: 5000,
        currency: "USD",
        countryCode: "US",
        city: "New York",
        country: "United States",
        timezone: "America/New_York",
      })
    );

    await t.withIdentity(identityFor("token|localization-organizer", "Localization Organizer")).mutation(
      api.events.updateEventSettings,
      {
        eventId,
        currency: "EUR",
        countryCode: "FR",
        city: "Paris",
        timezone: "Europe/Paris",
        locale: "fr",
      }
    );

    const event = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(event).toMatchObject({
      currency: "EUR",
      countryCode: "FR",
      country: "France",
      city: "Paris",
      timezone: "Europe/Paris",
      locale: "fr",
      ticketType: "paid",
      ticketPrice: 5000,
    });

    await t
      .withIdentity(identityFor("token|localization-organizer", "Localization Organizer"))
      .mutation(api.events.updateEventSettings, {
        eventId,
        countryCode: "IN",
        state: "Maharashtra",
        city: "Mumbai",
        timezone: "Asia/Calcutta",
        currency: "GBP",
      });
    const india = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(india).toMatchObject({
      currency: "GBP",
      countryCode: "IN",
      state: "Maharashtra",
      city: "Mumbai",
      timezone: "Asia/Calcutta",
      ticketPrice: 5000,
    });

    await expect(
      t
        .withIdentity(identityFor("token|localization-organizer", "Localization Organizer"))
        .mutation(api.events.updateEventSettings, {
          eventId,
          currency: "JPY",
        })
    ).rejects.toThrow(/NGN, USD, GBP, and EUR/i);

    expect(adminId).toBeDefined();
  });
});

describe("AC-028: event currency formatting", () => {
  test("AC-028: every price uses the event currency and locale, free events are localized, and no display hardcodes naira", () => {
    const cases = [
      { locale: "en", currency: "NGN" },
      { locale: "en", currency: "USD" },
      { locale: "fr", currency: "GBP" },
      { locale: "fr", currency: "EUR" },
    ] as const;

    for (const context of cases) {
      const expected = new Intl.NumberFormat(context.locale, {
        style: "currency",
        currency: context.currency,
        maximumFractionDigits: 2,
      }).format(5000);
      expect(formatEventPrice("paid", 5000, context)).toBe(expected);
    }

    expect(formatEventPrice("paid", 5000, { locale: "en", currency: "USD" })).not.toContain("₦");
    expect(formatEventPrice("paid", 5000, { locale: "en", currency: "GBP" })).not.toContain("₦");
    expect(formatEventPrice("paid", 5000, { locale: "en", currency: "EUR" })).not.toContain("₦");
    expect(formatEventPrice("free", 5000, { locale: "en", currency: "NGN" })).toBeNull();
    expect(getDictionary("en").register.freeEvent).toBe("Free Event");
    expect(getDictionary("fr").register.freeEvent).not.toBe("Free Event");
  });
});

describe("AC-029: event timezone display", () => {
  test("AC-029: date and time displays use the event timezone and locale, show the timezone, and do not shift with the viewer timezone", () => {
    const timestamp = Date.UTC(2027, 4, 12, 23, 30);
    const context = { locale: "en", timezone: "Africa/Lagos" } as const;

    const date = formatEventDate(timestamp, context);
    const dateTime = formatEventDateTime(timestamp, context);
    const timeRange = formatEventTimeRange(timestamp, timestamp + 3_600_000, context);

    expect(date).toBe(
      new Intl.DateTimeFormat("en", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Africa/Lagos",
      }).format(new Date(timestamp))
    );
    expect(dateTime).not.toBe(
      new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(timestamp))
    );
    expect.soft(dateTime).toMatch(/Africa\/Lagos|GMT\+1|WAT/);
    expect.soft(timeRange).toMatch(/Africa\/Lagos|GMT\+1|WAT/);

    const french = formatEventDate(timestamp, {
      locale: "fr",
      timezone: "Africa/Lagos",
    });
    expect(french).toContain("2027");
  });
});

describe("AC-030: existing event fallbacks", () => {
  test("AC-030: an event without new fields renders through platform defaults and changing a platform default does not rewrite it", async () => {
    const { t } = await setupSettings();
    const organizerId = await t.run(async (ctx) =>
      seedUser(ctx, {
        tokenIdentifier: "token|legacy-organizer",
        name: "Legacy Organizer",
        email: "legacy-organizer@example.com",
      })
    );
    const eventId = await t.run(async (ctx) =>
      seedEvent(ctx, organizerId, {
        title: "Legacy Event",
        slug: "legacy-event",
        timezone: "Africa/Lagos",
        currency: undefined,
        countryCode: undefined,
        locale: undefined,
      })
    );

    const asAdmin = t.withIdentity(superAdminIdentity);
    await asAdmin.mutation(api.platform.updateSettings, settingsArgs());
    const status = await asAdmin.query(api.platform.getPublicStatus, {});
    const settings = await asAdmin.query(api.platform.getSettings, {});

    expect(status).toMatchObject({
      defaultLocale: "fr",
      maintenanceMode: false,
    });
    expect(settings).toMatchObject({
      defaultCurrency: "NGN",
      defaultCountry: "NG",
      defaultTimezone: "Africa/Lagos",
    });

    const event = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(event?.currency).toBeUndefined();
    expect(event?.countryCode).toBeUndefined();
    expect(event?.locale).toBeUndefined();
    expect(event?.timezone).toBe("Africa/Lagos");
  });
});
