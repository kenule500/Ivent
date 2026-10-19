// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  useConvexQuery: vi.fn(),
  registrations: [] as Record<string, unknown>[],
}));

vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: mocks.useConvexQuery,
  useConvexMutation: () => ({ mutate: vi.fn(), isLoading: false }),
}));
vi.mock("@/convex/_generated/api", () => ({
  api: { registrations: { getMyRegistrations: { __apiName: "registrations.getMyRegistrations" } } },
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
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
    render(<MyTicketsPage />);

    expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
    expect(screen.getByText("Past Events")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upcoming Summit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Past Concert" })).toBeInTheDocument();
  });

  test("AC-010: selecting a ticket shows its QR code and ticket ID", async () => {
    const user = userEvent.setup();
    render(<MyTicketsPage />);

    await user.click(screen.getByRole("button", { name: "Upcoming Summit" }));

    expect(await screen.findByText("Your Ticket")).toBeInTheDocument();
    expect(screen.getByTestId("qr-code")).toHaveTextContent("EVT-111-AAAAAAAA");
    expect(screen.getByText("Ticket ID")).toBeInTheDocument();
    expect(screen.getAllByText("EVT-111-AAAAAAAA").length).toBeGreaterThanOrEqual(2);
  });
});
