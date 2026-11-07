"use client";

import * as React from "react";
import { z } from "zod";
import { useMutation } from "convex/react";
import { Loader2, Lock, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { PageHeader } from "@/components/admin/page-header";
import { PanelState } from "@/components/admin/panel-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/format";

/**
 * Platform settings (FR-023 to FR-026, AC-021 to AC-023).
 * Non-super-admins get a read-only view; enabling maintenance mode requires a
 * typed phrase and is audited server-side.
 */

interface PlatformSettings {
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

interface PlatformOptions {
  countries: { code: string; name: string }[];
  currencies: string[];
  timezones: string[];
  maintenanceConfirmation: string;
}

const FLAG_LABELS: {
  key: keyof PlatformSettings["featureFlags"];
  label: string;
  description: string;
}[] = [
  {
    key: "commandPalette",
    label: "Command palette",
    description: "Ctrl/Cmd+K search across pages, users, events, and registrations.",
  },
  {
    key: "reports",
    label: "Reports hub",
    description: "Per-event attendance, check-in, capacity, and revenue reports.",
  },
  {
    key: "broadcasts",
    label: "Broadcast announcements",
    description: "Compose and send announcements to a resolved audience.",
  },
  {
    key: "feedbackInbox",
    label: "Feedback inbox",
    description: "Review and triage support, bug, and abuse reports.",
  },
  {
    key: "systemHealth",
    label: "System health",
    description: "Cron heartbeats, email failures, and rate-limit signals.",
  },
];

export default function PlatformSettingsPage() {
  const { data: settings, isLoading } = useConvexQuery(api.platform.getSettings, {});
  const { data: options } = useConvexQuery(api.platform.getOptions, {});
  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser, {});

  const isSuperAdmin = currentUser?.role === "super_admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform settings"
        description="Global defaults, module flags, and maintenance mode for every visitor."
        breadcrumb={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Platform" },
        ]}
      />

      <PanelState loading={isLoading || !settings || !options} skeletonRows={8}>
        {settings && options ? (
          isSuperAdmin ? (
            <PlatformForm
              key={`${settings.updatedAt ?? "new"}-${settings.defaultCurrency}`}
              settings={settings}
              options={options}
            />
          ) : (
            <ReadOnlyView settings={settings} />
          )
        ) : null}
      </PanelState>
    </div>
  );
}

function ReadOnlyView({ settings }: { settings: PlatformSettings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
          Read-only view
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Only a super admin can change platform settings.
        </p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Default country", value: settings.defaultCountry },
            { label: "Default currency", value: settings.defaultCurrency },
            { label: "Default timezone", value: settings.defaultTimezone },
            {
              label: "Maintenance mode",
              value: settings.maintenanceMode ? "On" : "Off",
            },
            ...FLAG_LABELS.map((flag) => ({
              label: flag.label,
              value: settings.featureFlags[flag.key] ? "Enabled" : "Disabled",
            })),
          ].map((row) => (
            <div key={row.label} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="text-sm font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

const formSchema = z
  .object({
    defaultCountry: z.string().min(2, "Choose a country."),
    defaultCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/, "Use a three-letter ISO currency code."),
    defaultTimezone: z.string().min(1, "Choose a timezone."),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z
      .string()
      .max(280, "Keep the maintenance message under 280 characters."),
    confirmation: z.string(),
    featureFlags: z.object({
      commandPalette: z.boolean(),
      reports: z.boolean(),
      broadcasts: z.boolean(),
      feedbackInbox: z.boolean(),
      systemHealth: z.boolean(),
    }),
  })
  .superRefine((value, ctx) => {
    if (
      value.maintenanceMode &&
      value.confirmation.trim().length > 0 &&
      value.confirmation.trim().length < 10
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmation"],
        message: "The confirmation phrase is not complete.",
      });
    }
  });

interface PlatformFormProps {
  settings: PlatformSettings;
  options: PlatformOptions;
}

function PlatformForm({ settings, options }: PlatformFormProps) {
  const updateSettings = useMutation(api.platform.updateSettings);

  const [country, setCountry] = React.useState(settings.defaultCountry);
  const [currency, setCurrency] = React.useState(settings.defaultCurrency);
  const [timezone, setTimezone] = React.useState(settings.defaultTimezone);
  const [maintenanceMode, setMaintenanceMode] = React.useState(
    settings.maintenanceMode
  );
  const [maintenanceMessage, setMaintenanceMessage] = React.useState(
    settings.maintenanceMessage
  );
  const [confirmation, setConfirmation] = React.useState("");
  const [featureFlags, setFeatureFlags] = React.useState(settings.featureFlags);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  const enablingMaintenance = maintenanceMode && !settings.maintenanceMode;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const parsed = formSchema.safeParse({
      defaultCountry: country,
      defaultCurrency: currency.toUpperCase(),
      defaultTimezone: timezone,
      maintenanceMode,
      maintenanceMessage,
      confirmation,
      featureFlags,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      toast.error("Check the highlighted fields.");
      return;
    }

    if (
      enablingMaintenance &&
      confirmation.trim() !== options.maintenanceConfirmation
    ) {
      setErrors({
        confirmation: `Type "${options.maintenanceConfirmation}" exactly to turn on maintenance mode.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        defaultCountry: parsed.data.defaultCountry,
        defaultCurrency: parsed.data.defaultCurrency,
        defaultTimezone: parsed.data.defaultTimezone,
        maintenanceMode: parsed.data.maintenanceMode,
        maintenanceMessage: parsed.data.maintenanceMessage,
        featureFlags: parsed.data.featureFlags,
        confirmation: parsed.data.confirmation,
      });
      toast.success("Platform settings saved.");
      setConfirmation("");
      setErrors({});
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save platform settings."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="text-xs text-destructive" role="alert">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Regional defaults</CardTitle>
          <p className="text-xs text-muted-foreground">
            Every formatter and report reads these values on the next render.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="country">Default country</Label>
            <Select value={country} onValueChange={(value) => setCountry(value ?? "US")}>
              <SelectTrigger id="country" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {options.countries.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("defaultCountry")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Default currency</Label>
            <Select
              value={currency}
              onValueChange={(value) => setCurrency(value ?? "USD")}
            >
              <SelectTrigger id="currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {options.currencies.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("defaultCurrency")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timezone">Default timezone</Label>
            <Select
              value={timezone}
              onValueChange={(value) => setTimezone(value ?? "UTC")}
            >
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {options.timezones.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("defaultTimezone")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Feature flags</CardTitle>
          <p className="text-xs text-muted-foreground">
            Disabling a module hides it from navigation and rejects its server calls.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {FLAG_LABELS.map((flag) => (
            <div
              key={flag.key}
              className="flex items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{flag.label}</p>
                <p className="text-xs text-muted-foreground">{flag.description}</p>
              </div>
              <Switch
                checked={featureFlags[flag.key]}
                onCheckedChange={(checked) =>
                  setFeatureFlags((current) => ({ ...current, [flag.key]: checked }))
                }
                aria-label={`${flag.label} enabled`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldAlert className="size-4 text-orange-500" aria-hidden="true" />
            Maintenance mode
            {maintenanceMode && <Badge variant="destructive">On</Badge>}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Non-admin visitors see this notice instead of public pages. Admins keep
            working. Signing in is not affected.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Enable maintenance mode</p>
              <p className="text-xs text-muted-foreground">
                {settings.maintenanceMode
                  ? "Currently on. Turn it off as soon as the work is done."
                  : "Currently off. Enabling requires the typed phrase."}
              </p>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
              aria-label="Maintenance mode enabled"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maintenance-message">Visitor message</Label>
            <Textarea
              id="maintenance-message"
              value={maintenanceMessage}
              onChange={(event) => setMaintenanceMessage(event.target.value)}
              rows={3}
              maxLength={280}
            />
            <p className="text-xs text-muted-foreground">
              {maintenanceMessage.length}/280 characters.
            </p>
            {fieldError("maintenanceMessage")}
          </div>

          {enablingMaintenance && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmation">
                Type {options.maintenanceConfirmation} to confirm
              </Label>
              <Input
                id="confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={options.maintenanceConfirmation}
                autoComplete="off"
                aria-invalid={Boolean(errors.confirmation)}
              />
              {fieldError("confirmation")}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {settings.updatedAt
            ? `Last saved ${formatDateTime(settings.updatedAt, {
                currency: DEFAULT_CURRENCY,
                timezone: settings.defaultTimezone || DEFAULT_TIMEZONE,
              })} (${settings.defaultTimezone}).`
            : "No platform settings saved yet; defaults are in effect."}
        </p>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {isSaving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
