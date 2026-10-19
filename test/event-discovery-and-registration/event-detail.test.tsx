// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  params: { slug: "tech-summit-123" } as Record<string, string>,
  push: vi.fn(),
  user: null as null | { id: string; fullName?: string },
  event: null as Record<string, unknown> | null,
  registration: null as Record<string, unknown> | null,
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => mocks.params,
  useRouter: () => ({ push: mocks.push }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: (ref: { __apiName?: string }) => {
    if (ref.__apiName === "events.getEventBySlug") {
      return { data: mocks.event, isLoading: false };
    }
    if (ref.__apiName === "registrations.checkRegistration") {
      return { data: mocks.registration, isLoading: false };
    }
    return { data: undefined, isLoading: false };
  },
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    events: { getEventBySlug: { __apiName: "events.getEventBySlug" } },
    registrations: { checkRegistration: { __apiName: "registrations.checkRegistration" } },
  },
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/app/(public)/events/[slug]/_components/register-modal", () => ({
  default: () => <div data-testid="register-modal" />,
}));

import EventDetailPage from "@/app/(public)/events/[slug]/page";

const now = Date.now();

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    _id: "event_1",
    title: "Tech Summit",
    description: "A full day of talks about building products.",
    slug: "tech-summit-123",
    organizerId: "jd7convex999",
    organizerName: "Ada Organizer",
    category: "tech",
    startDate: now + 86_400_000,
    endDate: now + 90_000_000,
    timezone: "Africa/Lagos",
    locationType: "physical",
    city: "Port Harcourt",
    state: "Rivers",
    country: "Nigeria",
    address: "12 Aba Road",
    capacity: 10,
    registrationCount: 3,
    ticketType: "free",
    themeColor: "#1e3a8a",
    ...overrides,
  };
}

beforeEach(() => {
  mocks.params = { slug: "tech-summit-123" };
  mocks.user = null;
  mocks.event = makeEvent();
  mocks.registration = null;
  mocks.toastError.mockReset();
  mocks.push.mockReset();
});

describe("AC-005: public event details", () => {
  test("AC-005: a valid slug renders every required detail", () => {
    mocks.event = makeEvent({ ticketType: "paid", ticketPrice: 5000 });

    render(<EventDetailPage />);

    expect(screen.getByRole("heading", { name: "Tech Summit" })).toBeInTheDocument();
    expect(screen.getByText("A full day of talks about building products.")).toBeInTheDocument();
    expect(screen.getByText("Ada Organizer")).toBeInTheDocument();
    expect(screen.getByText("₦5000")).toBeInTheDocument();
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
    expect(screen.getByText(/Port Harcourt, Rivers/)).toBeInTheDocument();
  });

  test("AC-005: an unknown slug renders not-found", () => {
    mocks.event = null;

    expect(() => render(<EventDetailPage />)).toThrow("NEXT_NOT_FOUND");
  });
});

describe("AC-006: sidebar call to action", () => {
  test("AC-006: a registered attendee sees View Ticket", () => {
    mocks.registration = { status: "confirmed" };

    render(<EventDetailPage />);

    expect(screen.getByRole("button", { name: /view ticket/i })).toBeInTheDocument();
  });

  test("AC-006: a past event shows a disabled Event Ended button", () => {
    mocks.event = makeEvent({ endDate: now - 1000 });

    render(<EventDetailPage />);

    expect(screen.getByRole("button", { name: "Event Ended" })).toBeDisabled();
  });

  test("AC-006: a full event shows a disabled Event Full button", () => {
    mocks.event = makeEvent({ registrationCount: 10, capacity: 10 });

    render(<EventDetailPage />);

    expect(screen.getByRole("button", { name: "Event Full" })).toBeDisabled();
  });

  test("AC-006: the organizer sees Manage Event", () => {
    mocks.user = { id: "user_2abcClerkId" };
    mocks.event = makeEvent({ organizerId: "jd7convexUserId" });

    render(<EventDetailPage />);

    expect(screen.getByRole("button", { name: /manage event/i })).toBeInTheDocument();
  });

  test("AC-006: everyone else sees Register for Event", () => {
    render(<EventDetailPage />);

    expect(screen.getByRole("button", { name: /register for event/i })).toBeInTheDocument();
  });
});

describe("AC-007: registration requires sign-in", () => {
  test("AC-007: a signed-out visitor is told to sign in and no registration modal opens", async () => {
    const user = userEvent.setup();
    render(<EventDetailPage />);

    await user.click(screen.getByRole("button", { name: /register for event/i }));

    expect(mocks.toastError).toHaveBeenCalledWith("Please sign in to register");
    expect(screen.queryByTestId("register-modal")).not.toBeInTheDocument();
  });
});
