"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Public feedback form (FR-030, FR-031).
 * Signed-in visitors only; the optional event id comes from a link.
 */

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "abuse", "other"]),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters.")
    .max(2000, "Keep the message under 2,000 characters."),
});

function FeedbackForm() {
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const submit = useMutation(api.feedback.submit);

  const eventIdParam = searchParams.get("eventId");

  const [type, setType] = React.useState<"bug" | "feature" | "abuse" | "other">(
    "bug"
  );
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Sign in to send feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Feedback is tied to your account so the team can follow up without
            asking for your email again.
          </p>
          <Button render={<Link href="/signin" />}>Sign in</Button>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Thanks — feedback received</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your message is in the support inbox. You can close this page or send
            another note.
          </p>
          <Button variant="outline" onClick={() => setSubmitted(false)}>
            Send another
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = feedbackSchema.safeParse({ type, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submit({
        type: parsed.data.type,
        message: parsed.data.message,
        eventId: eventIdParam ? (eventIdParam as Id<"events">) : undefined,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      toast.success("Thanks — your feedback was sent.");
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Your feedback could not be sent."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4 text-purple-500" aria-hidden="true" />
          Send feedback
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Report a bug, request a feature, or flag abuse. The team reviews every
          message in the support inbox.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                setType((value ?? "bug") as typeof type)
              }
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug report</SelectItem>
                <SelectItem value="feature">Feature request</SelectItem>
                <SelectItem value="abuse">Abuse report</SelectItem>
                <SelectItem value="other">Something else</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {eventIdParam && (
            <p className="rounded-lg border bg-muted/40 p-2 text-xs text-muted-foreground">
              Attached to an event from the link you followed.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              maxLength={2000}
              placeholder="What happened, and what did you expect?"
              aria-invalid={Boolean(error)}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/2,000 characters.
            </p>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            {isSubmitting ? "Sending…" : "Send feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PublicFeedbackPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Tell us what is broken, missing, or confusing.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <FeedbackForm />
      </Suspense>
    </div>
  );
}
