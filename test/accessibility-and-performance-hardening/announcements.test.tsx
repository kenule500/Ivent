// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LiveRegionProvider } from "@/components/a11y/live-region";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
}));

vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexMutation: () => ({ mutate: mocks.register, isLoading: false }),
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    registrations: {
      registerForEvent: { __apiName: "registrations.registerForEvent" },
    },
    feedback: { submit: { __apiName: "feedback.submit" } },
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Ada Lovelace",
      primaryEmailAddress: { emailAddress: "ada@example.com" },
    },
  }),
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("convex/react", () => ({
  useMutation: () => {
    // Delegate to the hoisted spy so the test can control the outcome.
    const mutation = (args: unknown) => mocks.register(args);
    (mutation as unknown as { withOptimisticUpdate: unknown }).withOptimisticUpdate =
      () => mutation;
    return mutation;
  },
}));

import RegisterModal from "@/app/(public)/events/[slug]/_components/register-modal";
import FeedbackPage from "@/app/(public)/feedback/page";

const event = {
  _id: "event_1" as never,
  title: "Lagos Tech Summit",
  ticketType: "free",
};

describe("AC-004 / AC-005: registration outcomes are announced and inline", () => {
  test("AC-005: a failed registration is announced and shown inline", async () => {
    mocks.register.mockRejectedValueOnce(new Error("This event is full"));

    render(
      <LiveRegionProvider>
        <RegisterModal event={event} isOpen onClose={() => {}} />
      </LiveRegionProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByText("This event is full")).toBeInTheDocument()
    );

    const alert = screen.getByText("This event is full");
    expect(alert).toHaveAttribute("role", "alert");
  });

  test("AC-005: the success view is a labelled dialog", async () => {
    mocks.register.mockResolvedValueOnce({ ok: true });

    render(
      <LiveRegionProvider>
        <RegisterModal event={event} isOpen onClose={() => {}} />
      </LiveRegionProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByText(/you're all set/i)).toBeInTheDocument()
    );
    expect(
      screen.getByText(/your registration is confirmed/i)
    ).toBeInTheDocument();
  });
});

describe("AC-004: feedback form labels", () => {
  test("AC-004: the message field has a programmatic label", () => {
    render(<FeedbackPage />);

    const message = screen.getByLabelText(/message/i);
    expect(message.tagName).toBe("TEXTAREA");
  });
});
