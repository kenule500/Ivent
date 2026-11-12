"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SponsorEditor, type SponsorDraft } from "./sponsor-editor";
import { QuestionBuilder, type QuestionDraft } from "./question-builder";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;

type EventDoc = Doc<"events">;

function fallbackTimezones() {
  return [
    "UTC",
    "Africa/Lagos",
    "Europe/London",
    "Europe/Paris",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Dubai",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Sydney",
  ];
}

/**
 * Focused event settings (BP-003, BP-004, BP-014).
 *
 * This panel only writes the additive fields introduced by this feature. Event
 * title, dates, and ticket editing stay with the general edit flow (BP-009).
 */
export function EventSettingsPanel({ event }: { event: EventDoc }) {
  const { t } = useI18n();
  const updateSettings = useMutation(api.events.updateEventSettings);

  const [currency, setCurrency] = useState(event.currency ?? "USD");
  const [countryCode, setCountryCode] = useState(event.countryCode ?? "");
  const [stateName, setStateName] = useState(event.state ?? "");
  const [city, setCity] = useState(event.city ?? "");
  const [timezone, setTimezone] = useState(event.timezone || "UTC");
  const [locale, setLocale] = useState<"en" | "fr">(event.locale ?? "en");
  const [walletEnabled, setWalletEnabled] = useState(
    event.walletEnabled !== false
  );
  const [doorModeEnabled, setDoorModeEnabled] = useState(
    event.doorModeEnabled !== false
  );
  const [sponsors, setSponsors] = useState<SponsorDraft[]>(
    event.sponsors ?? []
  );
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    event.registrationQuestions ?? []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [geo, setGeo] = useState<typeof import("country-state-city") | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    import("country-state-city")
      .then((module) => {
        if (!cancelled) setGeo(module);
      })
      .catch(() => setGeo(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const countries = useMemo(
    () =>
      geo
        ? geo.Country.getAllCountries().map((country) => ({
            code: country.isoCode,
            name: country.name,
          }))
        : [],
    [geo]
  );

  const states = useMemo(
    () =>
      geo && countryCode
        ? geo.State.getStatesOfCountry(countryCode).map((state) => ({
            code: state.isoCode,
            name: state.name,
          }))
        : [],
    [geo, countryCode]
  );

  const cities = useMemo(() => {
    if (!geo || !countryCode) return [] as Array<{ name: string }>;
    const match = states.find(
      (state) =>
        state.name.toLocaleLowerCase() === stateName.toLocaleLowerCase() ||
        state.code.toUpperCase() === stateName.toUpperCase()
    );
    if (match) return geo.City.getCitiesOfState(countryCode, match.code);
    return geo.City.getCitiesOfCountry(countryCode) ?? [];
  }, [geo, countryCode, states, stateName]);

  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return fallbackTimezones();
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        eventId: event._id,
        currency,
        countryCode: countryCode || undefined,
        state: stateName,
        city,
        timezone,
        locale,
        walletEnabled,
        doorModeEnabled,
        sponsors: sponsors.map((sponsor, index) => ({
          id: sponsor.id,
          name: sponsor.name.trim(),
          logoStorageId: sponsor.logoStorageId,
          websiteUrl: sponsor.websiteUrl || undefined,
          order: index,
        })),
        registrationQuestions: questions.map((question) => {
          const original = event.registrationQuestions?.find(
            (item) => item.id === question.id
          );
          const changed =
            !original ||
            original.label !== question.label ||
            original.type !== question.type ||
            original.required !== question.required ||
            (original.helpText ?? "") !== (question.helpText ?? "") ||
            original.archived !== question.archived ||
            JSON.stringify(original.options ?? []) !==
              JSON.stringify(question.options ?? []);
          return {
            id: question.id,
            label: question.label,
            type: question.type,
            required: question.required,
            helpText: question.helpText || undefined,
            options: question.options,
            archived: question.archived,
            version: changed
              ? (original?.version ?? question.version ?? 1) + 1
              : question.version ?? 1,
          };
        }),
      });
      toast.success(t("settings.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.title")}</CardTitle>
        <CardDescription>{t("settings.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="settings-currency">{t("settings.currency")}</Label>
            <Select
              value={currency}
              onValueChange={(value) => setCurrency(value ?? "USD")}
            >
              <SelectTrigger id="settings-currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-country">{t("settings.country")}</Label>
            <Select
              value={countryCode || undefined}
              onValueChange={(value) => {
                const nextCountry = value ?? "";
                setCountryCode(nextCountry);
                setStateName("");
                setCity("");
              }}
            >
              <SelectTrigger id="settings-country" className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-state">{t("settings.state")}</Label>
            {states.length > 0 ? (
              <Select
                value={stateName || undefined}
                onValueChange={(value) => {
                  const nextState = value ?? "";
                  setStateName(nextState);
                  setCity("");
                }}
              >
                <SelectTrigger id="settings-state" className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {states.map((state) => (
                    <SelectItem key={state.code} value={state.name}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="settings-state"
                value={stateName}
                disabled={!countryCode}
                onChange={(event) => {
                  setStateName(event.target.value);
                  setCity("");
                }}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-city">{t("settings.city")}</Label>
            {cities.length > 0 ? (
              <Select
                value={city || undefined}
                onValueChange={(value) => setCity(value ?? "")}
              >
                <SelectTrigger id="settings-city" className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {cities.map((option) => (
                    <SelectItem key={option.name} value={option.name}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="settings-city"
                value={city}
                disabled={!countryCode}
                onChange={(event) => setCity(event.target.value)}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-timezone">{t("settings.timezone")}</Label>
            <Select
              value={timezone}
              onValueChange={(value) => setTimezone(value ?? "UTC")}
            >
              <SelectTrigger id="settings-timezone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {timezones.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-locale">{t("settings.locale")}</Label>
            <Select
              value={locale}
              onValueChange={(value) => setLocale(value === "fr" ? "fr" : "en")}
            >
              <SelectTrigger id="settings-locale" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t("settings.walletEnabled")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settings.walletHint")}
              </p>
            </div>
            <Switch
              checked={walletEnabled}
              onCheckedChange={setWalletEnabled}
              aria-label={t("settings.walletEnabled")}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t("settings.doorEnabled")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settings.doorHint")}
              </p>
            </div>
            <Switch
              checked={doorModeEnabled}
              onCheckedChange={setDoorModeEnabled}
              aria-label={t("settings.doorEnabled")}
            />
          </div>
        </div>

        <SponsorEditor sponsors={sponsors} onChange={setSponsors} />
        <QuestionBuilder questions={questions} onChange={setQuestions} />

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{currency}</Badge>
            <Badge variant="secondary">{timezone}</Badge>
            <Badge variant="secondary">{locale.toUpperCase()}</Badge>
          </div>
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
