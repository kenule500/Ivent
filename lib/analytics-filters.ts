/**
 * Client-side analytics filter model (FR-011, FR-012, FR-013).
 *
 * This module is the single source of truth for the filter shape shared with
 * `convex/analyticsFilters.ts`. It stays dependency-free so both the page and
 * the export button can use it.
 */

export type TicketType = "free" | "paid";
export type RegistrationStatus = "confirmed" | "cancelled";
export type CheckInState = "checked_in" | "not_checked_in";

export interface AnalyticsFilters {
  /** Inclusive start of the window, epoch milliseconds. */
  start: number;
  /** Inclusive end of the window, epoch milliseconds. */
  end: number;
  categories?: string[];
  countries?: string[];
  cities?: string[];
  ticketTypes?: TicketType[];
  organizerId?: string;
  registrationStatus?: RegistrationStatus;
  checkIn?: CheckInState;
  timezone?: string;
}

export type RangePreset = 7 | 30 | 90 | 365;

export const RANGE_PRESETS: readonly RangePreset[] = [7, 30, 90, 365];
export const DEFAULT_PRESET: RangePreset = 30;
export const MAX_RANGE_DAYS = 730;

const DAY_MS = 24 * 60 * 60 * 1000;

export function defaultFilters(now = Date.now()): AnalyticsFilters {
  return { start: now - DEFAULT_PRESET * DAY_MS, end: now };
}

export function filtersForPreset(preset: RangePreset, now = Date.now()): AnalyticsFilters {
  return { start: now - preset * DAY_MS, end: now };
}

export interface RangeValidation {
  ok: boolean;
  message?: string;
}

/** Reject inverted or over-long ranges before they reach the server (AC-010). */
export function validateRange(start: number, end: number): RangeValidation {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { ok: false, message: "Choose a valid start and end date." };
  }
  if (start > end) {
    return { ok: false, message: "The start date must be on or before the end date." };
  }
  const days = (end - start) / DAY_MS;
  if (days > MAX_RANGE_DAYS) {
    return {
      ok: false,
      message: `Ranges are limited to ${MAX_RANGE_DAYS} days. Narrow the window.`,
    };
  }
  return { ok: true };
}

/** Detect which preset a range matches, or null for a custom range. */
export function presetForFilters(filters: AnalyticsFilters, now = Date.now()): RangePreset | null {
  for (const preset of RANGE_PRESETS) {
    const candidate = filtersForPreset(preset, now);
    // Allow a little clock drift between renders.
    if (Math.abs(candidate.start - filters.start) < 60_000) return preset;
  }
  return null;
}

export interface ActiveFilterChip {
  key: keyof AnalyticsFilters;
  label: string;
  value: string;
}

const CHIP_LABELS: Partial<Record<keyof AnalyticsFilters, string>> = {
  categories: "Category",
  countries: "Country",
  cities: "City",
  ticketTypes: "Ticket",
  organizerId: "Organizer",
  registrationStatus: "Status",
  checkIn: "Check-in",
};

/** Active dimension filters as removable chips (AC-009). */
export function activeFilterChips(filters: AnalyticsFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const key of Object.keys(CHIP_LABELS) as (keyof AnalyticsFilters)[]) {
    const value = filters[key];
    const label = CHIP_LABELS[key];
    if (!label || value === undefined) continue;

    if (Array.isArray(value)) {
      for (const entry of value) {
        chips.push({ key, label, value: String(entry) });
      }
    } else {
      chips.push({ key, label, value: String(value) });
    }
  }

  return chips;
}

/** Remove one chip value without discarding the rest of the filter set. */
export function removeFilterValue(
  filters: AnalyticsFilters,
  key: keyof AnalyticsFilters,
  value: string
): AnalyticsFilters {
  const next: AnalyticsFilters = { ...filters };
  const current = next[key];

  if (Array.isArray(current)) {
    const remaining = (current as unknown[]).filter((entry) => String(entry) !== value);
    if (remaining.length === 0) {
      delete (next as unknown as Record<string, unknown>)[key];
    } else {
      // The array members are all strings or literals, so this stays type-safe.
      (next as unknown as Record<string, unknown>)[key] = remaining;
    }
    return next;
  }

  delete (next as unknown as Record<string, unknown>)[key];
  return next;
}

export function clearDimensionFilters(filters: AnalyticsFilters): AnalyticsFilters {
  return { start: filters.start, end: filters.end, timezone: filters.timezone };
}

function toIsoDate(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function fromIsoDate(value: string) {
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Serialize filters into URL search params so reload and history keep them (FR-012). */
export function filtersToSearchParams(
  filters: AnalyticsFilters,
  options?: { compare?: boolean }
): URLSearchParams {
  const params = new URLSearchParams();
  const preset = presetForFilters(filters);

  if (preset) {
    params.set("range", String(preset));
  } else {
    params.set("start", toIsoDate(filters.start));
    params.set("end", toIsoDate(filters.end));
  }

  if (filters.categories?.length) params.set("categories", filters.categories.join(","));
  if (filters.countries?.length) params.set("countries", filters.countries.join(","));
  if (filters.cities?.length) params.set("cities", filters.cities.join(","));
  if (filters.ticketTypes?.length) params.set("ticketTypes", filters.ticketTypes.join(","));
  if (filters.organizerId) params.set("organizerId", filters.organizerId);
  if (filters.registrationStatus) params.set("registrationStatus", filters.registrationStatus);
  if (filters.checkIn) params.set("checkIn", filters.checkIn);
  if (options?.compare) params.set("compare", "1");

  return params;
}

function splitList(value: string | null) {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function asTicketTypes(value: string | null): TicketType[] | undefined {
  const parts = splitList(value);
  if (!parts) return undefined;
  const allowed = parts.filter((entry): entry is TicketType => entry === "free" || entry === "paid");
  return allowed.length ? allowed : undefined;
}

export interface ParsedFilterState {
  filters: AnalyticsFilters;
  compare: boolean;
  /** True when the URL contained an invalid range and was replaced. */
  invalid: boolean;
  message?: string;
}

/** Parse URL state, falling back to the default window when it is invalid. */
export function parseFilterSearchParams(
  input: URLSearchParams,
  now = Date.now()
): ParsedFilterState {
  const presetParam = Number(input.get("range"));
  let filters: AnalyticsFilters;

  if (RANGE_PRESETS.includes(presetParam as RangePreset)) {
    filters = filtersForPreset(presetParam as RangePreset, now);
  } else {
    const startIso = input.get("start");
    const endIso = input.get("end");
    if (startIso && endIso) {
      const start = fromIsoDate(startIso);
      const end = fromIsoDate(endIso);
      if (start !== null && end !== null) {
        // Include the whole end day.
        filters = { start, end: end + DAY_MS - 1 };
      } else {
        return { filters: defaultFilters(now), compare: false, invalid: true };
      }
    } else {
      filters = defaultFilters(now);
    }
  }

  filters.categories = splitList(input.get("categories"));
  filters.countries = splitList(input.get("countries"));
  filters.cities = splitList(input.get("cities"));
  filters.ticketTypes = asTicketTypes(input.get("ticketTypes"));

  const organizerId = input.get("organizerId");
  if (organizerId) filters.organizerId = organizerId;

  const status = input.get("registrationStatus");
  if (status === "confirmed" || status === "cancelled") filters.registrationStatus = status;

  const checkIn = input.get("checkIn");
  if (checkIn === "checked_in" || checkIn === "not_checked_in") filters.checkIn = checkIn;

  const validation = validateRange(filters.start, filters.end);
  if (!validation.ok) {
    return { filters: defaultFilters(now), compare: false, invalid: true, message: validation.message };
  }

  return { filters, compare: input.get("compare") === "1", invalid: false };
}
