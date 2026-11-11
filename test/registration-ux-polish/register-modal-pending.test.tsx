// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LiveRegionProvider } from "@/components/a11y/live-region";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  optimistic: null as null | ((store: unknown, args: { eventId: string }) => void),
}));

vi.mock("convex/react", () => ({
  useMutation: () => {
    (mocks.register as unknown as { withOptimisticUpdate: (updater: (store: unknown, args: { eventId: string }) => void) => unknown }).withOptimisticUpdate = (
      updater: (store: unknown, args: { eventId: string }) => void
    ) => {
      mocks.optimistic = updater;
      return mocks.register;
    };
    return mocks.register;
  },
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    registrations: {
      registerForEvent: { __apiName: "registrations.registerForEvent" },
      getMyRegistrations: { __apiName: "registrations.getMyRegistrations" },
    },
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
    mocks.register.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
    );

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

    expect(mocks.register).toHaveBeenCalledTimes(1);
  });
});

describe("AC-003: the ticket appears before the server confirms", () => {
  const renderModal = () =>
    render(
      <LiveRegionProvider>
        <RegisterModal event={event} isOpen onClose={() => {}} />
      </LiveRegionProvider>
    );

  test("AC-003: the optimistic updater inserts a confirmed ticket into the cache", () => {
    renderModal();

    expect(mocks.optimistic).not.toBeNull();

    const store = {
      getQuery: vi.fn(() => []),
      setQuery: vi.fn(),
    };

    mocks.optimistic!(store, { eventId: "event_1" });

    expect(store.setQuery).toHaveBeenCalledTimes(1);

    const [, , next] = store.setQuery.mock.calls[0];
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      eventId: "event_1",
      status: "confirmed",
      attendeeName: "Ada Lovelace",
      attendeeEmail: "ada@example.com",
      qrCode: "pending",
    });
  });

  test("AC-003: an existing confirmed registration is not duplicated optimistically", () => {
    renderModal();

    const store = {
      getQuery: vi.fn(() => [
        { eventId: "event_1", status: "confirmed", _id: "reg_1" },
      ]),
      setQuery: vi.fn(),
    };

    mocks.optimistic!(store, { eventId: "event_1" });

    expect(store.setQuery).not.toHaveBeenCalled();
  });
});
