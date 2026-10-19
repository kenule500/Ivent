// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  useConvexQuery: vi.fn(),
  mutate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  dashboard: null as Record<string, unknown> | null,
  registrations: [] as Record<string, unknown>[],
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ eventId: "event_1" }),
  useRouter: () => ({ push: mocks.push }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: mocks.useConvexQuery,
  useConvexMutation: () => ({ mutate: mocks.mutate, isLoading: false }),
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    dashboard: { getEventDashboard: { __apiName: "dashboard.getEventDashboard" } },
    registrations: {
      getEventRegistrations: { __apiName: "registrations.getEventRegistrations" },
      checkInAttendee: { __apiName: "registrations.checkInAttendee" },
    },
    events: { deleteEvent: { __apiName: "events.deleteEvent" } },
  },
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));
vi.mock("@/app/(main)/my-events/_components/qr-scanner-modal", () => ({
  default: () => <div data-testid="qr-scanner" />,
}));

import EventDashboardPage from "@/app/(main)/my-events/[eventId]/page";

const now = Date.now();

function makeRegistration(overrides: Record<string, unknown>) {
  return {
    _id: `reg_${Math.random()}`,
    eventId: "event_1",
    userId: "user_1",
    attendeeName: "Attendee",
    attendeeEmail: "attendee@example.com",
    qrCode: "EVT-000-AAAAAAAA",
    checkedIn: false,
    status: "confirmed",
    registeredAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.registrations = [
    makeRegistration({
      _id: "reg_ada",
      attendeeName: "Ada Lovelace",
      attendeeEmail: "ada@example.com",
      qrCode: "EVT-111-AAAAAAAA",
      checkedIn: true,
      checkedInAt: now,
    }),
    makeRegistration({
      _id: "reg_bob",
      attendeeName: "Bob Stone",
      attendeeEmail: "bob@example.com",
      qrCode: "EVT-222-BBBBBBBB",
    }),
    makeRegistration({
      _id: "reg_cara",
      attendeeName: "Cara Cancelled",
      attendeeEmail: "cara@example.com",
      qrCode: "EVT-333-CCCCCCCC",
      status: "cancelled",
    }),
  ];

  mocks.dashboard = {
    event: {
      _id: "event_1",
      title: "Tech Summit",
      slug: "tech-summit",
      category: "tech",
      startDate: now + 5 * 3_600_000,
      endDate: now + 8 * 3_600_000,
      city: "Port Harcourt",
      state: "Rivers",
      country: "Nigeria",
      locationType: "physical",
      ticketType: "free",
      capacity: 10,
    },
    stats: {
      totalRegistrations: 3,
      checkedInCount: 2,
      pendingCount: 1,
      capacity: 10,
      checkInRate: 67,
      totalRevenue: 0,
      hoursUntilEvent: 5,
      isEventToday: true,
      isEventPast: false,
    },
  };

  mocks.useConvexQuery.mockReset();
  mocks.useConvexQuery.mockImplementation((ref: { __apiName?: string }) => {
    if (ref.__apiName === "dashboard.getEventDashboard") {
      return { data: mocks.dashboard, isLoading: false };
    }
    if (ref.__apiName === "registrations.getEventRegistrations") {
      return { data: mocks.registrations, isLoading: false };
    }
    return { data: undefined, isLoading: false };
  });
  mocks.mutate.mockReset();
  mocks.toastError.mockReset();
  mocks.toastSuccess.mockReset();
});

describe("AC-006: attendance statistics", () => {
  test("AC-006: confirmed, checked-in, pending, capacity, rate and time-until are shown", () => {
    render(<EventDashboardPage />);

    expect(screen.getByText("3/10")).toBeInTheDocument();
    expect(screen.getByText("Checked In")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("5h")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All (3)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pending (1)" })).toBeInTheDocument();
  });
});

describe("AC-008: attendee CSV export", () => {
  test("AC-008: export downloads a CSV with every required column", async () => {
    const user = userEvent.setup();
    let captured: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      captured = blob;
      return "blob:csv";
    });
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });

    render(<EventDashboardPage />);
    await user.click(screen.getByRole("button", { name: /export csv/i }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    const text = await (captured as unknown as Blob).text();
    expect(text.split("\n")[0]).toBe(
      "Name,Email,Registered At,Checked In,Checked In At,QR Code"
    );
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("EVT-222-BBBBBBBB");

    vi.unstubAllGlobals();
  });

  test("AC-008: an empty attendee list reports that there is nothing to export", async () => {
    const user = userEvent.setup();
    mocks.useConvexQuery.mockImplementation((ref: { __apiName?: string }) => {
      if (ref.__apiName === "dashboard.getEventDashboard") {
        return { data: mocks.dashboard, isLoading: false };
      }
      return { data: [], isLoading: false };
    });

    render(<EventDashboardPage />);
    await user.click(screen.getByRole("button", { name: /export csv/i }));

    expect(mocks.toastError).toHaveBeenCalledWith("No registrations to export");
  });
});

describe("AC-009: attendee tabs and search", () => {
  test("AC-009: tabs separate all, checked-in and pending registrations", async () => {
    const user = userEvent.setup();
    render(<EventDashboardPage />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Bob Stone")).toBeInTheDocument();
    expect(screen.queryByText("Cara Cancelled")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Checked In (2)" }));
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Bob Stone")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Pending (1)" }));
    expect(screen.getByText("Bob Stone")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  test("AC-009: the search box matches name, email or QR code", async () => {
    const user = userEvent.setup();
    render(<EventDashboardPage />);

    const list = screen.getByText("Ada Lovelace").closest("[data-slot='card']") as HTMLElement;
    expect(list).toBeTruthy();

    const search = screen.getByPlaceholderText(/search name, email, or qr code/i);
    await user.type(search, "EVT-222");

    expect(screen.getByText("Bob Stone")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });
});
