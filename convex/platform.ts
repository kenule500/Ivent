import { v } from "convex/values";
import { Country } from "country-state-city";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireSuperAdmin } from "./helpers";
import { logAdminAction } from "./audit";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  MAINTENANCE_CONFIRMATION,
  MAX_MAINTENANCE_MESSAGE,
  featureFlagsValidator,
  readSettings,
  supportedCurrencies,
  supportedTimezones,
  withDefaults,
} from "./platformData";

/**
 * Platform settings singleton (FR-023 to FR-026, NFR-002).
 * Currency, country, timezone, feature flags, and maintenance mode live in one
 * document. Writes are super-admin only and always audited.
 */

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return withDefaults(await readSettings(ctx));
  },
});

/** Public, minimal status used by the render gate. Never includes flags or actor ids. */
export const getPublicStatus = query({
  args: {},
  handler: async (ctx) => {
    const doc = await readSettings(ctx);
    return {
      maintenanceMode: doc?.maintenanceMode ?? false,
      maintenanceMessage: doc?.maintenanceMessage ?? DEFAULT_MAINTENANCE_MESSAGE,
    };
  },
});

/** Select options for the platform form, kept server-side to avoid a huge client bundle. */
export const getOptions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return {
      countries: Country.getAllCountries()
        .map((country) => ({
          code: country.isoCode,
          name: country.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      currencies: supportedCurrencies(),
      timezones: supportedTimezones(),
      maintenanceConfirmation: MAINTENANCE_CONFIRMATION,
    };
  },
});

export const updateSettings = mutation({
  args: {
    defaultCountry: v.string(),
    defaultCurrency: v.string(),
    defaultTimezone: v.string(),
    maintenanceMode: v.boolean(),
    maintenanceMessage: v.optional(v.string()),
    featureFlags: featureFlagsValidator,
    confirmation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);

    const country = args.defaultCountry.trim().toUpperCase();
    const isValidCountry = Country.getAllCountries().some(
      (entry) => entry.isoCode.toUpperCase() === country
    );
    if (!isValidCountry) {
      throw new Error("Choose a valid ISO country code.");
    }

    const currency = args.defaultCurrency.trim().toUpperCase();
    if (!supportedCurrencies().includes(currency)) {
      throw new Error("Choose a valid ISO 4217 currency code.");
    }

    const timezone = args.defaultTimezone.trim();
    if (!supportedTimezones().includes(timezone)) {
      throw new Error("Choose a valid IANA timezone.");
    }

    const message = (args.maintenanceMessage ?? "").trim();
    if (message.length > MAX_MAINTENANCE_MESSAGE) {
      throw new Error(
        `The maintenance message must be ${MAX_MAINTENANCE_MESSAGE} characters or fewer.`
      );
    }

    const existing = await readSettings(ctx);
    const before = withDefaults(existing);

    if (args.maintenanceMode && !before.maintenanceMode) {
      if (args.confirmation !== MAINTENANCE_CONFIRMATION) {
        throw new Error(
          `Type "${MAINTENANCE_CONFIRMATION}" to turn on maintenance mode.`
        );
      }
    }

    const next = {
      defaultCountry: country,
      defaultCurrency: currency,
      defaultTimezone: timezone,
      maintenanceMode: args.maintenanceMode,
      maintenanceMessage: message || before.maintenanceMessage,
      featureFlags: args.featureFlags,
      updatedBy: admin._id,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert("platformSettings", { key: "global", ...next });
    }

    const changedKeys = (
      [
        "defaultCountry",
        "defaultCurrency",
        "defaultTimezone",
        "maintenanceMode",
        "maintenanceMessage",
        "featureFlags",
      ] as const
    ).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(next[key]));

    const diff = Object.fromEntries(
      changedKeys.map((key) => [key, { before: before[key], after: next[key] }])
    );

    await logAdminAction(
      ctx,
      admin,
      "settings.updated",
      "settings",
      "global",
      "Platform settings",
      { changes: diff }
    );

    if (before.maintenanceMode !== next.maintenanceMode) {
      await logAdminAction(
        ctx,
        admin,
        "maintenance.changed",
        "settings",
        "global",
        `Maintenance mode ${next.maintenanceMode ? "enabled" : "disabled"}`,
        { before: before.maintenanceMode, after: next.maintenanceMode }
      );
    }

    return {
      exists: true,
      defaultCountry: next.defaultCountry,
      defaultCurrency: next.defaultCurrency,
      defaultTimezone: next.defaultTimezone,
      maintenanceMode: next.maintenanceMode,
      maintenanceMessage: next.maintenanceMessage,
      featureFlags: next.featureFlags,
      updatedAt: next.updatedAt,
      updatedBy: next.updatedBy,
    };
  },
});
