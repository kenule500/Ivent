"use client";

import * as React from "react";
import { z } from "zod";
import { useMutation } from "convex/react";
import { AlertTriangle, Loader2, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
import { Textarea } from "@/components/ui/textarea";
import { formatNumber, formatRelativeTime } from "@/lib/format";

/**
 * Broadcast announcements (FR-027 to FR-029).
 * Sending is super-admin only, requires the typed phrase, and is disabled until
 * the Resend sending domain is verified (BROADCAST_SENDING_ENABLED).
 */

const composeSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "The subject needs at least 3 characters.")
    .max(120, "Keep the subject under 120 characters."),
  body: z
    .string()
    .trim()
    .min(10, "The message needs at least 10 characters.")
    .max(5000, "Keep the message under 5,000 characters."),
  confirmation: z.string(),
});

const AUDIENCES = [
  { value: "all", label: "Everyone" },
  { value: "organizers", label: "Organizers" },
  { value: "event", label: "One event's attendees" },
  { value: "admins", label: "Administrators" },
] as const;

type AudienceType = (typeof AUDIENCES)[number]["value"];

export default function AnnouncementsPage() {
  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser, {});
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [audienceType, setAudienceType] = React.useState<AudienceType>("all");
  const [audienceEventId, setAudienceEventId] = React.useState<string>("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSending, setIsSending] = React.useState(false);

  const send = useMutation(api.announcements.send);
  const { data: events } = useConvexQuery(api.admin.getAllEvents, { limit: 500 });
  const { data: preview, isLoading: previewLoading } = useConvexQuery(
    api.announcements.audiencePreview,
    {
      audienceType,
      audienceEventId: audienceEventId
        ? (audienceEventId as Id<"events">)
        : undefined,
    }
  );
  const { data: history, isLoading: historyLoading } = useConvexQuery(
    api.announcements.history,
    {}
  );

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const parsed = composeSchema.safeParse({ subject, body, confirmation });
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
      preview?.confirmationPhrase &&
      parsed.data.confirmation.trim() !== preview.confirmationPhrase
    ) {
      setErrors({
        confirmation: `Type "${preview.confirmationPhrase}" exactly to send.`,
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await send({
        subject: parsed.data.subject,
        body: parsed.data.body,
        audienceType,
        audienceEventId: audienceEventId
          ? (audienceEventId as Id<"events">)
          : undefined,
        confirmation: parsed.data.confirmation,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(
        `Sending to ${formatNumber(result.recipientCount)} recipients. Delivery updates in the history below.`
      );
      setSubject("");
      setBody("");
      setConfirmation("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The announcement could not be sent."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Email a resolved audience, with preview and delivery outcomes."
        breadcrumb={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Announcements" },
        ]}
      />

      {!isSuperAdmin && (
        <div className="flex items-start gap-2 rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 text-sm">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-orange-500"
            aria-hidden="true"
          />
          <p>
            Only a super admin can send announcements. You can still review the
            audience preview and delivery history.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Megaphone className="size-4 text-purple-500" aria-hidden="true" />
              Compose
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void handleSend(event)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="audience">Audience</Label>
                  <Select
                    value={audienceType}
                    onValueChange={(value) =>
                      setAudienceType((value ?? "all") as AudienceType)
                    }
                  >
                    <SelectTrigger id="audience" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map((audience) => (
                        <SelectItem key={audience.value} value={audience.value}>
                          {audience.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {audienceType === "event" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="audience-event">Event</Label>
                    <Select
                      value={audienceEventId}
                      onValueChange={(value) => setAudienceEventId(value ?? "")}
                    >
                      <SelectTrigger id="audience-event" className="w-full">
                        <SelectValue placeholder="Choose an event" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {events?.map((event) => (
                          <SelectItem key={event._id} value={event._id}>
                            {event.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={120}
                  placeholder="What is this announcement about?"
                  aria-invalid={Boolean(errors.subject)}
                />
                {errors.subject && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.subject}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={8}
                  maxLength={5000}
                  placeholder="Write the announcement. Plain text; line breaks are preserved."
                  aria-invalid={Boolean(errors.body)}
                />
                <p className="text-xs text-muted-foreground">
                  {body.length}/5,000 characters. Sent as plain text and a simple
                  HTML email.
                </p>
                {errors.body && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.body}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmation">
                  Type {preview?.confirmationPhrase ?? "SEND ANNOUNCEMENT"} to confirm
                </Label>
                <Input
                  id="confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={preview?.confirmationPhrase ?? "SEND ANNOUNCEMENT"}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.confirmation)}
                />
                {errors.confirmation && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.confirmation}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {previewLoading
                    ? "Resolving audience…"
                    : `This sends to ${formatNumber(preview?.recipientCount ?? 0)} recipients.`}
                </p>
                <Button
                  type="submit"
                  disabled={
                    isSending ||
                    !isSuperAdmin ||
                    !preview?.sendingEnabled ||
                    previewLoading ||
                    (preview?.recipientCount ?? 0) === 0
                  }
                >
                  {isSending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="size-4" aria-hidden="true" />
                  )}
                  {isSending ? "Sending…" : "Send announcement"}
                </Button>
              </div>

              {!preview?.sendingEnabled && (
                <p className="flex items-start gap-1.5 text-xs text-orange-500">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  Sending is disabled until the Resend sending domain is verified
                  (BROADCAST_SENDING_ENABLED).
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Audience preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold">
              {previewLoading ? "…" : formatNumber(preview?.recipientCount ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Deduplicated recipients with an email address.
            </p>
            {preview?.truncated && (
              <p className="text-xs text-destructive">
                The audience exceeds 5,000 recipients. Narrow it before sending.
              </p>
            )}
            {(preview?.samples.length ?? 0) > 0 && (
              <div className="space-y-1">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sample (masked)
                </p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {preview?.samples.map((sample) => (
                    <li key={sample}>{sample}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1 border-t pt-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Email preview
              </p>
              <p className="text-sm font-medium">
                {subject.trim() || "Your subject appears here"}
              </p>
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                {body.trim() || "Your message appears here."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Delivery history</CardTitle>
        </CardHeader>
        <CardContent>
          <PanelState
            loading={historyLoading}
            skeletonRows={4}
            empty={!historyLoading && (history?.length ?? 0) === 0}
            emptyTitle="No announcements yet"
            emptyDescription="Sent announcements appear here with their delivery counts."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">Subject</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Audience</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Sent</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Failed</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                    <th scope="col" className="py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {history?.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <span className="font-medium">{row.subject}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatNumber(row.recipientCount)} recipients
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {row.audienceType}
                      </td>
                      <td className="py-2 pr-3 text-right">{formatNumber(row.sentCount)}</td>
                      <td className="py-2 pr-3 text-right">{formatNumber(row.failedCount)}</td>
                      <td className="py-2 pr-3">
                        <Badge
                          variant={
                            row.status === "sent"
                              ? "secondary"
                              : row.status === "sending"
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {row.createdByName} ·{" "}
                        {formatRelativeTime(row.sentAt ?? row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelState>
        </CardContent>
      </Card>
    </div>
  );
}
