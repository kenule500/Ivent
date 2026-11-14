// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  issueWalletPass: vi.fn(),
  cancelRegistration: vi.fn(),
  setEmailPreference: vi.fn(),
  announce: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  ticket: null as unknown,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: () => ({
    data: [mocks.ticket],
    isLoading: false,
  }),
}));
vi.mock("convex/react", () => ({
  useAction: () => mocks.issueWalletPass,
  useMutation: () => {
    const mutation = mocks.cancelRegistration;
    (mutation as unknown as { withOptimisticUpdate: () => unknown }).withOptimisticUpdate =
      () => mutation;
    return mutation;
  },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock("@/components/a11y/live-region", () => ({
  useAnnounce: () => mocks.announce,
}));
vi.mock("@/components/event-card", () => ({
  default: ({
    event,
    onClick,
  }: {
    event: { title: string };
    onClick?: () => void;
  }) => <button onClick={onClick}>{event.title}</button>,
}));
vi.mock("react-qr-code", () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="qr-code">{value}</div>
  ),
}));

import MyTicketsPage from "@/app/(main)/my-tickets/page";
import { LocaleProvider } from "@/components/locale-provider";

const start = Date.now() + 86_400_000;

function makeTicket() {
  return {
    _id: "registration-wallet",
    eventId: "event-wallet",
    userId: "user-wallet",
    attendeeName: "Ada Lovelace",
    attendeeEmail: "ada@example.com",
    qrCode: "EVT-WALLET-QR",
    checkedIn: false,
    status: "confirmed",
    registeredAt: Date.now(),
    wallet: {
      provider: "google",
      objectId: "issuer.ivent_registration_wallet",
      status: "active",
      issuedAt: Date.now() - 10_000,
      updatedAt: Date.now() - 10_000,
    },
    event: {
      _id: "event-wallet",
      title: "Wallet Event",
      slug: "wallet-event",
      organizerId: "organizer",
      organizerName: "Organizer",
      category: "tech",
      startDate: start,
      endDate: start + 4 * 60 * 60 * 1000,
      timezone: "Africa/Lagos",
      currency: "NGN",
      locale: "en",
      locationType: "physical",
      city: "Lagos",
      country: "Nigeria",
      capacity: 100,
      registrationCount: 1,
      ticketType: "free",
      walletEnabled: true,
      status: "confirmed",
    },
  };
}

beforeEach(() => {
  mocks.issueWalletPass.mockReset();
  mocks.cancelRegistration.mockReset();
  mocks.setEmailPreference.mockReset();
  mocks.announce.mockReset();
  mocks.toastSuccess.mockReset();
  mocks.toastError.mockReset();
  (mocks as unknown as { ticket: unknown }).ticket = makeTicket();
});

describe("AC-019: Apple Wallet availability", () => {
  test("AC-019: no Apple Wallet control is rendered and the provider surface reports Apple unavailable", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="en">
        <MyTicketsPage />
      </LocaleProvider>
    );

    await user.click(screen.getByRole("button", { name: "Wallet Event" }));

    expect(await screen.findByText("Your Ticket")).toBeInTheDocument();
    expect(screen.getByTestId("qr-code")).toHaveTextContent("EVT-WALLET-QR");
    expect(
      screen.getByRole("button", { name: /Add to Google Wallet/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Apple Wallet/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Apple Wallet is not available in this version.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("This pass is in your Google Wallet.")
    ).toBeInTheDocument();
  });
});
