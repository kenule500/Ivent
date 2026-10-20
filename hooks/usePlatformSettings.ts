"use client";

import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/useConvexQuery";

/**
 * Platform formatting defaults and feature flags (FR-023, FR-026, FR-041).
 *
 * Falls back to USD/UTC/US until the singleton exists, matching the schema
 * defaults. Only admin screens call this query.
 */

export const PLATFORM_FALLBACKS = {
  defaultCountry: "US",
  defaultCurrency: "USD",
  defaultTimezone: "UTC",
  featureFlags: {
    commandPalette: true,
    reports: true,
    broadcasts: true,
    feedbackInbox: true,
    systemHealth: true,
  },
} as const;

export function usePlatformSettings() {
  const { data, isLoading } = useConvexQuery(api.platform.getSettings, {});

  return {
    settings: data,
    isLoading,
    country: data?.defaultCountry ?? PLATFORM_FALLBACKS.defaultCountry,
    currency: data?.defaultCurrency ?? PLATFORM_FALLBACKS.defaultCurrency,
    timezone: data?.defaultTimezone ?? PLATFORM_FALLBACKS.defaultTimezone,
    featureFlags: data?.featureFlags ?? PLATFORM_FALLBACKS.featureFlags,
    maintenanceMode: data?.maintenanceMode ?? false,
  };
}
