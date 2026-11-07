"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { PageHeader } from "@/components/admin/page-header";
import { PanelState } from "@/components/admin/panel-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatRelativeTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Feedback inbox (FR-032, FR-033, AC-028).
 * Status, priority, notes, and deletion are audited server-side.
 */

const STATUSES = ["open", "in_review", "resolved", "dismissed"] as const;
type Status = (typeof STATUSES)[number];

const TYPES = ["bug", "feature", "abuse", "other"] as const;
type FeedbackType = (typeof TYPES)[number];

const PRIORITIES = ["low", "normal", "high"] as const;
type Priority = (typeof PRIORITIES)[number];

const STATUS_LABELS: Record<Status, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export default function FeedbackInboxPage() {
  const { currency, timezone } = usePlatformSettings();
  const update = useMutation(api.feedback.update);
  const remove = useMutation(api.feedback.remove);

  const [statusFilter, setStatusFilter] = React.useState<Status | "all">("open");
  const [typeFilter, setTypeFilter] = React.useState<FeedbackType | "all">("all");
  const [priorityFilter, setPriorityFilter] = React.useState<Priority | "all">("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const { data, isLoading } = useConvexQuery(api.feedback.list, {
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
  });

  const rows = data?.rows ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];

  const applyStatus = async (status: Status) => {
    if (!selected) return;
    setPending(true);
    try {
      const result = await update({
        feedbackId: selected.id as Id<"feedback">,
        status,
      });
      if (!result.ok) toast.error(result.message);
      else toast.success(`Marked ${STATUS_LABELS[status].toLowerCase()}.`);
    } finally {
      setPending(false);
    }
  };

  const applyPriority = async (priority: Priority) => {
    if (!selected) return;
    setPending(true);
    try {
      const result = await update({
        feedbackId: selected.id as Id<"feedback">,
        priority,
      });
      if (!result.ok) toast.error(result.message);
      else toast.success(`Priority set to ${priority}.`);
    } finally {
      setPending(false);
    }
  };

  const addNote = async () => {
    if (!selected || !note.trim()) return;
    setPending(true);
    try {
      const result = await update({
        feedbackId: selected.id as Id<"feedback">,
        note,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setNote("");
      toast.success("Note added.");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm("Delete this feedback permanently? This is audited.")) {
      return;
    }
    setPending(true);
    try {
      const result = await remove({
        feedbackId: selected.id as Id<"feedback">,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSelectedId(null);
      toast.success("Feedback deleted.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback inbox"
        description="Triage bug reports, feature requests, and abuse reports with notes and clean states."
        breadcrumb={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Feedback" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Status filter">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          {STATUSES.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
            >
              {STATUS_LABELS[status]}
              {data?.counts[status] !== undefined && (
                <span className="ml-1 text-[0.65rem] opacity-70">
                  {formatNumber(data.counts[status])}
                </span>
              )}
            </Button>
          ))}
        </div>

        <Select
          value={typeFilter}
          onValueChange={(value) =>
            setTypeFilter((value ?? "all") as FeedbackType | "all")
          }
        >
          <SelectTrigger
            className="h-9 w-[140px] text-xs"
            aria-label="Filter by feedback type"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(value) =>
            setPriorityFilter((value ?? "all") as Priority | "all")
          }
        >
          <SelectTrigger
            className="h-9 w-[140px] text-xs"
            aria-label="Filter by feedback priority"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="rounded-xl border bg-card">
          <PanelState
            loading={isLoading}
            skeletonRows={6}
            empty={!isLoading && rows.length === 0}
            emptyTitle="Nothing in this view"
            emptyDescription="Change the status, type, or priority filter."
            className="p-4"
          >
            <ul className="divide-y">
              {rows.map((row) => {
                const isSelected = selected?.id === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "w-full space-y-1 px-3 py-3 text-left transition-colors hover:bg-muted/60",
                        isSelected && "bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {row.type}
                        </span>
                        <Badge
                          variant={
                            row.priority === "high"
                              ? "destructive"
                              : row.priority === "low"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {row.priority}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm">{row.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.userEmail} · {formatRelativeTime(row.createdAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </PanelState>
        </div>

        <Card>
          {selected ? (
            <>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
                      {selected.type} · {selected.userEmail}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Opened {formatDateTime(selected.createdAt, { currency, timezone })} ·{" "}
                      {selected.status}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete()}
                    disabled={pending}
                    aria-label="Delete feedback"
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
                  {selected.message}
                </p>

                {selected.eventId && (
                  <p className="text-xs text-muted-foreground">
                    {selected.eventRemoved ? (
                      "The linked event was deleted."
                    ) : (
                      <>
                        Linked event:{" "}
                        <Link
                          href={`/admin/reports/${selected.eventId}`}
                          className="text-primary hover:underline"
                        >
                          {selected.eventTitle ?? "View event report"}
                        </Link>
                      </>
                    )}
                  </p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Select
                      value={selected.status}
                      onValueChange={(value) => {
                        if (value) void applyStatus(value as Status);
                      }}
                      disabled={pending}
                    >
                      <SelectTrigger className="w-full" aria-label="Feedback status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <Select
                      value={selected.priority}
                      onValueChange={(value) => {
                        if (value) void applyPriority(value as Priority);
                      }}
                      disabled={pending}
                    >
                      <SelectTrigger className="w-full" aria-label="Feedback priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Internal notes
                  </p>
                  {selected.adminNotes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No notes yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selected.adminNotes.map((adminNote, index) => (
                        <li
                          key={`${adminNote.createdAt}-${index}`}
                          className="rounded-lg border p-2 text-xs"
                        >
                          <p className="whitespace-pre-wrap">{adminNote.body}</p>
                          <p className="mt-1 text-muted-foreground">
                            {adminNote.authorName} · {formatRelativeTime(adminNote.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Add context for the next reviewer…"
                  />
                  <Button
                    size="sm"
                    onClick={() => void addNote()}
                    disabled={pending || !note.trim()}
                  >
                    <Send className="size-3.5" aria-hidden="true" />
                    Add note
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Select an item to review it.
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
