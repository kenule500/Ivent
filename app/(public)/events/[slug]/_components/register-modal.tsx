"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ticket, CheckCircle } from "lucide-react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAnnounce } from "@/components/a11y/live-region";
import { useI18n } from "@/components/locale-provider";
import { formatEventPrice } from "@/lib/event-format";
import { Id } from "@/convex/_generated/dataModel";

interface RegisterModalProps {
  event: {
    _id: Id<"events">;
    title: string;
    ticketType: string;
    ticketPrice?: number;
  } & Record<string, unknown>;
  isOpen: boolean;
  onClose: () => void;
}

type RegistrationWithEvent = FunctionReturnType<
  typeof api.registrations.getMyRegistrations
>[number];

interface RegistrationQuestion {
  id: string;
  label: string;
  type:
    | "short_text"
    | "long_text"
    | "single_select"
    | "multi_select"
    | "number"
    | "date";
  required: boolean;
  helpText?: string;
  options?: string[];
  archived?: boolean;
}

export default function RegisterModal({ event, isOpen, onClose }: RegisterModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const { t, locale } = useI18n();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const announce = useAnnounce();

  const attendeeName = user?.fullName ?? user?.username ?? "Guest";
  const attendeeEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const questions = (
    (event.registrationQuestions as RegistrationQuestion[] | undefined) ?? []
  ).filter((question) => question.archived !== true);
  const priceLabel = formatEventPrice(
    String(event.ticketType),
    typeof event.ticketPrice === "number" ? event.ticketPrice : undefined,
    {
      locale: (event.locale as string | undefined) ?? locale,
      timezone: event.timezone as string | undefined,
      currency: event.currency as string | undefined,
    }
  );

  // The ticket appears in My Tickets immediately: an optimistic entry is placed
  // in the cache the query reads, and Convex discards it on success or failure
  // (FR-004, AC-003). The entry is cast because a pending ticket has no server
  // identity yet — it never reaches the backend, and the ticket card tolerates
  // the placeholder id.
  const registerForEvent = useMutation(
    api.registrations.registerForEvent
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.registrations.getMyRegistrations);

    if (current === undefined) return;

    const alreadyRegistered = current.some(
      (registration) =>
        registration.eventId === args.eventId &&
        registration.status === "confirmed"
    );

    if (alreadyRegistered) return;

    const optimisticTicket = {
      _id: `optimistic-${args.eventId}` as Id<"registrations">,
      eventId: args.eventId,
      userId: "optimistic" as Id<"users">,
      attendeeName,
      attendeeEmail,
      qrCode: "pending",
      checkedIn: false,
      status: "confirmed",
      event,
    } as unknown as RegistrationWithEvent;

    localStore.setQuery(api.registrations.getMyRegistrations, {}, [
      optimisticTicket,
      ...current,
    ]);
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Guard against a second submission from an impatient double tap or Enter
    // while the first request is still in flight (AC-002).
    if (isSubmitting) return;

    setErrorMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const payload = questions.flatMap<{
        questionId: string;
        value: string | number | string[];
      }>((question) => {
        const raw = answers[question.id];
        const empty =
          raw === undefined ||
          raw === "" ||
          (Array.isArray(raw) && raw.length === 0);
        if (empty) return [];

        if (question.type === "number") {
          const number = Number(raw);
          if (!Number.isFinite(number)) {
            throw new Error(`${question.label} must be a number.`);
          }
          return [{ questionId: question.id, value: number }];
        }

        return [{ questionId: question.id, value: raw }];
      });

      await registerForEvent({
        eventId: event._id,
        answers: payload,
        locale,
      });

      setIsSuccess(true);
      toast.success(t("register.confirmedAnnouncement"));
      announce(t("register.confirmedAnnouncement"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("register.failed");
      // Point the error at the question it belongs to, so the message is not
      // only a global banner: the field itself is marked invalid and described
      // by the message (AC-024). The typed values are preserved so the attendee
      // can correct a single field instead of retyping the form.
      const culprit = questions.find((question) =>
        message.includes(`"${question.label}"`) ||
        message.startsWith(`${question.label} `)
      );
      if (culprit) {
        setFieldErrors({ [culprit.id]: message });
      }
      // Show the reason inline and announce it, so the failure is not a
      // transient toast that a screen reader never reaches (AC-004, AC-005).
      setErrorMessage(message);
      announce(`Registration failed. ${message}`, "assertive");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTicket = () => {
    router.push("/my-tickets");
    onClose();
  };

  // Success state
  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center space-y-4 py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold mb-2">
                {t("register.successTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("register.successBody")}
              </DialogDescription>
            </div>
            <Separator />
            <div className="w-full space-y-2">
              <Button className="w-full gap-2" onClick={handleViewTicket}>
                <Ticket className="w-4 h-4" />
                {t("register.viewTicket")}
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Registration form
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("register.title")}</DialogTitle>
          <DialogDescription>
            {t("register.description", { title: event.title })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-semibold">{event.title}</p>
            <p className="text-sm text-muted-foreground">
              {event.ticketType === "free" ? (
                t("register.freeEvent")
              ) : (
                <span>
                  {t("register.priceAtVenue", {
                    price: priceLabel ?? "",
                  })}
                </span>
              )}
            </p>
          </div>

          {/* Ticket holder (from the signed-in account) */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("register.holder")}</p>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <p className="font-medium">{attendeeName}</p>
              {attendeeEmail && (
                <p className="text-muted-foreground">{attendeeEmail}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("register.holderHint")}
            </p>
          </div>

          {questions.length > 0 && (
            <fieldset
              className="space-y-4"
              aria-describedby="registration-privacy-note"
            >
              <legend className="text-sm font-medium">
                {t("register.questionsTitle")}
              </legend>
              <p
                id="registration-privacy-note"
                className="text-xs text-muted-foreground"
              >
                {t("register.privacyNote")}
              </p>
              {questions.map((question) => {
                const value = answers[question.id] ?? "";
                const inputId = `question-${question.id}`;
                const helpId = `question-help-${question.id}`;
                const errorId = `question-error-${question.id}`;
                const fieldError = fieldErrors[question.id];
                const describedBy =
                  [
                    question.helpText ? helpId : null,
                    fieldError ? errorId : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined;

                return (
                  <div key={question.id} className="space-y-1.5">
                    <Label htmlFor={inputId}>
                      {question.label}
                      {question.required && (
                        <span className="ml-1 text-destructive" aria-hidden="true">
                          *
                        </span>
                      )}
                    </Label>
                    {question.helpText && (
                      <p id={helpId} className="text-xs text-muted-foreground">
                        {question.helpText}
                      </p>
                    )}

                    {question.type === "long_text" ? (
                      <Textarea
                        id={inputId}
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                        required={question.required}
                        aria-invalid={fieldError ? true : undefined}
                        aria-describedby={describedBy}
                        rows={3}
                      />
                    ) : question.type === "single_select" ? (
                      <select
                        id={inputId}
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                        required={question.required}
                        aria-invalid={fieldError ? true : undefined}
                        aria-describedby={describedBy}
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm aria-invalid:border-destructive"
                      >
                        <option value="">—</option>
                        {(question.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : question.type === "multi_select" ? (
                      <div
                        className="space-y-1.5"
                        role="group"
                        aria-label={question.label}
                        aria-invalid={fieldError ? true : undefined}
                        aria-describedby={describedBy}
                      >
                        {(question.options ?? []).map((option) => {
                          const selected = Array.isArray(value)
                            ? value.includes(option)
                            : false;
                          return (
                            <label
                              key={option}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(event) =>
                                  setAnswers((current) => {
                                    const currentValue = Array.isArray(
                                      current[question.id]
                                    )
                                      ? (current[question.id] as string[])
                                      : [];
                                    return {
                                      ...current,
                                      [question.id]: event.target.checked
                                        ? [...currentValue, option]
                                        : currentValue.filter(
                                            (item) => item !== option
                                          ),
                                    };
                                  })
                                }
                              />
                              {option}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <Input
                        id={inputId}
                        type={
                          question.type === "number"
                            ? "number"
                            : question.type === "date"
                              ? "date"
                              : "text"
                        }
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                        required={question.required}
                        aria-invalid={fieldError ? true : undefined}
                        aria-describedby={describedBy}
                      />
                    )}
                    {fieldError && (
                      <p id={errorId} className="text-xs text-destructive">
                        {fieldError}
                      </p>
                    )}
                  </div>
                );
              })}
            </fieldset>
          )}

          {/* Terms */}
          <p className="text-xs text-muted-foreground">
            {t("register.terms")}
          </p>

          {/* Inline, announced failure reason (AC-004, AC-005) */}
          {errorMessage && (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("register.submitting")}
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  {t("event.register")}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
