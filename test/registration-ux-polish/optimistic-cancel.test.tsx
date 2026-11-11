// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LiveRegionProvider } from "@/components/a11y/live-region";

const mocks = vi.hoisted(() => ({
  useConvexQuery: vi.fn(),
  cancel: vi.fn(),
  optimistic: null as null | ((store: unknown, args: { registrationId: string }) => void),
}));

vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: mocks.useConvexQuery,
}));
vi.mock("convex/react", () => ({
  useMutation: () => {
    const mutation = Object.assign(mocks.cancel, {
      withOptimisticUpdate: (
        updater: (store: unknown, args: { registrationId: string }) => void
      ) => {
        mocks.optimistic = updater;
        return mocks.cancel;
      },
    });
    return mutation;
  },
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    registrations: {
      getMyRegistrations: { __apiName: "registrations.getMyRegistrations" },
      cancelRegistration: { __apiName: "registrations.cancelRegistration" },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("react-qr-code", () => ({
  default: () => <div data-testid="qr" />,
}));
vi.mock("@/components/event-card", () => ({
  default: ({
    event,
    onDelete,
  }: {
    event: { title: string; startDate: number };
    onDelete?: () => void;
  }) => (
    <div>
      <span>{event.title}</span>
      {onDelete ? <button onClick={onDelete}>Cancel</button> : null}
    </div>
  ),
}));

import MyTicketsPage from "@/app/(main)/my-tickets/page";

const registrations = [
  {
    _id: "reg_1",
    status: "confirmed",
    attendeeName: "Ada",
    event: { title: "Lagos Tech Summit", startDate: Date.now() + 86_400_000 },
  },
  {
    _id: "reg_2",
    status: "confirmed",
    attendeeName: "Ada",
    event: { title: "Abuja Meetup", startDate: Date.now() + 172_800_000 },
  },
];

describe("AC-004: cancellation is optimistic and reversible", () => {
  test("AC-004: cancellation removes the ticket from the cache immediately", () => {
    mocks.useConvexQuery.mockReturnValue({
      data: registrations,
      isLoading: false,
      error: null,
    });

    render(
      <LiveRegionProvider>
        <MyTicketsPage />
      </LiveRegionProvider>
    );

    expect(mocks.optimistic).not.toBeNull();

    const store = {
      getQuery: vi.fn(() => registrations),
      setQuery: vi.fn(),
    };

    // What Convex runs while the mutation is in flight.
    mocks.optimistic!(store, { registrationId: "reg_1" });

    expect(store.setQuery).toHaveBeenCalledTimes(1);
    const [, , next] = store.setQuery.mock.calls[0];
    expect(next).toHaveLength(1);
    expect(next[0]._id).toBe("reg_2");
  });

  test("AC-004: a rejected cancellation is announced instead of failing silently", async () => {
    mocks.useConvexQuery.mockReturnValue({
      data: registrations,
      isLoading: false,
      error: null,
    });
    mocks.cancel.mockRejectedValueOnce(new Error("Already cancelled"));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <LiveRegionProvider>
        <MyTicketsPage />
      </LiveRegionProvider>
    );

    await userEvent.click(screen.getAllByRole("button", { name: /cancel/i })[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/could not cancel the registration/i)
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/already cancelled/i)).toBeInTheDocument();
  });
});
