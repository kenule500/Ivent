import { v } from "convex/values";
import { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Platform settings data and shared helpers (FR-023 to FR-026).
 *
 * Kept out of the Convex entry module so only functions are exported from
 * `platform.ts`, while validators and guards live here for reuse.
 */

export const DEFAULT_FEATURE_FLAGS = {
  commandPalette: true,
  reports: true,
  broadcasts: true,
  feedbackInbox: true,
  systemHealth: true,
} as const;

export type FeatureFlag = keyof typeof DEFAULT_FEATURE_FLAGS;

export const featureFlagsValidator = v.object({
  commandPalette: v.boolean(),
  reports: v.boolean(),
  broadcasts: v.boolean(),
  feedbackInbox: v.boolean(),
  systemHealth: v.boolean(),
});

export const MAINTENANCE_CONFIRMATION = "ENABLE MAINTENANCE";
export const ANNOUNCEMENT_CONFIRMATION = "SEND ANNOUNCEMENT";
export const MAX_MAINTENANCE_MESSAGE = 280;

export const DEFAULT_MAINTENANCE_MESSAGE =
  "We are performing scheduled maintenance. Please check back soon.";

export const FALLBACK_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "CAD",
  "AUD",
  "INR",
  "JPY",
  "BRL",
  "AED",
];

export const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function supportedCurrencies(): string[] {
  try {
    return Intl.supportedValuesOf("currency");
  } catch {
    return FALLBACK_CURRENCIES;
  }
}

export function supportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return FALLBACK_TIMEZONES;
  }
}

export interface PlatformSettingsView {
  exists: boolean;
  defaultCountry: string;
  defaultCurrency: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  featureFlags: {
    commandPalette: boolean;
    reports: boolean;
    broadcasts: boolean;
    feedbackInbox: boolean;
    systemHealth: boolean;
  };
  updatedAt: number | null;
  updatedBy: string | null;
}

export async function readSettings(ctx: QueryCtx | MutationCtx) {
  return ctx.db
    .query("platformSettings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
}

export function withDefaults(
  doc: Awaited<ReturnType<typeof readSettings>>
): PlatformSettingsView {
  return {
    exists: Boolean(doc),
    defaultCountry: doc?.defaultCountry ?? "US",
    defaultCurrency: doc?.defaultCurrency ?? "USD",
    defaultTimezone: doc?.defaultTimezone ?? "UTC",
    maintenanceMode: doc?.maintenanceMode ?? false,
    maintenanceMessage: doc?.maintenanceMessage ?? DEFAULT_MAINTENANCE_MESSAGE,
    featureFlags: doc?.featureFlags ?? { ...DEFAULT_FEATURE_FLAGS },
    updatedAt: doc?.updatedAt ?? null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

/** Throw a typed error when a flagged module is disabled (FR-026, AC-021). */
export async function assertFeatureEnabled(
  ctx: QueryCtx | MutationCtx,
  flag: FeatureFlag
) {
  const doc = await readSettings(ctx);
  const flags = doc?.featureFlags ?? DEFAULT_FEATURE_FLAGS;
  if (!flags[flag]) {
    throw new Error(`This module is not enabled (feature flag: ${flag}).`);
  }
}
