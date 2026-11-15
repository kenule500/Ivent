// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/components/locale-provider";

const mocks = vi.hoisted(() => ({
  useConvexQuery: vi.fn(),
  registrations: [] as Record<string, unknown>[],
}));

vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: mocks.useConvexQuery,
  useConvexMutation: () => ({ mutate: vi.fn(), isLoading: false }),
}));
// Cancellation and wallet issuance go through convex/react directly, so the
// test provides the same shapes without a ConvexProvider.
vi.mock("convex/react", () => ({
  useMutation: () =>
    Object.assign(vi.fn(async () => undefined), {
      withOptimisticUpdate: () => vi.fn(async () => undefined),
    }),
  useAction: () => vi.fn(async () => undefined),
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    registrations: { getMyRegistrations: { __apiName: "registrations.getMyRegistrations" } },
    wallet: { issueWalletPass: { __apiName: "wallet.issueWalletPass" } },
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
// LocaleProvider refreshes through the App Router; a stub keeps the render
// hermetic while preserving the provider contract.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/my-tickets",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("react-qr-code", () => ({
  default: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>,
}));
vi.mock("@/components/event-card", () => ({
  default: ({ event, onClick }: { event: { title: string }; onClick?: () => void }) => (
    <button onClick={onClick}>{event.title}</button>
  ),
}));

import MyTicketsPage from "@/app/(main)/my-tickets/page";

const now = Date.now();

beforeEach(() => {
  mocks.registrations = [
    {
      _id: "reg_upcoming",
      attendeeName: "Ada",
      qrCode: "EVT-111-AAAAAAAA",
      status: "confirmed",
      registeredAt: now,
      event: {
        title: "Upcoming Summit",
        startDate: now + 86_400_000,
        locationType: "physical",
        city: "Port Harcourt",
        state: "Rivers",
      },
    },
    {
      _id: "reg_past",
      attendeeName: "Ada",
      qrCode: "EVT-222-BBBBBBBB",
      status: "cancelled",
      registeredAt: now - 86_400_000,
      event: {
        title: "Past Concert",
        startDate: now - 86_400_000,
        locationType: "online",
      },
    },
  ];
  mocks.useConvexQuery.mockReset();
  mocks.useConvexQuery.mockReturnValue({ data: mocks.registrations, isLoading: false });
});

describe("AC-010: my tickets", () => {
  test("AC-010: upcoming confirmed and past/cancelled tickets are listed separately", () => {
    render(
      <LocaleProvider initialLocale="en">
        <MyTicketsPage />
      </LocaleProvider>
    );

    expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
    expect(screen.getByText("Past Events")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upcoming Summit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Past Concert" })).toBeInTheDocument();
  });

  test("AC-010: selecting a ticket shows its QR code and ticket ID", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="en">
        <MyTicketsPage />
      </LocaleProvider>
    );

    await user.click(screen.getByRole("button", { name: "Upcoming Summit" }));

    expect(await screen.findByText("Your Ticket")).toBeInTheDocument();
    expect(screen.getByTestId("qr-code")).toHaveTextContent("EVT-111-AAAAAAAA");
    expect(screen.getByText("Ticket ID")).toBeInTheDocument();
    expect(screen.getAllByText("EVT-111-AAAAAAAA").length).toBeGreaterThanOrEqual(2);
  });
});
