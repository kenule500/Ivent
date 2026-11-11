// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LiveRegionProvider } from "@/components/a11y/live-region";

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexMutation: () => {
    const [isLoading, setIsLoading] = React.useState(false);
    const mutateRef = React.useRef<ReturnType<typeof vi.fn> | null>(null);

    if (!mutateRef.current) {
      mutateRef.current = vi.fn(async () => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 100));
        setIsLoading(false);
        return { ok: true };
      });
    }

    // The component calls this exact function, so the assertion observes it.
    mocks.mutate = mutateRef.current;

    return { mutate: mutateRef.current, isLoading };
  },
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    registrations: { registerForEvent: { __apiName: "registrations.registerForEvent" } },
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Ada Lovelace",
      primaryEmailAddress: { emailAddress: "ada@example.com" },
    },
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import RegisterModal from "@/app/(public)/events/[slug]/_components/register-modal";

const event = {
  _id: "event_1" as never,
  title: "Lagos Tech Summit",
  ticketType: "free",
};

describe("AC-002: the dialog cannot be double-submitted", () => {
  test("AC-002: submitting shows progress and disables the control until it settles", async () => {
    const user = userEvent.setup();

    render(
      <LiveRegionProvider>
        <RegisterModal event={event} isOpen onClose={() => {}} />
      </LiveRegionProvider>
    );

    await user.click(screen.getByRole("button", { name: /^register$/i }));

    const pending = await screen.findByRole("button", { name: /registering/i });
    expect(pending).toBeDisabled();

    // A second tap on a disabled control does nothing.
    await user.click(pending);

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });
});
