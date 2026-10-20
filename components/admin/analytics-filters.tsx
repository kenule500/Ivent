"use client";

import * as React from "react";
import { CalendarDays, Check, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  activeFilterChips,
  filtersForPreset,
  RANGE_PRESETS,
  presetForFilters,
  removeFilterValue,
  type AnalyticsFilters,
  type RangePreset,
} from "@/lib/analytics-filters";
import { DEFAULT_CURRENCY, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Analytics filter bar (FR-011 to FR-013, T3.1/T3.2).
 * URL state lives in the page; this component only reports intended changes.
 */

export interface FilterOptions {
  categories: string[];
  countries: string[];
  cities: string[];
  organizers: { id: string; label: string }[];
}

interface FilterBarProps {
  filters: AnalyticsFilters;
  options?: FilterOptions;
  compare: boolean;
  error?: string | null;
  onChange: (next: AnalyticsFilters) => void;
  onCompareChange: (next: boolean) => void;
  onClearAll: () => void;
}

function toggleValue<T extends string>(current: T[] | undefined, value: T) {
  const list = current ?? [];
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

interface MultiSelectProps {
  label: string;
  values: string[];
  selected: string[] | undefined;
  onChange: (next: string[] | undefined) => void;
}

function MultiSelect({ label, values, selected, onChange }: MultiSelectProps) {
  const chosen = selected ?? [];

  if (values.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs",
          chosen.length > 0 ? "border-primary/40 text-foreground" : "text-muted-foreground"
        )}
      >
        <Filter className="size-3.5" aria-hidden="true" />
        {label}
        {chosen.length > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.65rem] text-primary">
            {chosen.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-56 overflow-y-auto p-2">
        <div className="space-y-1">
          {values.map((value) => {
            const checked = chosen.includes(value);
            return (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted"
              >
                <input
                  type="checkbox"
                  className="size-3.5 accent-primary"
                  checked={checked}
                  onChange={() => {
                    const next = toggleValue(chosen, value);
                    onChange(next.length > 0 ? next : undefined);
                  }}
                />
                <span className="truncate">{value}</span>
                {checked && <Check className="ml-auto size-3" aria-hidden="true" />}
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AnalyticsFilterBar({
  filters,
  options,
  compare,
  error,
  onChange,
  onCompareChange,
  onClearAll,
}: FilterBarProps) {
  const activePreset = presetForFilters(filters);
  const chips = activeFilterChips(filters);
  const organizerName = (id: string) =>
    options?.organizers.find((organizer) => organizer.id === id)?.label ?? "Organizer";

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Date range presets"
        >
          {RANGE_PRESETS.map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant={activePreset === preset ? "default" : "outline"}
              onClick={() => onChange(filtersForPreset(preset))}
            >
              {preset}d
            </Button>
          ))}
        </div>

        <Popover>
          <PopoverTrigger className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatDate(filters.start, {
              currency: DEFAULT_CURRENCY,
              timezone: filters.timezone || "UTC",
            })}{" "}
            –{" "}
            {formatDate(filters.end, {
              currency: DEFAULT_CURRENCY,
              timezone: filters.timezone || "UTC",
            })}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={new Date(filters.start)}
              selected={{ from: new Date(filters.start), to: new Date(filters.end) }}
              onSelect={(range) => {
                if (!range?.from || !range.to) return;
                const start = new Date(range.from);
                start.setHours(0, 0, 0, 0);
                const end = new Date(range.to);
                end.setHours(23, 59, 59, 999);
                onChange({ ...filters, start: start.getTime(), end: end.getTime() });
              }}
            />
          </PopoverContent>
        </Popover>

        <MultiSelect
          label="Category"
          values={options?.categories ?? []}
          selected={filters.categories}
          onChange={(categories) => onChange({ ...filters, categories })}
        />
        <MultiSelect
          label="Country"
          values={options?.countries ?? []}
          selected={filters.countries}
          onChange={(countries) => onChange({ ...filters, countries })}
        />
        <MultiSelect
          label="City"
          values={options?.cities ?? []}
          selected={filters.cities}
          onChange={(cities) => onChange({ ...filters, cities })}
        />
        <MultiSelect
          label="Ticket"
          values={["free", "paid"]}
          selected={filters.ticketTypes}
          onChange={(ticketTypes) =>
            onChange({
              ...filters,
              ticketTypes: ticketTypes as AnalyticsFilters["ticketTypes"],
            })
          }
        />

        {(options?.organizers.length ?? 0) > 0 && (
          <Select
            value={filters.organizerId ?? "all"}
            onValueChange={(value) =>
              onChange({
                ...filters,
                organizerId: !value || value === "all" ? undefined : value,
              })
            }
          >
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Organizer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organizers</SelectItem>
              {options?.organizers.map((organizer) => (
                <SelectItem key={organizer.id} value={organizer.id}>
                  {organizer.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={filters.registrationStatus ?? "all"}
          onValueChange={(value) =>
            onChange({
              ...filters,
              registrationStatus:
                value === "confirmed" || value === "cancelled" ? value : undefined,
            })
          }
        >
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.checkIn ?? "all"}
          onValueChange={(value) =>
            onChange({
              ...filters,
              checkIn:
                value === "checked_in" || value === "not_checked_in" ? value : undefined,
            })
          }
        >
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Check-in" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any check-in</SelectItem>
            <SelectItem value="checked_in">Checked in</SelectItem>
            <SelectItem value="not_checked_in">Not checked in</SelectItem>
          </SelectContent>
        </Select>

        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={compare} onCheckedChange={onCompareChange} />
          Compare to previous period
        </label>
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {(chips.length > 0 || filters.organizerId) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <Badge key={`${chip.key}-${chip.value}`} variant="secondary" className="gap-1">
              {chip.label}:{" "}
              {chip.key === "organizerId" ? organizerName(chip.value) : chip.value}
              <button
                type="button"
                aria-label={`Remove ${chip.label} ${chip.value} filter`}
                onClick={() => onChange(removeFilterValue(filters, chip.key, chip.value))}
                className="rounded-full p-0.5 hover:bg-background/60"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
