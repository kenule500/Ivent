import { describe, expect, test } from "vitest";
import {
  MAX_RANGE_DAYS,
  activeFilterChips,
  clearDimensionFilters,
  defaultFilters,
  filtersForPreset,
  filtersToSearchParams,
  parseFilterSearchParams,
  presetForFilters,
  removeFilterValue,
  validateRange,
  type AnalyticsFilters,
} from "../../lib/analytics-filters";

const DAY = 24 * 60 * 60 * 1000;

describe("analytics filter model", () => {
  test("AC-008: presets and custom ranges round-trip through the URL", () => {
    const now = Date.now();

    for (const preset of [7, 30, 90, 365] as const) {
      const filters = filtersForPreset(preset, now);
      expect(filters.end - filters.start).toBe(preset * DAY);
      expect(presetForFilters(filters, now)).toBe(preset);

      const params = filtersToSearchParams(filters);
      expect(params.get("range")).toBe(String(preset));
      expect(params.get("start")).toBeNull();
      expect(params.get("end")).toBeNull();

      const parsed = parseFilterSearchParams(params, now);
      expect(parsed.invalid).toBe(false);
      expect(parsed.filters.end - parsed.filters.start).toBe(preset * DAY);
    }

    const custom: AnalyticsFilters = {
      start: Date.UTC(2026, 0, 5),
      end: Date.UTC(2026, 0, 20),
    };
    const customParams = filtersToSearchParams(custom);
    expect(customParams.get("range")).toBeNull();
    expect(customParams.get("start")).toBe("2026-01-05");
    expect(customParams.get("end")).toBe("2026-01-20");

    const reparsed = parseFilterSearchParams(customParams);
    expect(reparsed.invalid).toBe(false);
    expect(reparsed.filters.start).toBe(custom.start);
    // A selected end day is inclusive, so the parsed window covers all of it.
    expect(reparsed.filters.end).toBe(custom.end + DAY - 1);
  });

  test("AC-009: combined filters become removable chips and Clear all keeps the range", () => {
    const now = Date.now();
    const filters: AnalyticsFilters = {
      start: now - 30 * DAY,
      end: now,
      categories: ["tech", "music"],
      countries: ["Nigeria"],
      cities: ["Lagos"],
      ticketTypes: ["paid"],
      organizerId: "user_123",
      registrationStatus: "confirmed",
      checkIn: "checked_in",
    };

    const chips = activeFilterChips(filters);
    expect(chips).toHaveLength(8);
    expect(chips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "categories", label: "Category", value: "tech" }),
        expect.objectContaining({ key: "categories", label: "Category", value: "music" }),
        expect.objectContaining({ key: "countries", label: "Country", value: "Nigeria" }),
        expect.objectContaining({ key: "cities", label: "City", value: "Lagos" }),
        expect.objectContaining({ key: "ticketTypes", label: "Ticket", value: "paid" }),
        expect.objectContaining({ key: "organizerId", label: "Organizer", value: "user_123" }),
        expect.objectContaining({ key: "registrationStatus", label: "Status", value: "confirmed" }),
        expect.objectContaining({ key: "checkIn", label: "Check-in", value: "checked_in" }),
      ])
    );

    const withoutTech = removeFilterValue(filters, "categories", "tech");
    expect(withoutTech.categories).toEqual(["music"]);
    expect(withoutTech.countries).toEqual(["Nigeria"]);

    const withoutStatus = removeFilterValue(withoutTech, "registrationStatus", "confirmed");
    expect(withoutStatus.registrationStatus).toBeUndefined();
    expect(withoutStatus.cities).toEqual(["Lagos"]);

    const cleared = clearDimensionFilters(filters);
    expect(cleared).toEqual({ start: filters.start, end: filters.end, timezone: undefined });

    const params = filtersToSearchParams(filters);
    expect(params.get("categories")).toBe("tech,music");
    const parsed = parseFilterSearchParams(params);
    expect(parsed.filters).toMatchObject({
      categories: ["tech", "music"],
      countries: ["Nigeria"],
      cities: ["Lagos"],
      ticketTypes: ["paid"],
      organizerId: "user_123",
      registrationStatus: "confirmed",
      checkIn: "checked_in",
    });
  });

  test("AC-010: inverted and over-long custom ranges are rejected with an inline message and keep the last valid range", () => {
    const now = Date.now();

    expect(validateRange(now, now - DAY)).toMatchObject({
      ok: false,
      message: "The start date must be on or before the end date.",
    });
    expect(validateRange(now - (MAX_RANGE_DAYS + 1) * DAY, now)).toMatchObject({
      ok: false,
      message: `Ranges are limited to ${MAX_RANGE_DAYS} days. Narrow the window.`,
    });
    expect(validateRange(now - DAY, now)).toEqual({ ok: true });

    const inverted = new URLSearchParams({
      start: "2026-02-01",
      end: "2026-01-01",
    });
    const parsedInverted = parseFilterSearchParams(inverted, now);
    expect(parsedInverted.invalid).toBe(true);
    expect(parsedInverted.message).toMatch(/start date must be on or before the end date/i);
    expect(parsedInverted.filters).toEqual(defaultFilters(now));

    const tooLong = new URLSearchParams({
      start: "2020-01-01",
      end: "2024-01-01",
    });
    const parsedTooLong = parseFilterSearchParams(tooLong, now);
    expect(parsedTooLong.invalid).toBe(true);
    expect(parsedTooLong.message).toMatch(/limited to 730 days/i);
    expect(parsedTooLong.filters).toEqual(defaultFilters(now));
  });

  test("AC-012: the comparison toggle is absent by default and preserved when enabled", () => {
    const filters = filtersForPreset(30);

    const withoutComparison = filtersToSearchParams(filters);
    expect(withoutComparison.get("compare")).toBeNull();
    expect(parseFilterSearchParams(withoutComparison).compare).toBe(false);

    const withComparison = filtersToSearchParams(filters, { compare: true });
    expect(withComparison.get("compare")).toBe("1");

    // Reload/back-forward reconstructs the same session toggle from the URL.
    expect(parseFilterSearchParams(withComparison).compare).toBe(true);
  });
});
